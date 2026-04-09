/**
 * Locality Sensitive Hashing (LSH) Engine for text retrieval.
 * 
 * Pipeline: Text → k-shingles → MinHash signature → LSH bands → candidate retrieval → Jaccard ranking
 */

// ─── Shingling ───────────────────────────────────────────────

/** Produce character-level k-shingles from text */
export function shingle(text: string, k = 3): Set<string> {
  const normalized = text.toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
  const shingles = new Set<string>();
  for (let i = 0; i <= normalized.length - k; i++) {
    shingles.add(normalized.substring(i, i + k));
  }
  return shingles;
}

// ─── MinHash ─────────────────────────────────────────────────

/** Simple deterministic hash: (a * x + b) mod p mod maxVal */
function hashFunc(a: number, b: number, p: number, maxVal: number) {
  return (x: number) => ((a * x + b) % p) % maxVal;
}

/** Convert a string shingle to a numeric value via simple hash */
function shingleToNumber(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

const LARGE_PRIME = 2147483647; // Mersenne prime 2^31 - 1

/** Generate MinHash signature for a set of shingles */
export function minHash(shingles: Set<string>, numHashes: number, hashFuncs: Array<(x: number) => number>): number[] {
  const signature = new Array(numHashes).fill(Infinity);
  const numericShingles = Array.from(shingles).map(shingleToNumber);

  for (let i = 0; i < numHashes; i++) {
    const hf = hashFuncs[i];
    for (const val of numericShingles) {
      const hashed = hf(val);
      if (hashed < signature[i]) {
        signature[i] = hashed;
      }
    }
  }
  return signature;
}

/** Create a set of hash functions for MinHash */
export function createHashFunctions(numHashes: number, maxVal = 10000): Array<(x: number) => number> {
  // Deterministic "random" coefficients using a simple seed
  const funcs: Array<(x: number) => number> = [];
  for (let i = 0; i < numHashes; i++) {
    const a = (i * 1103515245 + 12345) % LARGE_PRIME;
    const b = (i * 1664525 + 1013904223) % LARGE_PRIME;
    funcs.push(hashFunc(a, b, LARGE_PRIME, maxVal));
  }
  return funcs;
}

// ─── LSH Index ───────────────────────────────────────────────

export interface LSHConfig {
  numHashes: number;   // signature length (default 100)
  numBands: number;    // number of bands (default 20)
  shingleK: number;    // shingle size (default 3)
}

export const DEFAULT_LSH_CONFIG: LSHConfig = {
  numHashes: 100,
  numBands: 20,
  shingleK: 3,
};

export interface IndexedDocument {
  id: number;
  shingles: Set<string>;
  signature: number[];
}

export interface LSHIndex {
  config: LSHConfig;
  hashFuncs: Array<(x: number) => number>;
  documents: IndexedDocument[];
  buckets: Map<string, Set<number>>[]; // one map per band
}

/** Build the LSH index from documents */
export function buildIndex(
  docs: Array<{ id: number; text: string }>,
  config: LSHConfig = DEFAULT_LSH_CONFIG
): LSHIndex {
  const hashFuncs = createHashFunctions(config.numHashes);
  const rowsPerBand = Math.floor(config.numHashes / config.numBands);

  // Build signatures
  const documents: IndexedDocument[] = docs.map((doc) => {
    const s = shingle(doc.text, config.shingleK);
    const sig = minHash(s, config.numHashes, hashFuncs);
    return { id: doc.id, shingles: s, signature: sig };
  });

  // Build band buckets
  const buckets: Map<string, Set<number>>[] = [];
  for (let b = 0; b < config.numBands; b++) {
    const bandMap = new Map<string, Set<number>>();
    for (const doc of documents) {
      const bandSlice = doc.signature.slice(b * rowsPerBand, (b + 1) * rowsPerBand);
      const key = bandSlice.join(",");
      if (!bandMap.has(key)) bandMap.set(key, new Set());
      bandMap.get(key)!.add(doc.id);
    }
    buckets.push(bandMap);
  }

  return { config, hashFuncs, documents, buckets };
}

/** Jaccard similarity between two sets */
export function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  let intersection = 0;
  for (const item of a) {
    if (b.has(item)) intersection++;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/** Estimated Jaccard from MinHash signatures */
export function signatureSimilarity(sigA: number[], sigB: number[]): number {
  let matches = 0;
  for (let i = 0; i < sigA.length; i++) {
    if (sigA[i] === sigB[i]) matches++;
  }
  return matches / sigA.length;
}

export interface QueryResult {
  docId: number;
  jaccardSimilarity: number;
  estimatedSimilarity: number;
  isCandidateFromLSH: boolean;
}

/** Query the LSH index — returns candidates ranked by Jaccard similarity */
export function queryIndex(
  index: LSHIndex,
  queryText: string,
  topK = 5
): { results: QueryResult[]; queryTimeMs: number; candidateCount: number; totalDocs: number } {
  const start = performance.now();
  const { config, hashFuncs, documents, buckets } = index;
  const rowsPerBand = Math.floor(config.numHashes / config.numBands);

  // Build query signature
  const qShingles = shingle(queryText, config.shingleK);
  const qSignature = minHash(qShingles, config.numHashes, hashFuncs);

  // Find LSH candidates
  const candidateIds = new Set<number>();
  for (let b = 0; b < config.numBands; b++) {
    const bandSlice = qSignature.slice(b * rowsPerBand, (b + 1) * rowsPerBand);
    const key = bandSlice.join(",");
    const bucket = buckets[b].get(key);
    if (bucket) {
      for (const id of bucket) candidateIds.add(id);
    }
  }

  // Compute similarities for ALL docs (for comparison), mark LSH candidates
  const results: QueryResult[] = documents.map((doc) => ({
    docId: doc.id,
    jaccardSimilarity: jaccardSimilarity(qShingles, doc.shingles),
    estimatedSimilarity: signatureSimilarity(qSignature, doc.signature),
    isCandidateFromLSH: candidateIds.has(doc.id),
  }));

  // Sort by Jaccard similarity descending
  results.sort((a, b) => b.jaccardSimilarity - a.jaccardSimilarity);

  const queryTimeMs = performance.now() - start;

  return {
    results: results.slice(0, topK),
    queryTimeMs,
    candidateCount: candidateIds.size,
    totalDocs: documents.length,
  };
}
