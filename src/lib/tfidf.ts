/**
 * Search engine that finds text by comparing specific keyword frequencies.
 * It scores common words lower and rare, unique words higher.
 */
import { preprocessText } from './textPreprocessing';

// Build a dictionary of how rare or common each word is across all documents
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
    // Math to ensure common words like "the" don't overpower search results
    const rawIdf = Math.log((N + 1) / (freq + 1)) + 1;
    idf.set(term, Math.min(rawIdf, Math.log(N) + 1));
  }
  return idf;
}

// Convert a block of text into a mathematical map of weighted words
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
  let norm = 0; 

  for (const [term, count] of tf) {
    // Diminish the value slightly if a word repeats 100 times in a row
    const tfScore = 1 + Math.log(count);
    const idfScore = idf.get(term) || 0;
    
    if (idfScore > 0) {
      const value = tfScore * idfScore;
      tfidf.set(term, value);
      norm += value * value;
    }
  }

  // Normalize the numbers so short texts vs long texts are compared fairly
  if (norm > 0) {
    norm = Math.sqrt(norm);
    for (const [term, value] of tfidf) {
      tfidf.set(term, value / norm);
    }
  }

  return tfidf;
}

// Compare two mapped texts to see how much their important keywords overlap
export function cosineSimilarity(
  vec1: Map<string, number>,
  vec2: Map<string, number>
): number {
  let dot = 0;

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

// Get the closest matching documents for the user's search
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

  // Only keep results that show at least a slight hint of similarity
  const results = scored
    .filter((r) => r.cosineSimilarity > 0.02)
    .sort((a, b) => b.cosineSimilarity - a.cosineSimilarity)
    .slice(0, k);

  return {
    results,
    queryTimeMs: performance.now() - start,
  };
}
