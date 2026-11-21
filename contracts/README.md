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

The repository declares a project-local `@foundry-rs/forge` package so the test suite does not need
a machine-wide Foundry installation. `npm run setup` installs `forge-std` into the ignored `lib/`
directory. In this environment the native npm binary download did not finish within the command
window, so the Foundry suite still needs to be executed before M2 can be accepted.

## Deployment variants

- Demo: `EternalGarden(90 seconds)`
- Production candidate: `EternalGarden(30 days)`

The UI must always label the active variant and read `inactivityWindow()` from the deployed
contract rather than assuming a duration.
