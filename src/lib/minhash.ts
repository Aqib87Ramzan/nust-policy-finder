/**
 * MinHash Implementation (LSH Foundation)
 * 
 * All functions implemented from scratch — no external libraries.
 * Uses word-level k-gram shingling as specified.
 */

const LARGE_PRIME = 2147483647; // Mersenne prime 2^31 - 1

export interface HashFunction {
  a: number;
  b: number;
}

/**
 * Generate N random hash functions using: h(x) = (a*x + b) % prime
 * Uses deterministic seeding so results are reproducible.
 */
export function generateHashFunctions(numHashes = 100): HashFunction[] {
  const funcs: HashFunction[] = [];
  for (let i = 0; i < numHashes; i++) {
    // Deterministic pseudo-random coefficients from seed i
    const a = ((i + 1) * 1103515245 + 12345) % LARGE_PRIME;
    const b = ((i + 1) * 1664525 + 1013904223) % LARGE_PRIME;
    funcs.push({ a, b });
  }
  return funcs;
}

/** Apply a hash function: h(x) = (a*x + b) % prime */
function applyHash(hf: HashFunction, x: number): number {
  // Use BigInt internally to avoid overflow
  const result = (BigInt(hf.a) * BigInt(x) + BigInt(hf.b)) % BigInt(LARGE_PRIME);
  return Number(result < 0n ? result + BigInt(LARGE_PRIME) : result);
}

/**
 * Shingle text into word-level k-grams (k=3 words by default).
 * Example: "the cat sat on" with k=3 → {"the cat sat", "cat sat on"}
 */
export function getShingles(text: string, k = 3): Set<string> {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 0);

  const shingles = new Set<string>();
  for (let i = 0; i <= words.length - k; i++) {
    shingles.add(words.slice(i, i + k).join(" "));
  }
  return shingles;
}

/** Convert a string shingle to a non-negative integer via DJB2 hash */
function shingleToInt(s: string): number {
  let hash = 5381;
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) + hash + s.charCodeAt(i)) & 0x7fffffff;
  }
  return hash;
}

/**
 * Compute MinHash signature: for each hash function, find the minimum
 * hash value across all shingles.
 */
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

/**
 * Estimate Jaccard similarity between two MinHash signatures.
 * = (number of matching positions) / (total positions)
 */
export function estimateJaccardSimilarity(sig1: number[], sig2: number[]): number {
  if (sig1.length !== sig2.length) {
    throw new Error("Signatures must have equal length");
  }
  let matches = 0;
  for (let i = 0; i < sig1.length; i++) {
    if (sig1[i] === sig2[i]) matches++;
  }
  return matches / sig1.length;
}

/** Exact Jaccard similarity between two shingle sets */
export function exactJaccardSimilarity(a: Set<string>, b: Set<string>): number {
  let intersection = 0;
  for (const item of a) {
    if (b.has(item)) intersection++;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

// ─── High-level retrieval using MinHash ──────────────────────

export interface MinHashResult {
  docId: number;
  estimatedJaccard: number;
  exactJaccard: number;
}

/**
 * Retrieve top-k documents by MinHash estimated Jaccard similarity.
 * Also computes exact Jaccard for comparison.
 */
export function retrieveByMinHash(
  query: string,
  docs: Array<{ id: number; text: string }>,
  k = 5,
  numHashes = 100,
  shingleK = 3
): { results: MinHashResult[]; queryTimeMs: number; hashFunctions: HashFunction[] } {
  const start = performance.now();

  const hashFunctions = generateHashFunctions(numHashes);

  // Shingle and sign all docs
  const docData = docs.map((d) => {
    const shingles = getShingles(d.text, shingleK);
    const signature = computeMinHashSignature(shingles, hashFunctions);
    return { id: d.id, shingles, signature };
  });

  // Shingle and sign query
  const qShingles = getShingles(query, shingleK);
  const qSignature = computeMinHashSignature(qShingles, hashFunctions);

  // Score all docs
  const results: MinHashResult[] = docData.map((doc) => ({
    docId: doc.id,
    estimatedJaccard: estimateJaccardSimilarity(qSignature, doc.signature),
    exactJaccard: exactJaccardSimilarity(qShingles, doc.shingles),
  }));

  results.sort((a, b) => b.estimatedJaccard - a.estimatedJaccard);

  return {
    results: results.slice(0, k),
    queryTimeMs: performance.now() - start,
    hashFunctions,
  };
}

// ─── LSH Banding (Approximate Retrieval) ─────────────────────

export interface LSHBandedIndex {
  hashFunctions: HashFunction[];
  numBands: number;
  rowsPerBand: number;
  shingleK: number;
  docs: Array<{ id: number; shingles: Set<string>; signature: number[] }>;
  /** One Map per band: bandKey → Set of doc ids */
  bandBuckets: Map<string, Set<number>>[];
}

/**
 * Build an LSH banding index on top of MinHash signatures.
 * Split each signature into `bands` bands of `rows` rows each.
 * Two documents are candidate pairs if they match in at least one band.
 */
export function buildLSHIndex(
  chunks: Array<{ id: number; text: string }>,
  numHashes = 100,
  bands = 20,
  rows = 5,
  shingleK = 3
): LSHBandedIndex {
  const hashFunctions = generateHashFunctions(numHashes);

  // Compute shingles + signatures for every chunk
  const docs = chunks.map((c) => {
    const shingles = getShingles(c.text, shingleK);
    const signature = computeMinHashSignature(shingles, hashFunctions);
    return { id: c.id, shingles, signature };
  });

  // Build band buckets
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

  return { hashFunctions, numBands: bands, rowsPerBand: rows, shingleK, docs, bandBuckets };
}

export interface LSHBandedResult {
  docId: number;
  estimatedJaccard: number;
  exactJaccard: number;
  isCandidateFromLSH: boolean;
}

/**
 * Query the LSH banding index: compute query signature, find candidate
 * chunks via banding, then rank all docs and mark LSH candidates.
 */
export function lshRetrieve(
  query: string,
  lshIndex: LSHBandedIndex,
  k = 5
): { results: LSHBandedResult[]; queryTimeMs: number; candidateCount: number; totalDocs: number } {
  const start = performance.now();
  const { hashFunctions, numBands, rowsPerBand, docs, bandBuckets, shingleK } = lshIndex;

  const qShingles = getShingles(query, shingleK);
  const qSignature = computeMinHashSignature(qShingles, hashFunctions);

  // Find LSH candidates via banding
  const candidateIds = new Set<number>();
  for (let b = 0; b < numBands; b++) {
    const bandSlice = qSignature.slice(b * rowsPerBand, (b + 1) * rowsPerBand);
    const key = bandSlice.join(",");
    const bucket = bandBuckets[b].get(key);
    if (bucket) {
      for (const id of bucket) candidateIds.add(id);
    }
  }

  // If LSH found candidates, only score those; otherwise fall back to all docs
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
    results: results.slice(0, k),
    queryTimeMs: performance.now() - start,
    candidateCount: candidateIds.size,
    totalDocs: docs.length,
  };
}
