/**
 * Answer extraction using Google Gemini API
 * Structured prompting: ONLY uses information from retrieved chunks
 * Returns answers with clear organization and no hallucinations
 */

const GEMINI_API_KEY = "AIzaSyCPBZ0dtNi2rkVY5IBg92R3ROl3VX7F_bg";
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

export interface GeminiAnswerResult {
  answer: string;
  supportingChunks: any[];
  sources: string[];
}

/**
 * Build structured context from chunks with clear markers
 * Only the information in these chunks is allowed in the answer
 */
function buildStructuredContext(chunks: any[]): string {
  if (chunks.length === 0) return "NO INFORMATION AVAILABLE";

  let context = "POLICY INFORMATION FROM NUST HANDBOOK:\n";
  context += "=" .repeat(50) + "\n\n";

  chunks.forEach((chunk, idx) => {
    context += `[SOURCE ${idx + 1}]\n`;
    context += `Section: ${chunk.chapter}\n`;
    context += `Page: ${chunk.page}\n`;
    context += `---\n`;
    context += `${chunk.text}\n`;
    context += `---\n\n`;
  });

  return context;
}

export async function extractAnswerWithGemini(
  query: string,
  chunks: any[]
): Promise<GeminiAnswerResult | null> {
  if (chunks.length === 0) {
    return null;
  }

  try {
    // Use top 5 chunks as the only source of truth
    const supportingChunks = chunks.slice(0, 5);
    const context = buildStructuredContext(supportingChunks);

    // Structured prompt: very explicit about constraints
    const prompt = `You are answering a question about NUST academic policies. You MUST ONLY use information from the provided handbook excerpts below. Do not use any external knowledge.

${context}

USER'S QUESTION: "${query}"

YOUR TASK:
1. Extract the answer ONLY from the provided information above
2. Structure your answer clearly:
   - Start with a direct, concise answer
   - Include specific numbers, percentages, or requirements if mentioned
   - List multiple points if applicable (use bullet format)
   - Cite which SOURCE (1, 2, 3, etc.) supports each point
3. If information is not in the provided excerpts, respond: "This information is not found in the provided handbook excerpts."
4. Keep the answer factual and objective
5. Maximum 3-4 sentences or bullet points

ANSWER:`;

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
        generationConfig: {
          maxOutputTokens: 400,
          temperature: 0.2, // Very low temperature for strict factual answers
        },
      }),
    });

    if (!response.ok) {
      console.warn("Gemini API error:", response.status);
      return null;
    }

    const data = await response.json();

    if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
      const answer = data.candidates[0].content.parts[0].text.trim();

      // Validate: answer should be substantial and not be an error
      if (answer && answer.length > 15 && !answer.toLowerCase().includes("api error")) {
        // Extract source references from answer
        const sourceMatches = answer.match(/SOURCE\s+(\d+)/gi) || [];
        const sourcesSet = new Set(sourceMatches.map((m: string) => m.toUpperCase()));
        const sources = Array.from(sourcesSet) as string[];

        return {
          answer,
          supportingChunks,
          sources
        };
      }
    }

    return null;
  } catch (error) {
    console.error("Gemini extraction error:", error);
    return null;
  }
}
