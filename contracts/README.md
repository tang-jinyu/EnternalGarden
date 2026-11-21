# Eternal Garden contracts

Foundry project for the Eternal Garden commitment and heartbeat state machine.

## Commands

```bash
npm install
npm run setup
npm run format:check
npm run build
npm test
npm run snapshot
```

The current hackathon workstation uses the project-local official Windows Forge binary package,
`@foundry-rs/forge-win32-amd64`, so the test suite does not need a machine-wide installation.
`npm run setup` installs `forge-std` into the ignored `lib/` directory. Other operating systems can
use their matching `@foundry-rs/forge-*` package or a normal Foundry installation.

## Deployment variants

- Demo: `EternalGarden(90 seconds)`
- Production candidate: `EternalGarden(30 days)`

The UI must always label the active variant and read `inactivityWindow()` from the deployed
contract rather than assuming a duration.

## Monad Testnet deployment preparation

`script/PrepareDemoDeployment.ps1` is read-only: it builds the contract, verifies that canonical
CreateX has code, derives the 90-second constructor init code, predicts the CREATE2 address and
checks that the address is unused.

```powershell
powershell -ExecutionPolicy Bypass -File script/PrepareDemoDeployment.ps1
```

The prepared values are recorded in `deployments/monad-testnet-demo.json`. A status of
`prepared-not-deployed` is not a deployment. Broadcasting must follow the official wallet skill:
the developer installs/authenticates Alchemy CLI and activates an Agent Wallet session, then the
agent calls CreateX `deployCreate2(bytes32,bytes)` without ever handling a private key.

User-operated prerequisites required before broadcast:

```powershell
npm install -g @alchemy/cli@latest
alchemy auth
```

Then create an EVM Agent Wallet session at
`https://dashboard.alchemy.com/products/agent-wallet/evm-wallet` and run:

```powershell
alchemy wallet connect --mode session
alchemy wallet use session
alchemy config set network monad-testnet
alchemy wallet status --verify
alchemy wallet address
```

Do not paste a private key into this repository or into chat. The deployment agent only uses the
revocable session managed by Alchemy.
