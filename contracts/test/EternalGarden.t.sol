// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { Test } from "forge-std/Test.sol";
import { EternalGarden } from "../src/EternalGarden.sol";

contract EternalGardenTest is Test {
    EternalGarden internal garden;

    address internal owner = makeAddr("owner");
    address internal witness = makeAddr("witness");

    bytes32 internal constant CIPHER_HASH = keccak256("encrypted-capsule");
    bytes32 internal constant META_HASH = keccak256("public-metadata");
    uint64 internal constant WINDOW = 90 seconds;

    function setUp() public {
        garden = new EternalGarden(WINDOW);
    }

    function testConstructorRejectsZeroWindow() public {
        vm.expectRevert(EternalGarden.InvalidInactivityWindow.selector);
        new EternalGarden(0);
    }

    function testPlantCreatesGrowingGarden() public {
        vm.prank(owner);
        garden.plant(CIPHER_HASH, META_HASH);

        EternalGarden.Garden memory planted = garden.gardenOf(owner);
        assertEq(planted.cipherHash, CIPHER_HASH);
        assertEq(planted.publicMetaHash, META_HASH);
        assertEq(planted.heartbeatCount, 1);
        assertEq(uint8(planted.state), uint8(EternalGarden.GardenState.GROWING));
        assertEq(planted.plantedAt, block.timestamp);
        assertEq(planted.lastHeartbeat, block.timestamp);
        assertEq(garden.deadlineOf(owner), block.timestamp + WINDOW);
    }

    function testPlantRejectsEmptyCipherHash() public {
        vm.expectRevert(EternalGarden.EmptyCipherHash.selector);
        vm.prank(owner);
        garden.plant(bytes32(0), META_HASH);
    }

    function testPlantRejectsReplacingGrowingGarden() public {
        _plant();

        vm.expectRevert(EternalGarden.GardenAlreadyExists.selector);
        vm.prank(owner);
        garden.plant(keccak256("another-capsule"), META_HASH);
    }

    function testPlantStartsFreshCycleAfterEternalSeal() public {
        _plant();
        vm.warp(garden.deadlineOf(owner) + 1);

        vm.prank(witness);
        garden.sealEternally(owner);

        bytes32 nextCipherHash = keccak256("next-encrypted-capsule");
        bytes32 nextMetaHash = keccak256("next-public-metadata");
        vm.warp(block.timestamp + 10 seconds);

        vm.prank(owner);
        garden.plant(nextCipherHash, nextMetaHash);

        EternalGarden.Garden memory replanted = garden.gardenOf(owner);
        assertEq(replanted.cipherHash, nextCipherHash);
        assertEq(replanted.publicMetaHash, nextMetaHash);
        assertEq(replanted.plantedAt, block.timestamp);
        assertEq(replanted.lastHeartbeat, block.timestamp);
        assertEq(replanted.sealedAt, 0);
        assertEq(replanted.heartbeatCount, 1);
        assertEq(uint8(replanted.state), uint8(EternalGarden.GardenState.GROWING));
        assertEq(garden.deadlineOf(owner), block.timestamp + WINDOW);
    }

    function testHeartbeatRefreshesDeadlineAndIncrementsCount() public {
        _plant();
        vm.warp(block.timestamp + 30 seconds);

        vm.prank(owner);
        garden.heartbeat();

        EternalGarden.Garden memory alive = garden.gardenOf(owner);
        assertEq(alive.heartbeatCount, 2);
        assertEq(alive.lastHeartbeat, block.timestamp);
        assertEq(garden.deadlineOf(owner), block.timestamp + WINDOW);
    }

    function testHeartbeatAtDeadlineIsAllowed() public {
        _plant();
        vm.warp(garden.deadlineOf(owner));

        vm.prank(owner);
        garden.heartbeat();

        assertEq(garden.gardenOf(owner).heartbeatCount, 2);
    }

    function testHeartbeatAfterDeadlineReverts() public {
        _plant();
        uint256 deadline = garden.deadlineOf(owner);
        vm.warp(deadline + 1);

        vm.expectRevert(abi.encodeWithSelector(EternalGarden.GardenExpired.selector, deadline));
        vm.prank(owner);
        garden.heartbeat();
    }

    function testSealBeforeDeadlineReverts() public {
        _plant();
        uint256 deadline = garden.deadlineOf(owner);

        vm.expectRevert(abi.encodeWithSelector(EternalGarden.GardenStillAlive.selector, deadline));
        vm.prank(witness);
        garden.sealEternally(owner);
    }

    function testSealRejectsZeroOwner() public {
        vm.expectRevert(EternalGarden.InvalidOwner.selector);
        garden.sealEternally(address(0));
    }

    function testAnyoneCanSealExpiredGarden() public {
        _plant();
        vm.warp(garden.deadlineOf(owner) + 1);

        vm.prank(witness);
        garden.sealEternally(owner);

        EternalGarden.Garden memory sealedGarden = garden.gardenOf(owner);
        assertEq(uint8(sealedGarden.state), uint8(EternalGarden.GardenState.ETERNAL));
        assertEq(sealedGarden.sealedAt, block.timestamp);
        assertFalse(garden.canSeal(owner));
    }

    function testSealedGardenCannotHeartbeatOrSealAgain() public {
        _plant();
        vm.warp(garden.deadlineOf(owner) + 1);

        vm.prank(witness);
        garden.sealEternally(owner);

        vm.expectRevert(EternalGarden.GardenNotGrowing.selector);
        vm.prank(owner);
        garden.heartbeat();

        vm.expectRevert(EternalGarden.GardenNotGrowing.selector);
        vm.prank(witness);
        garden.sealEternally(owner);
    }

    function testCanSealTracksTimeBoundary() public {
        _plant();
        assertFalse(garden.canSeal(owner));

        vm.warp(garden.deadlineOf(owner));
        assertFalse(garden.canSeal(owner));

        vm.warp(block.timestamp + 1);
        assertTrue(garden.canSeal(owner));
    }

    function testFuzzHeartbeatBeforeOrAtDeadline(uint64 elapsedSeed) public {
        _plant();
        uint256 elapsed = bound(elapsedSeed, 0, WINDOW);
        vm.warp(block.timestamp + elapsed);

        vm.prank(owner);
        garden.heartbeat();

        EternalGarden.Garden memory alive = garden.gardenOf(owner);
        assertEq(alive.heartbeatCount, 2);
        assertEq(alive.lastHeartbeat, block.timestamp);
        assertFalse(garden.canSeal(owner));
    }

    function testFuzzAnyoneCanSealAfterDeadline(uint64 extraTimeSeed) public {
        _plant();
        uint256 extraTime = bound(extraTimeSeed, 1, 365 days);
        vm.warp(garden.deadlineOf(owner) + extraTime);

        vm.prank(witness);
        garden.sealEternally(owner);

        EternalGarden.Garden memory sealedGarden = garden.gardenOf(owner);
        assertEq(uint8(sealedGarden.state), uint8(EternalGarden.GardenState.ETERNAL));
        assertEq(sealedGarden.sealedAt, block.timestamp);
    }

    function _plant() internal {
        vm.prank(owner);
        garden.plant(CIPHER_HASH, META_HASH);
    }
}
