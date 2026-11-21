# Eternal Garden web

The Next.js frontend will be scaffolded after the contract passes its test suite and the Monad
Testnet deployment is verified. This ordering prevents a mock contract service or a stale address
from becoming part of the demo.

Planned stack:

- Next.js + TypeScript + Tailwind CSS
- wagmi v3 + viem
- Para wallet integration, following the official Monad wallet-integration skill
- Web Crypto API for AES-256-GCM
- IndexedDB for local encrypted capsules
