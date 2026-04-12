import { preprocessText } from "@/lib/textPreprocessing";

// Detect if query is about postgraduate/master's studies
export function isPostgraduateQuery(query: string): boolean {
  const pgKeywords = ['master', 'masters', 'ms ', ' ms', 'phd', 'postgraduate', 'post-graduate', 'pg ', ' pg', 'mba', 'thesis', 'dissertation', 'graduate degree'];
  const queryLower = query.toLowerCase();
  return pgKeywords.some(keyword => queryLower.includes(keyword));
}

// Filter results based on query type
export function filterChunksByQueryType(chunks: any[], query: string): any[] {
  const isPG = isPostgraduateQuery(query);

  // Separate chunks by source
  const pgChunks = chunks.filter(c => c.source === 'PG Handbook');
  const ugChunks = chunks.filter(c => c.source === 'UG Handbook');

  // Return relevant chunks first
  if (isPG) {
    return [...pgChunks, ...ugChunks];
  }

  return [...ugChunks, ...pgChunks];
}

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

  const requirementIndicators = ['minimum', 'maximum', 'must', 'should', 'required', 'at least', 'no more than', 'cannot exceed', 'shall be', 'will be', 'eligible', 'repeat', 'attendance', 'withdraw', 'publication', 'curfew'];
  const tangentialIndicators = ['transferred', 'unless', 'except', 'however', 'provided that', 'as per', 'such as'];
  const allSentences: { sentence: string; score: number }[] = [];

  chunks.forEach((chunk) => {
    const sentences = chunk.text
      .replace(/(\d)\.(\d)/g, "$1__DECIMAL__$2")
      .split(/[.!?]+/)
      .map((s: string) => s.replace(/__DECIMAL__/g, "."))
      .map(normalizeSentence)
      .filter((s: string) => s.length > 20);

    sentences.forEach((sentence: string) => {
      const sentLower = sentence.toLowerCase();
      const sentenceTokens = preprocessText(sentence);

      if (sentenceTokens.length === 0) {
        return;
      }

      const isTangential = tangentialIndicators.some((indicator) =>
        sentLower.includes(indicator) && !sentLower.startsWith(indicator)
      );

      if (isTangential) {
        return;
      }

      let score = 0;
      let matchCount = 0;

      queryWords.forEach((word) => {
        if (sentenceTokens.includes(word) || sentLower.includes(word)) {
          matchCount += 1;
          score += 3;

          if (['gpa', 'cgpa', 'phd', 'attendance', 'withdrawal', 'repeat', 'repeated', 'publication', 'hostel', 'curfew'].includes(word)) {
            score += 3;
          }

          if (['minimum', 'maximum', 'requirements', 'requirement', 'policy', 'conditions'].includes(word)) {
            score += 2;
          }
        }
      });

      if (matchCount === 0) {
        return;
      }

      const coverage = matchCount / queryWords.length;
      score += coverage * 8;

      if (requirementIndicators.some((indicator) => sentLower.includes(indicator))) score += 3;
      if (/\d/.test(sentence)) score += 2;
      if (/%/.test(sentence)) score += 2;
      if (/\d+\.\d+/.test(sentence)) score += 3;

      const conditionalCount = (sentLower.match(/(unless|except|provided|if|however|but)/g) || []).length;
      if (conditionalCount > 1) score -= 4;

      if (score >= 5) {
        allSentences.push({
          sentence: ensureSentenceEnding(sentence),
          score,
        });
      }
    });
  });

  if (allSentences.length === 0) {
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

  allSentences.sort((a, b) => b.score - a.score);

  const conciseAnswers: string[] = [];

  for (const candidate of allSentences) {
    if (conciseAnswers.some((existing) => sentenceOverlap(existing, candidate.sentence) >= 0.75)) {
      continue;
    }

    conciseAnswers.push(candidate.sentence);

    if (conciseAnswers.length === 2) {
      break;
    }
  }

  return conciseAnswers.join("\n");
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
