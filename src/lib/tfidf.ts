/**
 * TF-IDF + Cosine Similarity retrieval engine.
 * Uses shared preprocessing with stopword removal.
 */
import { preprocessText } from './textPreprocessing';

/** Build IDF from all document texts */
export function buildIDF(docs: Array<{ id: number; text: string }>): Map<string, number> {
  const N = docs.length;
  const docFreq = new Map<string, number>();

  for (const doc of docs) {
    const unique = new Set(preprocessText(doc.text));
    for (const term of unique) {
      docFreq.set(term, (docFreq.get(term) || 0) + 1);
    }
  }

  const idf = new Map<string, number>();
  for (const [term, freq] of docFreq) {
    idf.set(term, Math.log((N + 1) / (freq + 1)) + 1);
  }
  return idf;
}

/** Build TF-IDF vector for a text given a precomputed IDF table */
export function buildTFIDFVector(
  text: string,
  idf: Map<string, number>
): Map<string, number> {
  const tokens = preprocessText(text);
  const tf = new Map<string, number>();
  for (const t of tokens) {
    tf.set(t, (tf.get(t) || 0) + 1);
  }

  const tfidf = new Map<string, number>();
  for (const [term, count] of tf) {
    const tfScore = count / tokens.length;
    const idfScore = idf.get(term) || 0;
    if (idfScore > 0) {
      tfidf.set(term, tfScore * idfScore);
    }
  }
  return tfidf;
}

/** Cosine similarity between two sparse vectors */
export function cosineSimilarity(
  vec1: Map<string, number>,
  vec2: Map<string, number>
): number {
  let dot = 0;
  let mag1 = 0;
  let mag2 = 0;

  for (const [term, val] of vec1) {
    mag1 += val * val;
    const other = vec2.get(term);
    if (other !== undefined) {
      dot += val * other;
    }
  }
  for (const val of vec2.values()) {
    mag2 += val * val;
  }

  const denom = Math.sqrt(mag1) * Math.sqrt(mag2);
  return denom === 0 ? 0 : dot / denom;
}

export interface TFIDFResult {
  docId: number;
  cosineSimilarity: number;
}

/** Retrieve top-k chunks by TF-IDF cosine similarity */
export function retrieveTopK(
  query: string,
  docs: Array<{ id: number; text: string }>,
  idf: Map<string, number>,
  k = 3
): { results: TFIDFResult[]; queryTimeMs: number } {
  const start = performance.now();

  const queryVec = buildTFIDFVector(query, idf);

  const scored: TFIDFResult[] = docs.map((doc) => ({
    docId: doc.id,
    cosineSimilarity: cosineSimilarity(queryVec, buildTFIDFVector(doc.text, idf)),
  }));

  // Filter out near-zero scores and sort
  const results = scored
    .filter((r) => r.cosineSimilarity > 0.01)
    .sort((a, b) => b.cosineSimilarity - a.cosineSimilarity)
    .slice(0, k);

  return {
    results,
    queryTimeMs: performance.now() - start,
  };
}
