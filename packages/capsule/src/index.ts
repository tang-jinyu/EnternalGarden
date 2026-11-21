import { keccak_256 } from "@noble/hashes/sha3.js";

const MAGIC = new Uint8Array([0x45, 0x47, 0x43, 0x31]); // EGC1
const VERSION = 1;
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const HEADER_LENGTH = 10;
const AAD = new TextEncoder().encode("EternalGarden:v1");

export const MAX_PLAINTEXT_BYTES = 5 * 1024 * 1024;

export type CipherHash = `0x${string}`;

export interface EncryptedCapsule {
  capsule: Uint8Array;
  cipherHash: CipherHash;
}

export interface ParsedCapsule {
  version: number;
  iv: Uint8Array;
  ciphertext: Uint8Array;
}

export class CapsuleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CapsuleError";
  }
}

export async function encryptCapsule(plaintext: Uint8Array): Promise<EncryptedCapsule> {
  if (plaintext.byteLength === 0) {
    throw new CapsuleError("Plaintext must not be empty");
  }
  if (plaintext.byteLength > MAX_PLAINTEXT_BYTES) {
    throw new CapsuleError(`Plaintext exceeds ${MAX_PLAINTEXT_BYTES} bytes`);
  }

  const plaintextCopy = Uint8Array.from(plaintext);
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const key = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"],
  );
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: AAD, tagLength: 128 },
    key,
    plaintextCopy,
  );

  const capsule = encodeCapsule(iv, new Uint8Array(encrypted));
  return { capsule, cipherHash: hashCapsule(capsule) };
}

export async function encryptTextCapsule(text: string): Promise<EncryptedCapsule> {
  return encryptCapsule(new TextEncoder().encode(text));
}

export function parseCapsule(capsule: Uint8Array): ParsedCapsule {
  if (capsule.byteLength < HEADER_LENGTH + IV_LENGTH + TAG_LENGTH) {
    throw new CapsuleError("Capsule is truncated");
  }

  for (let index = 0; index < MAGIC.length; index += 1) {
    if (capsule[index] !== MAGIC[index]) {
      throw new CapsuleError("Capsule magic is invalid");
    }
  }

  const version = capsule[4];
  if (version !== VERSION) {
    throw new CapsuleError(`Unsupported capsule version: ${String(version)}`);
  }

  const ivLength = capsule[5];
  if (ivLength !== IV_LENGTH) {
    throw new CapsuleError(`Invalid IV length: ${String(ivLength)}`);
  }

  const view = new DataView(capsule.buffer, capsule.byteOffset, capsule.byteLength);
  const ciphertextLength = view.getUint32(6, false);
  if (ciphertextLength < TAG_LENGTH) {
    throw new CapsuleError("Ciphertext is shorter than the authentication tag");
  }

  const expectedLength = HEADER_LENGTH + ivLength + ciphertextLength;
  if (capsule.byteLength !== expectedLength) {
    throw new CapsuleError("Capsule length does not match its header");
  }

  const ivStart = HEADER_LENGTH;
  const ciphertextStart = ivStart + ivLength;
  return {
    version,
    iv: capsule.slice(ivStart, ciphertextStart),
    ciphertext: capsule.slice(ciphertextStart),
  };
}

export function hashCapsule(capsule: Uint8Array): CipherHash {
  return `0x${bytesToHex(keccak_256(capsule))}`;
}

export function verifyCapsule(capsule: Uint8Array, expectedHash: string): boolean {
  if (!/^0x[0-9a-fA-F]{64}$/.test(expectedHash)) return false;
  return hashCapsule(capsule) === expectedHash.toLowerCase();
}

function encodeCapsule(iv: Uint8Array, ciphertext: Uint8Array): Uint8Array {
  if (iv.byteLength !== IV_LENGTH) {
    throw new CapsuleError(`IV must be ${IV_LENGTH} bytes`);
  }
  if (ciphertext.byteLength > 0xffff_ffff) {
    throw new CapsuleError("Ciphertext is too large");
  }

  const output = new Uint8Array(HEADER_LENGTH + iv.byteLength + ciphertext.byteLength);
  output.set(MAGIC, 0);
  output[4] = VERSION;
  output[5] = IV_LENGTH;
  new DataView(output.buffer).setUint32(6, ciphertext.byteLength, false);
  output.set(iv, HEADER_LENGTH);
  output.set(ciphertext, HEADER_LENGTH + iv.byteLength);
  return output;
}

function bytesToHex(bytes: Uint8Array): string {
  let hex = "";
  for (const byte of bytes) hex += byte.toString(16).padStart(2, "0");
  return hex;
}
