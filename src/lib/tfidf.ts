/**
 * TF-IDF + Cosine Similarity baseline retrieval engine.
 * All functions implemented from scratch — no external libraries.
 */

/** Lowercase, remove punctuation, split into words */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter((t) => t.length > 0);
}

/** Term frequency map: count of each token / total tokens */
export function computeTF(tokens: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const t of tokens) {
    counts.set(t, (counts.get(t) || 0) + 1);
  }
  const tf = new Map<string, number>();
  for (const [term, count] of counts) {
    tf.set(term, count / tokens.length);
  }
  return tf;
}

/** Inverse document frequency across all documents */
export function computeIDF(allDocTokens: string[][]): Map<string, number> {
  const n = allDocTokens.length;
  const docFreq = new Map<string, number>();

  for (const tokens of allDocTokens) {
    const unique = new Set(tokens);
    for (const term of unique) {
      docFreq.set(term, (docFreq.get(term) || 0) + 1);
    }
  }

  const idf = new Map<string, number>();
  for (const [term, df] of docFreq) {
    idf.set(term, Math.log((n + 1) / (df + 1)) + 1); // smoothed IDF
  }
  return idf;
}

/** Multiply TF × IDF to produce a weighted vector */
export function computeTFIDF(tf: Map<string, number>, idf: Map<string, number>): Map<string, number> {
  const tfidf = new Map<string, number>();
  for (const [term, tfVal] of tf) {
    const idfVal = idf.get(term) || 0;
    tfidf.set(term, tfVal * idfVal);
  }
  return tfidf;
}

/** Cosine similarity between two sparse vectors */
export function cosineSimilarity(vec1: Map<string, number>, vec2: Map<string, number>): number {
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
  k = 3
): { results: TFIDFResult[]; queryTimeMs: number } {
  const start = performance.now();

  // Tokenize all docs + query
  const allDocTokens = docs.map((d) => tokenize(d.text));
  const queryTokens = tokenize(query);

  // Build IDF from corpus
  const idf = computeIDF(allDocTokens);

  // Compute TF-IDF for query
  const queryTF = computeTF(queryTokens);
  const queryVec = computeTFIDF(queryTF, idf);

  // Score each document
  const scored: TFIDFResult[] = docs.map((doc, i) => {
    const docTF = computeTF(allDocTokens[i]);
    const docVec = computeTFIDF(docTF, idf);
    return {
      docId: doc.id,
      cosineSimilarity: cosineSimilarity(queryVec, docVec),
    };
  });

  scored.sort((a, b) => b.cosineSimilarity - a.cosineSimilarity);

  return {
    results: scored.slice(0, k),
    queryTimeMs: performance.now() - start,
  };
}
