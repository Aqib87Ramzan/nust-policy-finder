/**
 * Answer extraction using Groq API and Llama 3 model
 * Structured prompting: ONLY uses information from retrieved chunks
 * Returns answers with clear organization and no hallucinations
 */

// Use the Vite environment variable VITE_GROQ_API_KEY
// Trim to remove any accidental whitespace from the .env file
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
export interface GroqAnswerResult {
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
  context += "=".repeat(50) + "\n\n";

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

export async function extractAnswerWithGroq(
  query: string,
  chunks: any[]
): Promise<GroqAnswerResult | null> {
  
  // Check if API key is clearly a placeholder or missing
  if (!GROQ_API_KEY || GROQ_API_KEY.includes("your_actual_groq_api_key_here")) {
    return {
      answer: "⚠️ **LLM Configuration Error:** Please update `VITE_GROQ_API_KEY` in your `.env` file with a valid Groq API key instead of the placeholder. (Restart the server after updating).",
      supportingChunks: [],
      sources: []
    };
  }

  if (chunks.length === 0) {
    return null;
  }

  try {
    // Use top 5 chunks as the only source of truth
    const supportingChunks = chunks.slice(0, 5);
    const context = buildStructuredContext(supportingChunks);

    // Structured prompt: very explicit about constraints
    const systemPrompt = `You are a helpful, factual assistant answering questions about NUST academic policies. 
You MUST ONLY use information from the provided handbook excerpts. Do not use any external knowledge.

YOUR TASK:
1. Extract the answer ONLY from the provided information
2. Structure your answer clearly:
   - Start with a direct, concise answer
   - Include specific numbers, percentages, or requirements if mentioned
   - List multiple points if applicable (use bullet format)
   - Cite which SOURCE [e.g. (Source 1), (Source 2)] supports each point
3. If information is not in the provided excerpts, respond clearly: "This information is not found in the provided handbook excerpts."
4. Keep the answer factual and objective
5. Maximum 3-4 sentences or bullet points`;

    const userPrompt = `${context}

USER'S QUESTION: "${query}"

ANSWER:`;

    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile", // Or llama-3.1-8b-instant
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.2, // Very low temperature for strict factual answers
        max_tokens: 400,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText);
      console.warn("Groq API error:", response.status, errorText);
      return {
        answer: `⚠️ **LLM Error (${response.status}):** AI generation failed. This usually means the API key is unauthorized or quota is exceeded. \n\n*Error details: ${errorText}*`,
        supportingChunks: supportingChunks,
        sources: []
      };
    }

    const data = await response.json();
    
    const answer = data.choices?.[0]?.message?.content?.trim();

    // Validate: answer should be substantial and not be an error
    if (answer && answer.length > 15) {
      // Extract source references from answer: e.g. "Source 1", "[SOURCE 2]"
      const sourceMatches = answer.match(/SOURCE\s+(\d+)/gi) || [];
      const sourcesSet = new Set(sourceMatches.map((m: string) => m.toUpperCase()));
      const sources = Array.from(sourcesSet) as string[];

      return {
        answer,
        supportingChunks,
        sources
      };
    }

    return null;
  } catch (error: any) {
    console.error("Groq extraction error:", error);
    return {
      answer: `⚠️ **Network Error:** Failed to call Groq API. Make sure your internet connection allows access and your VITE_GROQ_API_KEY is correct.\n\n*${error.message}*`,
      supportingChunks: [],
      sources: []
    };
  }
}
