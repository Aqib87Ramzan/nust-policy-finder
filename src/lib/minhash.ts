/**
 * Implementation of MinHash and LSH (Locality-Sensitive Hashing).
 * Helps quickly find similar documents without comparing every single word.
 */
import { preprocessText } from './textPreprocessing';

const LARGE_PRIME = 2147483647;

export interface HashFunction {
  a: number;
  b: number;
}

// Create the math formulas needed to hash our text
export function generateHashFunctions(numHashes = 128): HashFunction[] {
  const funcs: HashFunction[] = [];
  for (let i = 0; i < numHashes; i++) {
    const a = ((i + 1) * 2654435761 + 12345) % LARGE_PRIME;
    const b = ((i + 1) * 2246822519 + 1013904223) % LARGE_PRIME;
    funcs.push({ a, b });
  }
  return funcs;
}

function applyHash(hf: HashFunction, x: number): number {
  const result = (BigInt(hf.a) * BigInt(x) + BigInt(hf.b)) % BigInt(LARGE_PRIME);
  return Number(result < 0n ? result + BigInt(LARGE_PRIME) : result);
}

// Break text into small overlapping chunks (1, 2, and 3 words at a time)
export function getShingles(text: string): Set<string> {
  const tokens = preprocessText(text);
  const shingles = new Set<string>();

  for (const t of tokens) {
    shingles.add(t);
  }

  for (let i = 0; i < tokens.length - 1; i++) {
    shingles.add(tokens[i] + '_' + tokens[i + 1]);
  }

  for (let i = 0; i < tokens.length - 2; i++) {
    shingles.add(tokens[i] + '_' + tokens[i + 1] + '_' + tokens[i + 2]);
  }

  return shingles;
}

// Convert a text chunk into a number so we can do math on it
function shingleToInt(s: string): number {
  let hash = 5381;
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) + hash + s.charCodeAt(i)) & 0x7fffffff;
  }
  hash = ((hash << 13) ^ hash) & 0x7fffffff;
  return hash;
}

// Convert a set of words into a smaller "signature" footprint
export function computeMinHashSignature(
  shingles: Set<string>,
  hashFunctions: HashFunction[]
): number[] {
  const numericShingles = Array.from(shingles).map(shingleToInt);
  const signature = new Array(hashFunctions.length).fill(Infinity);

  for (let i = 0; i < hashFunctions.length; i++) {
    for (const val of numericShingles) {
      const hashed = applyHash(hashFunctions[i], val);
      if (hashed < signature[i]) {
        signature[i] = hashed;
      }
    }
  }
  return signature;
}

// Compare two signatures to guess how similar the original texts were
export function estimateJaccardSimilarity(sig1: number[], sig2: number[]): number {
  if (sig1.length !== sig2.length) throw new Error("Signatures must have equal length");
  let matches = 0;
  for (let i = 0; i < sig1.length; i++) {
    if (sig1[i] === sig2[i]) matches++;
  }
  return matches / sig1.length;
}

