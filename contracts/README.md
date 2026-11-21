# Eternal Garden contracts

Foundry project for the Eternal Garden commitment and heartbeat state machine.

## Planned commands

```bash
forge fmt --check
forge build
forge test -vvv
forge snapshot
```

Foundry is not currently installed in the detected Windows environment. The source and tests are
prepared for Foundry, but M2 cannot be marked complete until the commands above pass.

## Deployment variants

- Demo: `EternalGarden(90 seconds)`
- Production candidate: `EternalGarden(30 days)`

The UI must always label the active variant and read `inactivityWindow()` from the deployed
contract rather than assuming a duration.
