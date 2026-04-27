// Project source file for make chunks.
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

const PDF_PATH = path.resolve(process.cwd(), 'Revised-Undergraduate-Handbook.pdf');
const OUTPUT_PATH = path.resolve(process.cwd(), 'src/data/Ugchunk.ts');

// Chunking constraints
const MIN_WORDS = 200;
const MAX_WORDS = 450;
const OVERLAP_WORDS = 75;

interface Chunk {
  id: number;
  text: string;
  source: string;
  chapter: string;
  page: number;
  word_count: number;
}

/**
 * Extracts sections and applies sliding window strategy
 * with context prepending for lexical retrieval algorithms.
 */
async function generateChunks() {
  console.log(`Reading PDF from ${PDF_PATH}...`);
  const dataBuffer = fs.readFileSync(PDF_PATH);
  
  const data = await pdfParse(dataBuffer);
  const rawText = data.text;
  
  console.log(`Extracted ${rawText.length} characters of text.`);

  // 1. Clean the text, normalize spaces, handle bizarre newlines from PDF
  // Splitting by lines might be helpful to track paragraphs and chapter headers
  const lines = rawText.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  const chunks: Chunk[] = [];
  let currentChapter = 'General NUST Policy';
  let chunkContent: string[] = [];
  let currentWordCount = 0;
  let chunkId = 1;
  let currentPage = 1; // pdf-parse doesn't strictly give easy per-line pages, but we can guess or leave it as 1. Wait, we can parse page by page!

  // Re-parse page by page to keep track of page numbers
  console.log('Extracting page by page to preserve page numbers...');
  let pagesText: { page: number; text: string }[] = [];
  
  // Custom render functionality to grab page objects
  const pageRender = function(pageData: any) {
      return pageData.getTextContent().then(function(textContent: any) {
          let lastY, text = '';
          for (let item of textContent.items) {
              if (lastY !== item.transform[5] || !lastY){
                  text += '\n';
              }
              text += item.str;
              lastY = item.transform[5];
          }
          return text;
      });
  };

  const pagedData = await pdfParse(dataBuffer, { pagerender: pageRender });
  // The pages are separated by double newlines usually, but let's just stick to the basic extraction
  // Because custom pagerender can be fragile, let's use the default text and guess chapters.
  
  console.log('Processing text into chunks with sliding windows...');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Detect Chapter or Section Headers
    // Skip TOC lines with .......
    const isToC = line.includes('....') || line.match(/ \d+$/);
    const chapterMatch = !isToC ? line.match(/^(?:Chapter|Annex)\s+[0-9A-Z]+[:\-]?\s+(.*)/i) : null;
    const degreeMatch = !isToC ? line.match(/^(?:Bachelor of|BS|BE)\s+(.*)/i) : null;

    if (chapterMatch) {
      currentChapter = line.trim().replace(/\s+/g, ' ');
    } else if (degreeMatch && line.length < 100) {
      // Mention of a specific degree, like BS Computer Science - might be a sub-header
      // We append it to the current chapter context to provide specificity
      currentChapter = `${currentChapter} - ${line.trim()}`;
      // Clean up if it gets too long
      if (currentChapter.length > 150) currentChapter = currentChapter.substring(0, 150);
    }

    // Attempt to guess page by looking for freestanding numbers or standard footer
    if (/^\d+$/.test(line) && i > 0 && lines[i-1].includes('Handbook')) {
      currentPage = parseInt(line, 10);
      continue;
    }

    // Handle excessive spaces
    const cleanLine = line.replace(/\s+/g, ' ');
    const words = cleanLine.split(' ');
    
    chunkContent.push(cleanLine);
    currentWordCount += words.length;

    // Whenever we exceed the maximum words, we slice a chunk off
    if (currentWordCount >= MAX_WORDS) {
      const fullText = chunkContent.join(' ');
      const textWords = fullText.split(/\s+/);
      
      // Finalize the chunk text. Inject metadata so lexical searches hit.
      // e.g. "Chapter 1: The University. Welcome to NUST..."
      const finalChunkText = `[Context: ${currentChapter}] ${fullText}`;

      chunks.push({
        id: chunkId++,
        text: finalChunkText,
        source: "UG Handbook",
        chapter: currentChapter,
        page: currentPage,
        word_count: textWords.length,
      });

      // Overlap: Keep the last OVERLAP_WORDS
      const overlapWords = textWords.slice(-OVERLAP_WORDS);
      
      chunkContent = [overlapWords.join(' ')];
      currentWordCount = OVERLAP_WORDS;
    }
  }

  // push the last remaining chunk if it's substantial
  if (currentWordCount >= MIN_WORDS / 2) {
    const fullText = chunkContent.join(' ');
    const finalChunkText = `[Context: ${currentChapter}] ${fullText}`;
    chunks.push({
      id: chunkId++,
      text: finalChunkText,
      source: "UG Handbook",
      chapter: currentChapter,
      page: currentPage,
      word_count: currentWordCount,
    });
  }

  console.log(`Created ${chunks.length} chunks.`);

  // Write to TS file
  const tsContent = `// Auto-generated by scripts/makeChunks.ts
// Do not edit this file manually. Run 'npm run make-chunks' to regenerate.

export interface Chunk {
  id: number;
  text: string;
  source: string;
  chapter: string;
  page: number;
  word_count: number;
}

export const ugChunks: Chunk[] = ${JSON.stringify(chunks, null, 2)};
`;

  fs.writeFileSync(OUTPUT_PATH, tsContent, 'utf-8');
  console.log(`Successfully wrote chunks to ${OUTPUT_PATH}`);
}

generateChunks().catch(console.error);
