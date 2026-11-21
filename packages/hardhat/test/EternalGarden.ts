import { expect } from "chai";
import { ContractFactory, id } from "ethers";
import { network } from "hardhat";
import type { Abi_EternalGarden } from "../generated/abis/EternalGarden.js";
import type { EternalGarden } from "../types/ethers-contracts/EternalGarden.js";
import { loadAndExecuteDeploymentsFromFiles } from "../rocketh/environment.js";
import { artifacts } from "../rocketh/deploy.js";

const { provider, networkHelpers, ethers } = await network.create();

const WINDOW = 90;
const CIPHER_HASH = id("encrypted-capsule");
const META_HASH = id("public-metadata");

async function deployFixture() {
  const env = await loadAndExecuteDeploymentsFromFiles({ provider });
  const { address, abi } = env.get<Abi_EternalGarden>("EternalGarden");
  const eternalGarden = (await ethers.getContractAt(abi, address)) as unknown as EternalGarden;
  return { env, eternalGarden };
}

describe("EternalGarden", function () {
  describe("plant", function () {
    it("creates a GROWING garden with an initial heartbeat", async function () {
      const { eternalGarden } = await networkHelpers.loadFixture(deployFixture);
      const [, owner] = await ethers.getSigners();
      const latest = BigInt(await networkHelpers.time.latest());

      await expect(eternalGarden.connect(owner).plant(CIPHER_HASH, META_HASH))
        .to.emit(eternalGarden, "GardenPlanted")
        .withArgs(owner.address, CIPHER_HASH, META_HASH, latest + 1n)
        .and.to.emit(eternalGarden, "Heartbeat")
        .withArgs(owner.address, 1, latest + 1n);

      const planted = await eternalGarden.gardenOf(owner.address);
      expect(planted.cipherHash).to.equal(CIPHER_HASH);
      expect(planted.publicMetaHash).to.equal(META_HASH);
      expect(planted.heartbeatCount).to.equal(1);
      expect(planted.state).to.equal(1n); // GROWING
      expect(planted.plantedAt).to.equal(latest + 1n);
      expect(planted.lastHeartbeat).to.equal(latest + 1n);
      expect(await eternalGarden.deadlineOf(owner.address)).to.equal(latest + 1n + BigInt(WINDOW));
    });

    it("rejects a zero cipher hash", async function () {
      const { eternalGarden } = await networkHelpers.loadFixture(deployFixture);
      const [, owner] = await ethers.getSigners();

      await expect(
        eternalGarden
          .connect(owner)
          .plant("0x0000000000000000000000000000000000000000000000000000000000000000", META_HASH),
      ).to.be.revertedWithCustomError(eternalGarden, "EmptyCipherHash");
    });

    it("rejects replacing a garden while it is GROWING", async function () {
      const { eternalGarden } = await networkHelpers.loadFixture(deployFixture);
      const [, owner] = await ethers.getSigners();

      await eternalGarden.connect(owner).plant(CIPHER_HASH, META_HASH);
      await expect(eternalGarden.connect(owner).plant(id("another-capsule"), META_HASH)).to.be.revertedWithCustomError(
        eternalGarden,
        "GardenAlreadyExists",
      );
    });

    it("starts a fresh cycle after the previous garden is ETERNAL", async function () {
      const { eternalGarden } = await networkHelpers.loadFixture(deployFixture);
      const [, owner, witness] = await ethers.getSigners();
      const nextCipherHash = id("next-encrypted-capsule");
      const nextMetaHash = id("next-public-metadata");

      await eternalGarden.connect(owner).plant(CIPHER_HASH, META_HASH);
      const firstDeadline = await eternalGarden.deadlineOf(owner.address);
      await networkHelpers.time.increaseTo(Number(firstDeadline) + 1);
      await eternalGarden.connect(witness).sealEternally(owner.address);

      const latest = BigInt(await networkHelpers.time.latest());
      await expect(eternalGarden.connect(owner).plant(nextCipherHash, nextMetaHash))
        .to.emit(eternalGarden, "GardenPlanted")
        .withArgs(owner.address, nextCipherHash, nextMetaHash, latest + 1n)
        .and.to.emit(eternalGarden, "Heartbeat")
        .withArgs(owner.address, 1, latest + 1n);

      const replanted = await eternalGarden.gardenOf(owner.address);
      expect(replanted.cipherHash).to.equal(nextCipherHash);
      expect(replanted.publicMetaHash).to.equal(nextMetaHash);
      expect(replanted.plantedAt).to.equal(latest + 1n);
      expect(replanted.lastHeartbeat).to.equal(latest + 1n);
      expect(replanted.sealedAt).to.equal(0);
      expect(replanted.heartbeatCount).to.equal(1);
      expect(replanted.state).to.equal(1n); // GROWING
      expect(await eternalGarden.deadlineOf(owner.address)).to.equal(latest + 1n + BigInt(WINDOW));
    });
  });

  describe("constructor", function () {
    it("rejects a zero inactivity window", async function () {
      const [deployer] = await ethers.getSigners();
      const factory = new ContractFactory(artifacts.EternalGarden.abi, artifacts.EternalGarden.bytecode, deployer);

      await expect(factory.deploy(0)).to.be.revertedWithCustomError(factory, "InvalidInactivityWindow");
    });
  });

  describe("heartbeat", function () {
    it("refreshes the deadline and increments the count", async function () {
      const { eternalGarden } = await networkHelpers.loadFixture(deployFixture);
      const [, owner] = await ethers.getSigners();

      await eternalGarden.connect(owner).plant(CIPHER_HASH, META_HASH);
      await networkHelpers.time.increase(30);

      const tx = await eternalGarden.connect(owner).heartbeat();
      await expect(tx)
        .to.emit(eternalGarden, "Heartbeat")
        .withArgs(owner.address, 2, await networkHelpers.time.latest());

      const alive = await eternalGarden.gardenOf(owner.address);
      expect(alive.heartbeatCount).to.equal(2);
      expect(await eternalGarden.deadlineOf(owner.address)).to.equal(
        BigInt(await networkHelpers.time.latest()) + BigInt(WINDOW),
      );
    });

    it("is allowed exactly at the deadline", async function () {
      const { eternalGarden } = await networkHelpers.loadFixture(deployFixture);
      const [, owner] = await ethers.getSigners();

      await eternalGarden.connect(owner).plant(CIPHER_HASH, META_HASH);
      const deadline = await eternalGarden.deadlineOf(owner.address);
      await networkHelpers.time.setNextBlockTimestamp(Number(deadline));

      // Skip gas estimation: the simulator evaluates estimates one second past the
      // forced block, where the contract already considers the garden expired.
      await eternalGarden.connect(owner).heartbeat({ gasLimit: 100_000n });
      expect((await eternalGarden.gardenOf(owner.address)).heartbeatCount).to.equal(2);
    });

    it("reverts after the deadline", async function () {
      const { eternalGarden } = await networkHelpers.loadFixture(deployFixture);
      const [, owner] = await ethers.getSigners();

      await eternalGarden.connect(owner).plant(CIPHER_HASH, META_HASH);
      const deadline = await eternalGarden.deadlineOf(owner.address);
      await networkHelpers.time.increaseTo(Number(deadline) + 1);

      await expect(eternalGarden.connect(owner).heartbeat())
        .to.be.revertedWithCustomError(eternalGarden, "GardenExpired")
        .withArgs(deadline);
    });

    it("succeeds at random offsets within the window", async function () {
      const { eternalGarden } = await networkHelpers.loadFixture(deployFixture);
      const signers = await ethers.getSigners();

      for (let i = 0; i < 16; i += 1) {
        const owner = signers[2 + i];
        // 0..WINDOW-1: estimation runs one second ahead of the forced block, so the
        // offset must stay below the window; the ==deadline case has its own test.
        const offset = Math.floor(Math.random() * WINDOW);
        await eternalGarden.connect(owner).plant(id(`capsule-${i}`), META_HASH);
        if (offset > 0) await networkHelpers.time.increase(offset);

        await eternalGarden.connect(owner).heartbeat();
        expect((await eternalGarden.gardenOf(owner.address)).heartbeatCount).to.equal(2);
      }
    });
  });

  describe("sealEternally", function () {
    it("reverts before the deadline", async function () {
      const { eternalGarden } = await networkHelpers.loadFixture(deployFixture);
      const [, owner, witness] = await ethers.getSigners();

      await eternalGarden.connect(owner).plant(CIPHER_HASH, META_HASH);
      const deadline = await eternalGarden.deadlineOf(owner.address);

      await expect(eternalGarden.connect(witness).sealEternally(owner.address))
        .to.be.revertedWithCustomError(eternalGarden, "GardenStillAlive")
        .withArgs(deadline);
    });

    it("rejects a zero owner", async function () {
      const { eternalGarden } = await networkHelpers.loadFixture(deployFixture);
      const [, , witness] = await ethers.getSigners();

      await expect(
        eternalGarden.connect(witness).sealEternally("0x0000000000000000000000000000000000000000"),
      ).to.be.revertedWithCustomError(eternalGarden, "InvalidOwner");
    });

    it("can be triggered by anyone after the deadline", async function () {
      const { eternalGarden } = await networkHelpers.loadFixture(deployFixture);
      const [, owner, witness] = await ethers.getSigners();

      await eternalGarden.connect(owner).plant(CIPHER_HASH, META_HASH);
      const deadline = await eternalGarden.deadlineOf(owner.address);
      await networkHelpers.time.increaseTo(Number(deadline) + 1);

      const tx = await eternalGarden.connect(witness).sealEternally(owner.address);
      await expect(tx)
        .to.emit(eternalGarden, "GardenEternallySealed")
        .withArgs(owner.address, witness.address, await networkHelpers.time.latest());

      const sealed = await eternalGarden.gardenOf(owner.address);
      expect(sealed.state).to.equal(2n); // ETERNAL
      expect(sealed.sealedAt).to.equal(await networkHelpers.time.latest());
      expect(await eternalGarden.canSeal(owner.address)).to.equal(false);
    });

    it("seals gardens at random offsets after the deadline", async function () {
      const { eternalGarden } = await networkHelpers.loadFixture(deployFixture);
      const signers = await ethers.getSigners();
      const witness = signers[19];

      for (let i = 0; i < 16; i += 1) {
        await eternalGarden.connect(signers[2 + i]).plant(id(`seal-${i}`), META_HASH);
      }
      const baseDeadline = await eternalGarden.deadlineOf(signers[2].address);
      await networkHelpers.time.increaseTo(Number(baseDeadline) + 1024);

      for (let i = 0; i < 16; i += 1) {
        const owner = signers[2 + i];
        await eternalGarden.connect(witness).sealEternally(owner.address);
        expect((await eternalGarden.gardenOf(owner.address)).state).to.equal(2n);
      }
    });

    it("prevents heartbeat and re-seal once ETERNAL", async function () {
      const { eternalGarden } = await networkHelpers.loadFixture(deployFixture);
      const [, owner, witness] = await ethers.getSigners();

      await eternalGarden.connect(owner).plant(CIPHER_HASH, META_HASH);
      const deadline = await eternalGarden.deadlineOf(owner.address);
      await networkHelpers.time.increaseTo(Number(deadline) + 1);
      await eternalGarden.connect(witness).sealEternally(owner.address);

      await expect(eternalGarden.connect(owner).heartbeat()).to.be.revertedWithCustomError(
        eternalGarden,
        "GardenNotGrowing",
      );
      await expect(eternalGarden.connect(witness).sealEternally(owner.address)).to.be.revertedWithCustomError(
        eternalGarden,
        "GardenNotGrowing",
      );
    });
  });

  describe("canSeal view", function () {
    it("tracks the time boundary", async function () {
      const { eternalGarden } = await networkHelpers.loadFixture(deployFixture);
      const [, owner] = await ethers.getSigners();

      await eternalGarden.connect(owner).plant(CIPHER_HASH, META_HASH);
      expect(await eternalGarden.canSeal(owner.address)).to.equal(false);

      const deadline = await eternalGarden.deadlineOf(owner.address);
      await networkHelpers.time.increaseTo(Number(deadline));
      expect(await eternalGarden.canSeal(owner.address)).to.equal(false);

      await networkHelpers.time.increaseTo(Number(deadline) + 1);
      expect(await eternalGarden.canSeal(owner.address)).to.equal(true);
    });
  });
});
