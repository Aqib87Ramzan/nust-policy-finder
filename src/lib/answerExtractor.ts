import { preprocessText } from "@/lib/textPreprocessing";

function normalizeSentence(sentence: string): string {
  return sentence
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/^[•\-\d.)\s]+/, "")
    .trim();
}

function ensureSentenceEnding(sentence: string): string {
  return /[.!?]$/.test(sentence) ? sentence : `${sentence}.`;
}

function sentenceOverlap(a: string, b: string): number {
  const aTokens = new Set(preprocessText(a));
  const bTokens = preprocessText(b);

  if (aTokens.size === 0 || bTokens.length === 0) {
    return 0;
  }

  const shared = bTokens.filter((token) => aTokens.has(token)).length;
  return shared / Math.max(Math.min(aTokens.size, bTokens.length), 1);
}

/**
 * Intelligent answer extraction focusing on requirement-based queries
 * Structures information as: "Policy: ... Details: ... Examples/Numbers: ..."
 */
export function extractAnswer(
  query: string,
  chunks: any[]
): string {
  if (chunks.length === 0) {
    return "";
  }

  const queryWords = preprocessText(query);
  if (queryWords.length === 0) {
    return "";
  }

  // Keywords that indicate policy requirements/rules
  const policyIndicators = ['minimum', 'maximum', 'must', 'should', 'required', 'cannot', 'shall', 'will be', 'eligible', 'attendance', 'grade', 'cgpa', 'gpa', 'pass', 'fail', 'repeat', 'withdraw', 'credit', 'semester'];
  
  // Parse all chunks into structured sections
  const allSentences: { sentence: string; score: number; chunkId: number; isPolicyStatement: boolean }[] = [];

  chunks.forEach((chunk) => {
    const sentences = chunk.text
      .replace(/(\d)\.(\d)/g, "$1__DECIMAL__$2")
      .split(/[.!?]+/)
      .map((s: string) => s.replace(/__DECIMAL__/g, "."))
      .map(normalizeSentence)
      .filter((s: string) => s.length > 15);

    sentences.forEach((sentence: string) => {
      const sentLower = sentence.toLowerCase();
      const sentenceTokens = preprocessText(sentence);

      if (sentenceTokens.length === 0) {
        return;
      }

      let score = 0;
      let matchCount = 0;

      // Query word matching (core relevance)
      queryWords.forEach((word) => {
        if (sentenceTokens.includes(word) || sentLower.includes(word)) {
          matchCount += 1;
          score += 4;
        }
      });

      if (matchCount === 0) {
        return;
      }

      // Calculate query coverage - how much of the query is answered
      const coverage = matchCount / queryWords.length;
      score += coverage * 10;

      // Reward policy-specific language
      const isPolicyStatement = policyIndicators.some((indicator) => sentLower.includes(indicator));
      if (isPolicyStatement) score += 6;

      // Reward numeric data (numbers, percentages, decimals)
      const hasNumbers = /\d+(\.\d+)?/.test(sentence);
      const hasPercentage = /\d+\s*%/.test(sentence);
      if (hasNumbers) score += 3;
      if (hasPercentage) score += 4;

      // Penalize overly conditional/uncertain language
      const uncertainWords = sentLower.match(/(may|might|could|possibly|likely)/g) || [];
      if (uncertainWords.length > 1) score -= 2;

      // Reward sentences with specific details
      if (sentence.length > 80) score += 2;

      if (score >= 8) {
        allSentences.push({
          sentence: ensureSentenceEnding(sentence),
          score,
          chunkId: chunk.id,
          isPolicyStatement
        });
      }
    });
  });

  if (allSentences.length === 0) {
    // Fallback: return any matching sentence
    const fallbackSentence = chunks
      .flatMap((chunk) =>
        chunk.text
          .replace(/(\d)\.(\d)/g, "$1__DECIMAL__$2")
          .split(/[.!?]+/)
          .map((s: string) => s.replace(/__DECIMAL__/g, "."))
          .map(normalizeSentence)
      )
      .find((sentence: string) => preprocessText(sentence).some((token) => queryWords.includes(token)));

    return fallbackSentence ? ensureSentenceEnding(fallbackSentence) : "";
  }

  // Sort by score and importance
  allSentences.sort((a, b) => {
    if (b.isPolicyStatement !== a.isPolicyStatement) {
      return b.isPolicyStatement ? 1 : -1;
    }
    return b.score - a.score;
  });

  // Collect top sentences while avoiding duplicates
  const selectedAnswers: string[] = [];

  for (const candidate of allSentences) {
    if (selectedAnswers.some((existing) => sentenceOverlap(existing, candidate.sentence) >= 0.7)) {
      continue;
    }

    selectedAnswers.push(candidate.sentence);

    if (selectedAnswers.length === 2) {
      break;
    }
  }

  return selectedAnswers.join("\n");
}

/**
 * Generate structured context for LLM from retrieved chunks
 * Organizes chunks by relevance and extracts key facts
 */
export function generateLLMContext(chunks: any[], query: string): string {
  if (chunks.length === 0) return "";

  let context = "AVAILABLE POLICY INFORMATION:\n\n";

  chunks.forEach((chunk, idx) => {
    context += `[Reference ${idx + 1}]\n`;
    context += `Section: ${chunk.chapter}\n`;
    context += `From: ${chunk.source}\n`;
    context += `Content: ${chunk.text.substring(0, 300)}...\n\n`;
  });

  return context;
}

// Helper function to get query words for highlighting
export function getQueryWords(query: string): string[] {
  return preprocessText(query);
}

// Helper to find positions of query words in text
export interface Highlight {
  start: number
  end: number
}

export function getHighlightPositions(text: string, queryWords: string[]): Highlight[] {
  if (queryWords.length === 0) return []

  const textLower = text.toLowerCase()
  const matches: Highlight[] = []

  queryWords.forEach(word => {
    let index = 0
    while ((index = textLower.indexOf(word, index)) !== -1) {
      matches.push({ start: index, end: index + word.length })
      index += word.length
    }
  })

  if (matches.length === 0) return []

  // Sort matches and remove overlaps
  matches.sort((a, b) => a.start - b.start)
  const nonOverlapping: Highlight[] = []

  matches.forEach(match => {
    if (nonOverlapping.length === 0 || nonOverlapping[nonOverlapping.length - 1].end <= match.start) {
      nonOverlapping.push(match)
    }
  })

  return nonOverlapping
}
