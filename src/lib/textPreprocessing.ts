/**
 * Shared text preprocessing: tokenization with stopword removal.
 */

const STOPWORDS = new Set([
  'the','a','an','is','are','was','were','be','been',
  'being','have','has','had','do','does','did','will',
  'would','could','should','may','might','shall','to',
  'of','in','for','on','with','at','by','from','as',
  'into','through','during','before','after','above',
  'below','between','each','or','and','but','if','while',
  'that','this','these','those','it','its','we','our',
  'they','their','he','she','his','her','you','your',
  'i','me','my','us','them','who','which','what','when',
  'where','how','all','both','few','more','most','other',
  'some','such','no','not','only','same','so','than',
  'too','very','just','any','also','s','can','per',
  'must','shall','said','however','therefore','thus',
]);

/** Lowercase, remove punctuation, split, drop stopwords & short tokens */
export function preprocessText(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !STOPWORDS.has(word));
}

/** Term frequency map (normalized by doc length) */
export function computeTermFrequency(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>();
  for (const t of tokens) {
    tf.set(t, (tf.get(t) || 0) + 1);
  }
  for (const [term, count] of tf) {
    tf.set(term, count / tokens.length);
  }
  return tf;
}