// Compare the original texts word-by-word for perfect accuracy
export function exactJaccardSimilarity(a: Set<string>, b: Set<string>): number {
  let intersection = 0;
  for (const item of a) {
    if (b.has(item)) intersection++;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

// ======================================
// Standalone MinHash retrieval workflow
// ======================================

export interface MinHashResult {
  docId: number;
  estimatedJaccard: number;
  exactJaccard: number;
}

export function retrieveByMinHash(
  query: string,
  docs: Array<{ id: number; text: string }>,
  k = 5,
  numHashes = 128
): { results: MinHashResult[]; queryTimeMs: number; hashFunctions: HashFunction[] } {
  const start = performance.now();
  const hashFunctions = generateHashFunctions(numHashes);

  const docData = docs.map((d) => {
    const shingles = getShingles(d.text);
    const signature = computeMinHashSignature(shingles, hashFunctions);
    return { id: d.id, shingles, signature };
  });

  const qShingles = getShingles(query);
  const qSignature = computeMinHashSignature(qShingles, hashFunctions);

  const results: MinHashResult[] = docData.map((doc) => ({
    docId: doc.id,
    estimatedJaccard: estimateJaccardSimilarity(qSignature, doc.signature),
    exactJaccard: exactJaccardSimilarity(qShingles, doc.shingles),
  }));

  results.sort((a, b) => b.estimatedJaccard - a.estimatedJaccard);

  return {
    results: results.filter(r => r.estimatedJaccard > 0).slice(0, k),
    queryTimeMs: performance.now() - start,
    hashFunctions,
  };
}

// ======================================
// LSH Banding retrieval workflow
// ======================================

export interface LSHBandedIndex {
  hashFunctions: HashFunction[];
  numBands: number;
  rowsPerBand: number;
  docs: Array<{ id: number; shingles: Set<string>; signature: number[] }>;
  bandBuckets: Map<string, Set<number>>[];
}

// Build bucket groups (bands) so we don't have to compare a query against everything
export function buildLSHIndex(
  chunks: Array<{ id: number; text: string }>,
  numHashes = 128,
  bands = 32,
  rows = 4
): LSHBandedIndex {
  const hashFunctions = generateHashFunctions(numHashes);

  const docs = chunks.map((c) => {
    const shingles = getShingles(c.text);
    const signature = computeMinHashSignature(shingles, hashFunctions);
    return { id: c.id, shingles, signature };
  });

  const bandBuckets: Map<string, Set<number>>[] = [];
  for (let b = 0; b < bands; b++) {
    const bucketMap = new Map<string, Set<number>>();
    for (const doc of docs) {
      const bandSlice = doc.signature.slice(b * rows, (b + 1) * rows);
      const key = bandSlice.join(",");
      if (!bucketMap.has(key)) bucketMap.set(key, new Set());
      bucketMap.get(key)!.add(doc.id);
    }
    bandBuckets.push(bucketMap);
  }

  return { hashFunctions, numBands: bands, rowsPerBand: rows, docs, bandBuckets };
}

export interface LSHBandedResult {
  docId: number;
  estimatedJaccard: number;
  exactJaccard: number;
  isCandidateFromLSH: boolean;
}

// Find matching documents by only looking at candidates in the same buckets
export function lshRetrieve(
  query: string,
  lshIndex: LSHBandedIndex,
  k = 5
): { results: LSHBandedResult[]; queryTimeMs: number; candidateCount: number; totalDocs: number } {
  const start = performance.now();
  const { hashFunctions, numBands, rowsPerBand, docs, bandBuckets } = lshIndex;

  const qShingles = getShingles(query);
  const qSignature = computeMinHashSignature(qShingles, hashFunctions);

  // Find LSH candidates via banding - improved candidate collection
  const candidateIds = new Set<number>();
  for (let b = 0; b < numBands; b++) {
    const bandSlice = qSignature.slice(b * rowsPerBand, (b + 1) * rowsPerBand);
    const key = bandSlice.join(",");
    const bucket = bandBuckets[b].get(key);
    if (bucket) {
      for (const id of bucket) candidateIds.add(id);
    }
  }

  // Score candidates only; fall back to all if none found (rare with many bands)
  const docsToScore = candidateIds.size > 0
    ? docs.filter((doc) => candidateIds.has(doc.id))
    : docs;

  const results: LSHBandedResult[] = docsToScore.map((doc) => ({
    docId: doc.id,
    estimatedJaccard: estimateJaccardSimilarity(qSignature, doc.signature),
    exactJaccard: exactJaccardSimilarity(qShingles, doc.shingles),
    isCandidateFromLSH: candidateIds.has(doc.id),
  }));

  results.sort((a, b) => b.exactJaccard - a.exactJaccard);

  return {
    results: results.filter(r => r.exactJaccard > 0).slice(0, k),
    queryTimeMs: performance.now() - start,
    candidateCount: candidateIds.size,
    totalDocs: docs.length,
  };
}
