# Eternal Garden

**秘密不交给链，存在交给时间。**

Eternal Garden is a private proof-of-existence and irreversible sealing protocol built for Monad.
Plaintext and encryption keys stay offchain; the contract stores only ciphertext commitments,
heartbeats, timestamps and the one-way garden state.

## Repository layout

- `contracts/` — Eternal Garden Solidity contract and Foundry tests
- `web/` — frontend placeholder; implementation starts after the testnet contract is deployed and verified
- `开发记录.md` — product specification, architecture decisions, milestones and acceptance log
- `.monskills` — Monad target metadata required by the official scaffold workflow

## Current status

The P0 contract source and test plan are present. See [`开发记录.md`](./开发记录.md) for the
authoritative status and security boundaries.
