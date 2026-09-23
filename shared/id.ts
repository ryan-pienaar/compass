const ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyz";

/** Short, URL-friendly random id (16 chars of base36 ≈ 82 bits). Works in Node and browsers. */
export function newId(size = 16): string {
  const bytes = new Uint8Array(size);
  crypto.getRandomValues(bytes);
  let id = "";
  for (let i = 0; i < size; i++) id += ALPHABET[bytes[i] % ALPHABET.length];
  return id;
}
