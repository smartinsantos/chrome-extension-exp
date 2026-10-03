const FNV_OFFSET_BASIS_32 = 0x811c9dc5;
const FNV_PRIME_32 = 0x01000193;
const HASH_LENGTH = 7;

const utf8Encoder = new TextEncoder();

/**
 * Short, deterministic, non-cryptographic hash (FNV-1a, 32 bit) that works the same in
 * browsers and Node.js. Used to keep generated identifiers unique and reproducible,
 * never for security.
 */
export function stableHash(text: string): string {
  let hash = FNV_OFFSET_BASIS_32;
  for (const byte of utf8Encoder.encode(text)) {
    hash ^= byte;
    hash = Math.imul(hash, FNV_PRIME_32);
  }
  const unsignedHash = hash >>> 0;
  return unsignedHash.toString(36).padStart(HASH_LENGTH, '0');
}
