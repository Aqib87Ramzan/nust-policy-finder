import { buildTFIDFVector, cosineSimilarity } from './tfidf';

export interface Document {
  id: number;
  text: string;
}

/**
 * Computes PageRank (TextRank style) over a collection of documents using 
 * TF-IDF cosine similarity to form the edges of the graph.
 * 
 * @param docs The array of documents
 * @param idf The pre-calculated IDF map for the documents
 * @param dampingFactor The PageRank damping factor (typically 0.85)
 * @param iterations Maximum number of iterations
 * @param similarityThreshold Only consider document pairs with similarity above this
 * @returns A Map projecting document ID to its computed PageRank score
 */
export function computePageRank(
  docs: Document[],
  idf: Map<string, number>,
  dampingFactor = 0.85,
  iterations = 20,
  similarityThreshold = 0.05
): Map<number, number> {
  const N = docs.length;
  if (N === 0) return new Map();

  // 1. Precalculate TF-IDF vectors for all documents
  const tfidfVectors = docs.map(doc => ({
    id: doc.id,
    vector: buildTFIDFVector(doc.text, idf)
  }));

  // 2. Build adjacency list based on cosine similarity
  // graph[i] contains edges from doc i to other docs
  const graph = new Map<number, number[]>();
  docs.forEach(d => graph.set(d.id, []));

  for (let i = 0; i < N; i++) {
    for (let j = i + 1; j < N; j++) {
      const sim = cosineSimilarity(tfidfVectors[i].vector, tfidfVectors[j].vector);
      if (sim > similarityThreshold) {
        // Undirected graph (add edges both ways)
        graph.get(docs[i].id)!.push(docs[j].id);
        graph.get(docs[j].id)!.push(docs[i].id);
      }
    }
  }

  // 3. Initialize PageRank scores
  // Initial score is 1/N for all nodes
  let pr = new Map<number, number>();
  const initialScore = 1.0 / N;
  docs.forEach(d => pr.set(d.id, initialScore));

  // 4. Power iteration method
  for (let iter = 0; iter < iterations; iter++) {
    const newPr = new Map<number, number>();
    // Base probability from random jumping
    const baseScore = (1.0 - dampingFactor) / N;

    let diff = 0;

    for (const doc of docs) {
      let incomingScore = 0;
      const docId = doc.id;

      // Find all nodes that point TO docId
      // Since it's undirected, nodes that point to docId are just the neighbors of docId
      const neighbors = graph.get(docId)!;
      for (const neighbor of neighbors) {
        const neighborOutDegree = graph.get(neighbor)!.length;
        if (neighborOutDegree > 0) {
          incomingScore += pr.get(neighbor)! / neighborOutDegree;
        }
      }

      const score = baseScore + dampingFactor * incomingScore;
      newPr.set(docId, score);

      diff += Math.abs(score - pr.get(docId)!);
    }

    pr = newPr;

    // Check for convergence
    if (diff < 0.0001) {
      break; 
    }
  }

  // 5. Normalize ranks so the max rank is 1.0 (to make it easier to combine with cosine sim)
  let maxRank = 0;
  for (const score of pr.values()) {
    if (score > maxRank) maxRank = score;
  }

  if (maxRank > 0) {
    for (const [id, score] of pr.entries()) {
      pr.set(id, score / maxRank);
    }
  }

  return pr;
}

/**
 * Re-ranks a list of retrieved results using their PageRank scores.
 * 
 * Formula: final_score = baseScore * (1 + alpha * pageRankScore)
 * 
 * @param results The retrieved results containing an ID and a base score
 * @param pageRankScores The computed PageRank scores mapping
 * @param alpha The weight of the PageRank (0 = ignore PR, 1 = heavy PR influence)
 * @returns Re-ranked and sorted sorted results
 */
export function applyPageRank<T extends { docId: number; [key: string]: any }>(
  results: T[],
  baseScoreKey: keyof T,
  pageRankScores: Map<number, number>,
  alpha = 0.5
): T[] {
  const ranked = results.map(item => {
    const baseScore = item[baseScoreKey] as number;
    const prScore = pageRankScores.get(item.docId) || 0;
    
    // Combining original algorithm score with structural/authority PageRank score
    const finalScore = baseScore * (1 + alpha * prScore);
    
    return {
      ...item,
      [baseScoreKey]: finalScore, // Override the score for sorting
      originalScore: baseScore,
      pageRankScore: prScore
    };
  });

  // Sort descending by the newly computed final score
  return ranked.sort((a, b) => (b[baseScoreKey] as number) - (a[baseScoreKey] as number));
}
