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
