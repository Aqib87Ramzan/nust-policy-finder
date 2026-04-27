/**
 * Generates a 64-bit digital fingerprint for documents to quickly find near-duplicates.
 * Documents with similar content will have similar fingerprints (low Hamming distance).
 */
import { preprocessText } from './textPreprocessing';

// A fast math formula to thoroughly mix a string's characters into a number
function hash64(token: string): [number, number] {
  let h1 = 0x9e3779b1;
  let h2 = 0x85ebca6b;
  let h3 = 0xc2b2ae35;
  
  for (let i = 0; i < token.length; i++) {
    const c = token.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0xcc9e2d51) >>> 0;
    h2 = Math.imul(h2 ^ c, 0x1b873593) >>> 0;
    h3 = Math.imul(h3 ^ c, 0x27d4eb2d) >>> 0;
  }

  // Final mixing step
  h1 ^= h1 >>> 16; h1 = Math.imul(h1, 0x85ebca6b) >>> 0;
  h2 ^= h2 >>> 16; h2 = Math.imul(h2, 0xc2b2ae35) >>> 0;
  h3 ^= h3 >>> 16; h3 = Math.imul(h3, 0x27d4eb2d) >>> 0;
  
  const hi = (h1 ^ h2) >>> 0;
  const lo = (h2 ^ h3) >>> 0;
  
  return [hi, lo];
}

// Calculate the final 64-bit fingerprint for a document
export function computeSimHash(text: string, useShingles: boolean = true): [number, number] {
  let tokens: string[] = [];
  if (useShingles) {
    const rawTokens = preprocessText(text);
    if (rawTokens.length < 3) {
      tokens = rawTokens;
    } else {
      for (const t of rawTokens) tokens.push(t);
      for (let i = 0; i < rawTokens.length - 1; i++) tokens.push(rawTokens[i] + '_' + rawTokens[i + 1]);
      for (let i = 0; i < rawTokens.length - 2; i++) tokens.push(rawTokens[i] + '_' + rawTokens[i + 1] + '_' + rawTokens[i + 2]);
    }
  } else {
    tokens = preprocessText(text);
  }
  
  const v = new Float64Array(64);

  const freq = new Map<string, number>();
  for (const t of tokens) {
    freq.set(t, (freq.get(t) || 0) + 1);
  }

  // Make rarer words pull more weight when forming the fingerprint
  const maxFreq = Math.max(...Array.from(freq.values()));
  
  for (const [token, count] of freq) {
    const [hi, lo] = hash64(token);
    const weight = count / maxFreq;
    
    // Add weights to our array if the bit is 1, subtract if the bit is 0
    for (let i = 0; i < 32; i++) {
      v[i] += (lo & (1 << i)) !== 0 ? weight : -weight;
    }
    for (let i = 0; i < 32; i++) {
      v[32 + i] += (hi & (1 << i)) !== 0 ? weight : -weight;
    }
  }

  // Collapse the weighted array back down into simple 1s and 0s
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

// Quickly counts how many "1" bits are in a number
function popcount32(x: number): number {
  x = x - ((x >>> 1) & 0x55555555);
  x = (x & 0x33333333) + ((x >>> 2) & 0x33333333);
  return (((x + (x >>> 4)) & 0x0f0f0f0f) * 0x01010101) >>> 24;
}

// Compare two fingerprints: lower number means they are more similar
export function hammingDistance(hash1: [number, number], hash2: [number, number]): number {
  return popcount32((hash1[0] ^ hash2[0]) >>> 0) + popcount32((hash1[1] ^ hash2[1]) >>> 0);
}

export interface SimHashResult {
  docId: number;
  hammingDist: number;
  similarity: number;
}

// Only allow a certain level of difference depending on how many documents we are searching
function calculateAdaptiveThreshold(corpusSize: number): number {
  if (corpusSize < 50) return 32;       
  if (corpusSize < 200) return 30;      
  if (corpusSize < 500) return 28;      
  return 26;                            
}

// Find the closest documents by comparing fingerprints
export function simHashRetrieve(
  query: string,
  chunks: Array<{ id: number; text: string }>,
  k = 5,
  threshold?: number,
  useShingles: boolean = true
): { results: SimHashResult[]; queryTimeMs: number } {
  const start = performance.now();
  
  const effectiveThreshold = threshold ?? (useShingles ? 36 : calculateAdaptiveThreshold(chunks.length));
  
  const qHash = computeSimHash(query, useShingles);

  const results: SimHashResult[] = chunks
    .map((c) => {
      const docHash = computeSimHash(c.text, useShingles);
      const dist = hammingDistance(qHash, docHash);
      return { docId: c.id, hammingDist: dist, similarity: 1 - dist / 64 };
    })
    .filter((r) => r.hammingDist <= effectiveThreshold)
    .sort((a, b) => a.hammingDist - b.hammingDist)
    .slice(0, k);

  return { results, queryTimeMs: performance.now() - start };
}
