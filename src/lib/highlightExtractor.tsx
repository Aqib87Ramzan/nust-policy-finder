// Project source file for highlight extractor.
import React from 'react';
import { getHighlightPositions } from './answerExtractor';

interface HighlightedTextProps {
  text: string;
  queryWords: string[];
}

export const HighlightedText: React.FC<HighlightedTextProps> = ({ text, queryWords }) => {
  if (queryWords.length === 0) {
    return <>{text}</>;
  }

  const highlights = getHighlightPositions(text, queryWords);

  if (highlights.length === 0) {
    return <>{text}</>;
  }

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;

  highlights.forEach((highlight, idx) => {
    if (highlight.start > lastIndex) {
      parts.push(text.substring(lastIndex, highlight.start));
    }
    parts.push(
      <span key={idx} className="bg-yellow-200 font-semibold">
        {text.substring(highlight.start, highlight.end)}
      </span>
    );
    lastIndex = highlight.end;
  });

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return <>{parts}</>;
};
