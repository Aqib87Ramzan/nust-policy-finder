// Project source file for recommendation.
import { preprocessText } from './textPreprocessing';

export interface Document {
  id: number;
  text: string;
}

/**
 * Recommendations / Content-Based Relevance Re-ranking
 * 
 * Re-ranks retrieved chunks based on exact query term proximity,
 * exact phrase matches, and dense keyword clustering to ensure the 
 * top-k results fed to the LLM are highly contextual.
 * 
 * @param query The user's original query
 * @param candidates The Top-N retrieved chunks
 * @param docs The full document collection
 * @param baseScoreKey The key in the candidate object holding its initial retrieval score
 * @param topK The number of final results to return
 */
export function recommendChunks<T extends { docId: number; [key: string]: any }>(
  query: string,
  candidates: T[],
  docs: Document[],
  baseScoreKey: keyof T,
  topK: number,
  alpha = 0.5
): T[] {
  if (candidates.length === 0) return [];

  const queryTerms = preprocessText(query);
  const rawQueryLower = query.toLowerCase();

  const rankedCandidates = candidates.map(candidate => {
    const doc = docs.find(d => d.id === candidate.docId);
    if (!doc) return { ...candidate, recommendationScore: 0 };

    const rawTextLower = doc.text.toLowerCase();
    let recommendationScore = 0;

    // 1. Exact Phrase Match (Highest signal of relevance)
    if (rawTextLower.includes(rawQueryLower)) {
      recommendationScore += 2.0;
    }

    // 2. Query Term Density / Proximity
    // Find how close the query terms are to each other in the document
    const termPositions: number[] = [];
    queryTerms.forEach(term => {
      let pos = rawTextLower.indexOf(term);
      while (pos !== -1) {
        termPositions.push(pos);
        pos = rawTextLower.indexOf(term, pos + term.length);
      }
    });

    termPositions.sort((a, b) => a - b);
    
    // Reward clusters of query terms (terms appearing within 50 characters of each other)
    let clusterScore = 0;
    for (let i = 0; i < termPositions.length - 1; i++) {
      const distance = termPositions[i + 1] - termPositions[i];
      if (distance < 50 && distance > 0) {
        clusterScore += 0.5; // High reward for close terms
      } else if (distance < 150 && distance > 0) {
        clusterScore += 0.2; // Medium reward for terms in same sentence/paragraph
      }
    }
    
    // Cap the cluster score to avoid excessive inflation
    recommendationScore += Math.min(clusterScore, 3.0);

    // 3. Normalized Term Coverage (What percentage of query words are present?)
    const uniqueTermsFound = queryTerms.filter(t => rawTextLower.includes(t)).length;
    const coverage = queryTerms.length > 0 ? (uniqueTermsFound / queryTerms.length) : 0;
    recommendationScore += coverage * 1.5;

    // Calculate final fused score
    const baseScore = candidate[baseScoreKey] as number;
    const finalScore = baseScore * (1 + (alpha * recommendationScore));

    return {
      ...candidate,
      [baseScoreKey]: finalScore,     // Override the primary score field to force sort order
      originalScore: baseScore,
      recommendationScore
    };
  });

  // Sort descending by the new combined score and slice to topK
  return rankedCandidates
    .sort((a, b) => (b[baseScoreKey] as number) - (a[baseScoreKey] as number))
    .slice(0, topK);
}
