/**
 * SimHash Implementation — near-duplicate detection via fingerprinting.
 * Uses shared preprocessing with stopword removal.
 */
import { preprocessText } from './textPreprocessing';

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
  h1 = Math.imul(h1 ^ (h1 >>> 16), 0x85ebca6b) >>> 0;
  h1 = Math.imul(h1 ^ (h1 >>> 13), 0xc2b2ae35) >>> 0;
  h1 = (h1 ^ (h1 >>> 16)) >>> 0;
  h2 = Math.imul(h2 ^ (h2 >>> 16), 0x85ebca6b) >>> 0;
  h2 = Math.imul(h2 ^ (h2 >>> 13), 0xc2b2ae35) >>> 0;
  h2 = (h2 ^ (h2 >>> 16)) >>> 0;
  return [h1, h2];
}

/** Compute a 64-bit SimHash fingerprint using preprocessed tokens */
export function computeSimHash(text: string): [number, number] {
  const tokens = preprocessText(text);
  const v = new Float64Array(64);

  // Count term frequencies for weighting
  const freq = new Map<string, number>();
  for (const t of tokens) freq.set(t, (freq.get(t) || 0) + 1);

  for (const [token, weight] of freq) {
    const [hi, lo] = hash64(token);
    for (let i = 0; i < 32; i++) {
      v[i] += (lo & (1 << i)) !== 0 ? weight : -weight;
    }
    for (let i = 0; i < 32; i++) {
      v[32 + i] += (hi & (1 << i)) !== 0 ? weight : -weight;
    }
  }

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

function popcount32(x: number): number {
  x = x - ((x >>> 1) & 0x55555555);
  x = (x & 0x33333333) + ((x >>> 2) & 0x33333333);
  return (((x + (x >>> 4)) & 0x0f0f0f0f) * 0x01010101) >>> 24;
}

/** Hamming distance between two 64-bit SimHash values */
export function hammingDistance(hash1: [number, number], hash2: [number, number]): number {
  return popcount32((hash1[0] ^ hash2[0]) >>> 0) + popcount32((hash1[1] ^ hash2[1]) >>> 0);
}

export interface SimHashResult {
  docId: number;
  hammingDist: number;
  similarity: number;
}

/** Retrieve top-k chunks by minimum Hamming distance, with threshold filtering */
export function simHashRetrieve(
  query: string,
  chunks: Array<{ id: number; text: string }>,
  k = 5,
  threshold = 35
): { results: SimHashResult[]; queryTimeMs: number } {
  const start = performance.now();
  const qHash = computeSimHash(query);

  const results: SimHashResult[] = chunks
    .map((c) => {
      const docHash = computeSimHash(c.text);
      const dist = hammingDistance(qHash, docHash);
      return { docId: c.id, hammingDist: dist, similarity: 1 - dist / 64 };
    })
    .filter((r) => r.hammingDist <= threshold)
    .sort((a, b) => a.hammingDist - b.hammingDist)
    .slice(0, k);

  return { results, queryTimeMs: performance.now() - start };
}
