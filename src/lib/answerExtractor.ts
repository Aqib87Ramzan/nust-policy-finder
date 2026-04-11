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
    // For PG queries, prioritize PG Handbook
    return [...pgChunks, ...ugChunks];
  } else {
    // For general queries, show UG first then PG
    return [...ugChunks, ...pgChunks];
  }
}

export function extractAnswer(
  query: string, 
  chunks: any[]
): string {
  
  if (chunks.length === 0) {
    return "No relevant information found in the handbook."
  }

  const queryLower = query.toLowerCase()
  const queryWords = queryLower
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2)

  // Keywords that indicate a direct policy statement/requirement
  const requirementIndicators = ['minimum', 'maximum', 'must', 'should', 'required', 'is a', 'is the', 'at least', 'no more than', 'cannot exceed', 'shall be', 'will be', 'are'];
  
  // Words that indicate tangential/side notes (not direct answers)
  const tangentialIndicators = ['transferred', 'unless', 'except', 'however', 'but', 'in case', 'if', 'provided that', 'as per', 'such as'];

  // Split all chunks into individual sentences
  const allSentences: {sentence: string, score: number, source: string, chapter: string, page: number}[] = []
  
  chunks.forEach(chunk => {
    // Split sentences, but don't break on decimal points (e.g., 3.50)
    let sentences = chunk.text
      .replace(/(\d)\.(\d)/g, '$1__DECIMAL__$2') // Temporarily replace decimal points
      .split(/[.!?]+/)
      .map((s: string) => s.trim())
      .map(s => s.replace(/__DECIMAL__/g, '.')) // Restore decimal points
      .filter((s: string) => s.length > 20)
    
    sentences.forEach((sentence: string) => {
      const sentLower = sentence.toLowerCase()
      
      // Skip sentences that are clearly not direct answers
      const isTangential = tangentialIndicators.some(indicator => 
        sentLower.includes(indicator) && !sentLower.startsWith(indicator)
      );
      
      if (isTangential) return; // Skip this sentence
      
      // Check if sentence has requirement indicator
      const hasRequirementIndicator = requirementIndicators.some(indicator => 
        sentLower.includes(indicator)
      );
      
      // Score each sentence against query words
      let score = 0
      
      // Base score: must match query words
      let matchCount = 0;
      queryWords.forEach(word => {
        if (sentLower.includes(word)) {
          matchCount++;
          score += 1
          // Bonus for exact important terms
          if (word === 'gpa' || word === 'cgpa') score += 5
          if (word === 'phd') score += 5
          if (word === 'minimum') score += 4
          if (word === 'attendance') score += 4
          if (word === 'maximum') score += 3
          if (word === 'fail' || word === 'failure') score += 3
          if (word === 'repeat') score += 3
          if (word === 'grade') score += 2
          if (word === 'semester') score += 1
          if (word === 'withdraw') score += 3
          if (word === 'probation') score += 3
          if (word === 'suspension') score += 3
          if (word === 'thesis') score += 3
          if (word === 'hostel') score += 3
          if (word === 'curfew') score += 4
          if (word === 'fee') score += 2
          if (word === 'scholarship') score += 2
          if (word === 'publication') score += 3
          if (word === 'master') score += 3
        }
      })
      
      // Must match at least 50% of query words to be considered
      if (matchCount < Math.ceil(queryWords.length * 0.4)) {
        score = 0; // Disqualify
      }
      
      // Bonus if sentence contains requirement indicator (direct statement)
      if (hasRequirementIndicator) score += 5
      
      // Heavy penalty if sentence mentions conditionals/exceptions
      const conditionalCount = (sentLower.match(/(unless|except|provided|if|however|but)/g) || []).length;
      if (conditionalCount > 1) score -= 10;
      
      // Bonus if sentence contains numbers/percentages (concrete requirement)
      if (/\d+/.test(sentence)) score += 2
      if (/%/.test(sentence)) score += 3
      if (/\d+\.\d+/.test(sentence)) score += 4  // Higher boost for decimal requirements (e.g., 3.50)
      
      // Boost if sentence contains both CGPA/GPA and degree type (specific degree requirement)
      if ((sentLower.includes('cgpa') || sentLower.includes('gpa')) && /\b(phd|ph\.d|master|ms |bs|mba)\b/i.test(sentence)) {
        score += 8; // High boost for degree-specific numeric requirements
      }
      
      // Only include high-confidence answers (score >= 3)
      if (score >= 3) {
        allSentences.push({
          sentence,
          score,
          source: chunk.source,
          chapter: chunk.chapter,
          page: chunk.page
        })
      }
    })
  })

  if (allSentences.length === 0) {
    return "No specific answer found. Please check the retrieved chunks below."
  }

  // Sort by score and get top 3 sentences
  allSentences.sort((a, b) => b.score - a.score)
  const topSentences = allSentences.slice(0, 3)

  // Build answer from top sentences
  const answerLines = topSentences.map((s, i) => 
    `${i + 1}. ${s.sentence.trim()}. (${s.chapter}, Page ${s.page})`
  )

  return answerLines.join('\n\n')
}

// Helper function to get query words for highlighting
export function getQueryWords(query: string): string[] {
  const queryLower = query.toLowerCase()
  return queryLower
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2)
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
