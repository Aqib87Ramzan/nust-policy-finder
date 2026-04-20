/**
 * TF-IDF + Cosine Similarity retrieval engine.
 * Enhanced with L2 normalization, better IDF smoothing, and BM25-inspired term saturation
 */
import { preprocessText } from './textPreprocessing';

/** Build IDF with improved smoothing and saturation */
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
    // Enhanced IDF: log((N+1)/(freq+1)) + 1 with saturation at extremes
    // This prevents common terms from dominating while maintaining distinction
    const rawIdf = Math.log((N + 1) / (freq + 1)) + 1;
    // Apply saturation: cap extremely high IDF values
    idf.set(term, Math.min(rawIdf, Math.log(N) + 1));
  }
  return idf;
}

/** Build L2-normalized TF-IDF vector */
export function buildTFIDFVector(
  text: string,
  idf: Map<string, number>
): Map<string, number> {
  const tokens = preprocessText(text);
  const tf = new Map<string, number>();
  
  // Count term frequencies
  for (const t of tokens) {
    tf.set(t, (tf.get(t) || 0) + 1);
  }

  const tfidf = new Map<string, number>();
  let norm = 0; // For L2 normalization

  for (const [term, count] of tf) {
    // Sublinear term frequency scaling: 1 + log(TF) to reduce impact of repeated terms
    const tfScore = 1 + Math.log(count);
    const idfScore = idf.get(term) || 0;
    
    if (idfScore > 0) {
      const value = tfScore * idfScore;
      tfidf.set(term, value);
      norm += value * value;
    }
  }

  // Apply L2 normalization for consistent cosine similarity
  if (norm > 0) {
    norm = Math.sqrt(norm);
    for (const [term, value] of tfidf) {
      tfidf.set(term, value / norm);
    }
  }

  return tfidf;
}

/** Cosine similarity between two L2-normalized sparse vectors */
export function cosineSimilarity(
  vec1: Map<string, number>,
  vec2: Map<string, number>
): number {
  let dot = 0;

  // Since vectors are L2-normalized, just compute dot product
  for (const [term, val] of vec1) {
    const other = vec2.get(term);
    if (other !== undefined) {
      dot += val * other;
    }
  }

  return dot;
}

export interface TFIDFResult {
  docId: number;
  cosineSimilarity: number;
}

/** Retrieve top-k chunks by TF-IDF cosine similarity with improved filtering */
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

  // More aggressive filtering: require meaningful similarity
  const results = scored
    .filter((r) => r.cosineSimilarity > 0.02) // Slightly higher threshold
    .sort((a, b) => b.cosineSimilarity - a.cosineSimilarity)
    .slice(0, k);

  return {
    results,
    queryTimeMs: performance.now() - start,
  };
}
