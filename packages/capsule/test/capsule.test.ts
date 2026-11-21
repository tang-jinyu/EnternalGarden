import assert from "node:assert/strict";
import test from "node:test";

import {
  CapsuleError,
  MAX_PLAINTEXT_BYTES,
  encryptCapsule,
  encryptTextCapsule,
  hashCapsule,
  parseCapsule,
  verifyCapsule,
} from "../src/index.js";

test("encrypts a text secret into a valid versioned capsule", async () => {
  const secret = "藏着的，永远藏着。";
  const encrypted = await encryptTextCapsule(secret);
  const parsed = parseCapsule(encrypted.capsule);

  assert.equal(parsed.version, 1);
  assert.equal(parsed.iv.byteLength, 12);
  assert.equal(parsed.ciphertext.byteLength, new TextEncoder().encode(secret).byteLength + 16);
  assert.match(encrypted.cipherHash, /^0x[0-9a-f]{64}$/);
  assert.equal(verifyCapsule(encrypted.capsule, encrypted.cipherHash), true);
  assert.equal(Buffer.from(encrypted.capsule).includes(Buffer.from(secret)), false);
});

test("uses a fresh IV so the same plaintext produces different commitments", async () => {
  const first = await encryptTextCapsule("same secret");
  const second = await encryptTextCapsule("same secret");

  assert.notDeepEqual(first.capsule, second.capsule);
  assert.notEqual(first.cipherHash, second.cipherHash);
});

test("detects a changed encrypted capsule", async () => {
  const encrypted = await encryptTextCapsule("do not reveal");
  const changed = encrypted.capsule.slice();
  changed[changed.length - 1] = (changed[changed.length - 1] ?? 0) ^ 0x01;

  assert.equal(verifyCapsule(changed, encrypted.cipherHash), false);
});

test("matches the canonical Keccak-256 empty input vector", () => {
  assert.equal(
    hashCapsule(new Uint8Array()),
    "0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470",
  );
});

test("rejects empty and oversized plaintext", async () => {
  await assert.rejects(encryptCapsule(new Uint8Array()), CapsuleError);
  await assert.rejects(
    encryptCapsule(new Uint8Array(MAX_PLAINTEXT_BYTES + 1)),
    /Plaintext exceeds/,
  );
});

test("rejects malformed capsule headers and lengths", async () => {
  const encrypted = await encryptTextCapsule("header checks");

  const wrongMagic = encrypted.capsule.slice();
  wrongMagic[0] = 0;
  assert.throws(() => parseCapsule(wrongMagic), /magic/);

  const wrongVersion = encrypted.capsule.slice();
  wrongVersion[4] = 2;
  assert.throws(() => parseCapsule(wrongVersion), /version/);

  const wrongLength = encrypted.capsule.slice();
  new DataView(wrongLength.buffer).setUint32(6, 1, false);
  assert.throws(() => parseCapsule(wrongLength), /authentication tag/);

  assert.throws(() => parseCapsule(encrypted.capsule.slice(0, 12)), /truncated/);
});

test("accepts an uppercase expected hash and rejects invalid hash strings", async () => {
  const encrypted = await encryptTextCapsule("hash input validation");
  assert.equal(verifyCapsule(encrypted.capsule, encrypted.cipherHash.toUpperCase()), false);
  assert.equal(
    verifyCapsule(encrypted.capsule, `0x${encrypted.cipherHash.slice(2).toUpperCase()}`),
    true,
  );
  assert.equal(verifyCapsule(encrypted.capsule, "not-a-hash"), false);
});
