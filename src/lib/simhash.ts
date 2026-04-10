/**
 * SimHash Implementation — near-duplicate detection via fingerprinting.
 * All functions implemented from scratch — no external libraries.
 *
 * Pipeline: Text → tokenize → hash each token → weighted bit-vector sum → binarize → 64-bit fingerprint
 */

/** Simple string hash producing a 64-bit value as two 32-bit halves [hi, lo] */
function hash64(token: string): [number, number] {
  let h1 = 0x9e3779b9;
  let h2 = 0x85ebca6b;
  for (let i = 0; i < token.length; i++) {
    const c = token.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0xcc9e2d51) >>> 0;
    h1 = ((h1 << 15) | (h1 >>> 17)) >>> 0;
    h2 = Math.imul(h2 ^ c, 0x1b873593) >>> 0;
    h2 = ((h2 << 13) | (h2 >>> 19)) >>> 0;
  }
  // finalise
  h1 = Math.imul(h1 ^ (h1 >>> 16), 0x85ebca6b) >>> 0;
  h1 = Math.imul(h1 ^ (h1 >>> 13), 0xc2b2ae35) >>> 0;
  h1 = (h1 ^ (h1 >>> 16)) >>> 0;
  h2 = Math.imul(h2 ^ (h2 >>> 16), 0x85ebca6b) >>> 0;
  h2 = Math.imul(h2 ^ (h2 >>> 13), 0xc2b2ae35) >>> 0;
  h2 = (h2 ^ (h2 >>> 16)) >>> 0;
  return [h1, h2];
}

/** Tokenize text: lowercase, remove punctuation, split into words */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 0);
}

/**
 * Compute a 64-bit SimHash fingerprint for a text.
 * Returns the fingerprint as a pair of 32-bit unsigned integers [hi, lo].
 */
export function computeSimHash(text: string): [number, number] {
  const tokens = tokenize(text);
  // Build a weighted bit-vector of 64 dimensions
  const v = new Float64Array(64);

  // Count term frequencies for weighting
  const freq = new Map<string, number>();
  for (const t of tokens) freq.set(t, (freq.get(t) || 0) + 1);

  for (const [token, weight] of freq) {
    const [hi, lo] = hash64(token);
    // Process low 32 bits (positions 0-31)
    for (let i = 0; i < 32; i++) {
      v[i] += (lo & (1 << i)) !== 0 ? weight : -weight;
    }
    // Process high 32 bits (positions 32-63)
    for (let i = 0; i < 32; i++) {
      v[32 + i] += (hi & (1 << i)) !== 0 ? weight : -weight;
    }
  }

  // Binarize
  let lo = 0;
  let hi = 0;
  for (let i = 0; i < 32; i++) {
    if (v[i] > 0) lo |= 1 << i;
  }
  for (let i = 0; i < 32; i++) {
    if (v[32 + i] > 0) hi |= 1 << i;
  }
  return [hi >>> 0, lo >>> 0];
}

/** Count the number of set bits in a 32-bit integer */
function popcount32(x: number): number {
  x = x - ((x >>> 1) & 0x55555555);
  x = (x & 0x33333333) + ((x >>> 2) & 0x33333333);
  return (((x + (x >>> 4)) & 0x0f0f0f0f) * 0x01010101) >>> 24;
}

/**
 * Compute Hamming distance between two 64-bit SimHash values.
 * Each value is represented as [hi, lo] pair of 32-bit unsigned integers.
 */
export function hammingDistance(hash1: [number, number], hash2: [number, number]): number {
  return popcount32((hash1[0] ^ hash2[0]) >>> 0) + popcount32((hash1[1] ^ hash2[1]) >>> 0);
}

// ─── High-level retrieval ────────────────────────────────────

export interface SimHashResult {
  docId: number;
  hammingDist: number;
  similarity: number; // 1 - hammingDist/64
}

/**
 * Retrieve top-k chunks by minimum Hamming distance to the query's SimHash.
 */
export function simHashRetrieve(
  query: string,
  chunks: Array<{ id: number; text: string }>,
  k = 5
): { results: SimHashResult[]; queryTimeMs: number } {
  const start = performance.now();

  const qHash = computeSimHash(query);

  const results: SimHashResult[] = chunks.map((c) => {
    const docHash = computeSimHash(c.text);
    const dist = hammingDistance(qHash, docHash);
    return { docId: c.id, hammingDist: dist, similarity: 1 - dist / 64 };
  });

  // Sort by ascending Hamming distance (lower = more similar)
  results.sort((a, b) => a.hammingDist - b.hammingDist);

  return { results: results.slice(0, k), queryTimeMs: performance.now() - start };
}
