// Hybrid answer extraction using Google Gemini API
// Falls back to local algorithm if API fails

const GEMINI_API_KEY = "AIzaSyCPBZ0dtNi2rkVY5IBg92R3ROl3VX7F_bg";
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

export interface GeminiAnswerResult {
  answer: string;
  supportingChunks: any[];
}

export async function extractAnswerWithGemini(
  query: string,
  chunks: any[]
): Promise<GeminiAnswerResult | null> {
  if (chunks.length === 0) {
    return null;
  }

  try {
    // Keep top 5 chunks for supporting evidence
    const supportingChunks = chunks.slice(0, 5);
    
    // Prepare context from top chunks to send to Gemini
    const context = supportingChunks
      .map(
        (c, i) =>
          `[Source ${i + 1}: ${c.source} - ${c.chapter}, Page ${c.page}]\n${c.text}`
      )
      .join("\n\n");

    // Create prompt for Gemini
    const prompt = `You are an expert in university academic policies and regulations. Your job is to answer questions based on the handbook excerpts below.

HANDBOOK EXCERPTS:
${context}

USER QUESTION: ${query}

INSTRUCTIONS:
1. Read the handbook excerpts carefully
2. Find the most relevant information that answers the user's question
3. Provide a CLEAR, DIRECT answer - no long explanations
4. Include specific values (e.g., "3.50 CGPA", "10pm", "75%") if mentioned
5. Keep answer to 2-3 sentences maximum
6. If the answer involves multiple points, list them clearly
7. Do NOT make up information - only use what's in the excerpts
8. If the exact answer is not in the excerpts, say "Information not found in handbook"

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
          maxOutputTokens: 500,
          temperature: 0.3, // Low temperature for factual answers
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
      
      // Validate that we got a real answer (not an error message)
      if (answer && answer.length > 10 && !answer.toLowerCase().includes("cannot")) {
        return {
          answer,
          supportingChunks // Return chunks as evidence
        };
      }
    }

    return null;
  } catch (error) {
    console.error("Gemini extraction error:", error);
    return null;
  }
}
