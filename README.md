# Eternal Garden

**秘密不交给链，存在交给时间。**

Eternal Garden is a private proof-of-existence and irreversible sealing protocol built for Monad.
Plaintext and encryption keys stay offchain; the contract stores only ciphertext commitments,
heartbeats, timestamps and the one-way garden state.

## Repository layout

- `packages/hardhat/` — Eternal Garden contract + Hardhat 3 test/deploy pipeline (Scaffold-ETH 2 Hardhat flavor, solc 0.8.28)
- `packages/nextjs/` — Next.js frontend (`/`, `/plant`, `/garden`, `/garden/[address]`, `/verify`)
- `packages/capsule/` — local AES-256-GCM encryption module (`.garden` capsule format)
- `contracts/` — original Foundry project, kept as verified reference until the Hardhat chain fully ships
- `开发记录.md` — product specification, security boundaries, milestones and acceptance log (authoritative)
- `开发日志2.md` — Scaffold-ETH 2 migration audit trail
- `项目介绍.md` — Chinese product, architecture, privacy boundary and demo guide
- `.monskills` — Monad target metadata required by the official scaffold workflow

## Commands (Yarn 4 workspaces)

```bash
yarn install                          # install all workspace dependencies
yarn compile                          # compile contracts (Hardhat, solc 0.8.28)
yarn test                             # full Hardhat test suite (14 tests)
yarn chain                            # local node
yarn deploy                           # deploy to local node
yarn deploy --network monad_testnet   # deploy to Monad Testnet (Chain ID 10143)
yarn verify --network monad_testnet   # verify sources
yarn start                            # Next.js dev server
```

## Current status

The Eternal Garden contract, local encryption module, frontend pages and Monad Testnet deployment
are complete. The current deployment uses a 90-second inactivity window for the hackathon demo;
the same address can start a new cycle after its previous garden is eternally sealed. The v1
capsule is an irreversible sealing / proof-of-existence format and does not provide a decryption
or key-recovery path.

See [`项目介绍.md`](./项目介绍.md) for the product and demo guide, and
[`开发记录.md`](./开发记录.md) for the authoritative engineering log and acceptance records.
