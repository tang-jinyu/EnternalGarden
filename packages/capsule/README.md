# Eternal Garden capsule

Browser-compatible encryption and commitment library for `.garden` capsules.

## Security properties

- AES-256-GCM with a fresh random 96-bit IV
- Non-extractable, encrypt-only Web Crypto key
- No plaintext filename or MIME type in the capsule
- Keccak-256 commitment compatible with Solidity tooling
- 5 MiB plaintext limit for the hackathon MVP
- No decrypt or key-export API by design

## Binary format v1

| Offset | Bytes | Value |
| --- | ---: | --- |
| 0 | 4 | ASCII `EGC1` magic |
| 4 | 1 | Version `1` |
| 5 | 1 | IV length `12` |
| 6 | 4 | Ciphertext length, unsigned big-endian |
| 10 | 12 | AES-GCM IV |
| 22 | variable | Ciphertext followed by the 16-byte GCM tag |

AES-GCM additional authenticated data is the fixed UTF-8 string `EternalGarden:v1`.

## Commands

```bash
npm install
npm run typecheck
npm test
```
