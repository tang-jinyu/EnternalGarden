// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title Eternal Garden
/// @notice Stores only encrypted-content commitments and an irreversible heartbeat state machine.
/// @dev Plaintext, ciphertext and encryption keys must never be supplied to this contract.
contract EternalGarden {
    enum GardenState {
        NONE,
        GROWING,
        ETERNAL
    }

    struct Garden {
        bytes32 cipherHash;
        bytes32 publicMetaHash;
        uint64 plantedAt;
        uint64 lastHeartbeat;
        uint64 sealedAt;
        uint32 heartbeatCount;
        GardenState state;
    }

    error InvalidInactivityWindow();
    error InvalidOwner();
    error EmptyCipherHash();
    error GardenAlreadyExists();
    error GardenNotGrowing();
    error GardenExpired(uint256 deadline);
    error GardenStillAlive(uint256 deadline);

    event GardenPlanted(
        address indexed owner, bytes32 indexed cipherHash, bytes32 publicMetaHash, uint64 plantedAt
    );
    event Heartbeat(address indexed owner, uint32 count, uint64 timestamp);
    event GardenEternallySealed(address indexed owner, address indexed witness, uint64 sealedAt);

    uint64 public immutable inactivityWindow;

    mapping(address owner => Garden garden) private gardens;

    constructor(uint64 inactivityWindow_) {
        if (inactivityWindow_ == 0) revert InvalidInactivityWindow();
        inactivityWindow = inactivityWindow_;
    }

    function plant(bytes32 cipherHash, bytes32 publicMetaHash) external {
        if (cipherHash == bytes32(0)) revert EmptyCipherHash();

        Garden storage garden = gardens[msg.sender];
        if (garden.state != GardenState.NONE) revert GardenAlreadyExists();

        uint64 timestamp = uint64(block.timestamp);
        garden.cipherHash = cipherHash;
        garden.publicMetaHash = publicMetaHash;
        garden.plantedAt = timestamp;
        garden.lastHeartbeat = timestamp;
        garden.heartbeatCount = 1;
        garden.state = GardenState.GROWING;

        emit GardenPlanted(msg.sender, cipherHash, publicMetaHash, timestamp);
        emit Heartbeat(msg.sender, 1, timestamp);
    }

    function heartbeat() external {
        Garden storage garden = gardens[msg.sender];
        if (garden.state != GardenState.GROWING) revert GardenNotGrowing();

        uint256 deadline = uint256(garden.lastHeartbeat) + inactivityWindow;
        if (block.timestamp > deadline) revert GardenExpired(deadline);

        uint64 timestamp = uint64(block.timestamp);
        garden.heartbeatCount += 1;
        garden.lastHeartbeat = timestamp;

        emit Heartbeat(msg.sender, garden.heartbeatCount, timestamp);
    }

    function sealEternally(address owner) external {
        if (owner == address(0)) revert InvalidOwner();

        Garden storage garden = gardens[owner];
        if (garden.state != GardenState.GROWING) revert GardenNotGrowing();

        uint256 deadline = uint256(garden.lastHeartbeat) + inactivityWindow;
        if (block.timestamp <= deadline) revert GardenStillAlive(deadline);

        uint64 timestamp = uint64(block.timestamp);
        garden.sealedAt = timestamp;
        garden.state = GardenState.ETERNAL;

        emit GardenEternallySealed(owner, msg.sender, timestamp);
    }

    function gardenOf(address owner) external view returns (Garden memory) {
        return gardens[owner];
    }

    function deadlineOf(address owner) public view returns (uint256) {
        Garden storage garden = gardens[owner];
        if (garden.state == GardenState.NONE) return 0;
        return uint256(garden.lastHeartbeat) + inactivityWindow;
    }

    function canSeal(address owner) external view returns (bool) {
        Garden storage garden = gardens[owner];
        return garden.state == GardenState.GROWING
            && block.timestamp > uint256(garden.lastHeartbeat) + inactivityWindow;
    }
}
