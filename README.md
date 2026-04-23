# NUST Academic Policy QA System 🎓

An advanced, high-performance Question Answering (QA) system specifically designed for navigating and querying the **NUST Academic Policy Handbook**. This project leverages state-of-the-art **Information Retrieval (IR)** techniques combined with **Large Language Models (LLM)** via the Groq API to provide accurate, factual, and hallucination-free answers based *strictly* on official policy excerpts.

---

## 🌟 Key Features

*   **Multi-Algorithmic Retrieval Engine**: Compare and test various indexing and retrieval algorithms in real-time, including TF-IDF, MinHash, Locality Sensitive Hashing (LSH), and SimHash.
*   **Intelligent Synthesized Answers**: Integrates with **Groq (Llama-3.3-70b-versatile)** to synthesize direct, conversational answers from the retrieved policy chunks.
*   **Strict Factuality (No Hallucinations)**: The LLM is strictly constrained to answer queries using *only* the retrieved context chunks. If the answer isn't in the handbook, it will explicitly state so.
*   **Real-time Performance Metrics**: View extraction times, candidate counts, and comparative statistics between different retrieval methods directly in the UI.
*   **Intuitive UI**: Built with React, Vite, and Tailwind CSS, providing a modern, fast, and accessible user experience.

---

## 🔍 Retrieval Algorithms Explained

This project is built around exploring different methods of fetching the most relevant documents for a user's query. The platform supports toggling between 4 distinct retrieval methodologies:

1.  **TF-IDF (Exact Match)**
    *   **How it works**: Evaluates how important a word is to a document within a collection or corpus. Rare words across the corpus that appear frequently in a specific document get a high score.
    *   **Pros**: High precision for exact keyword matches.
    *   **Cons**: Slower on massive datasets, struggles with synonyms or paraphrasing.

2.  **MinHash (Standalone)**
    *   **How it works**: A probabilistic data structure used to quickly estimate the Jaccard similarity between two sets (in this case, tokenized text shingles). 
    *   **Pros**: Highly efficient for comparing document overlap; much smaller memory footprint than full token sets.

3.  **MinHash + LSH (Approximate Nearest Neighbors)**
    *   **How it works**: Locality-Sensitive Hashing groups similar items into "buckets." Instead of comparing a query against *every* document in the database, it hashes the query and only compares it against documents in the same bucket.
    *   **Pros**: **Blazing fast.** Enables near-instant retrieval on massive datasets (sub-millisecond search times) with only a minor accuracy tradeoff.

4.  **SimHash**
    *   **How it works**: Computes a single hash value for a document such that similar documents have similar hashes (low Hamming distance).
    *   **Pros**: Excellent for near-duplicate detection and fast bitwise comparisons.

---

## ⚙️ Tech Stack

*   **Frontend Framework:** React 18, Vite, TypeScript
*   **Styling:** Tailwind CSS, shadcn/ui components (Radix UI primitives)
*   **Routing:** React Router DOM
*   **AI/LLM Inference:** [Groq API](https://groq.com/) (Llama 3 base)
*   **Icons:** Lucide React
*   **Tooling:** ESLint, PostCSS, Playwright/Vitest (for testing readiness)

---

## 🚀 Getting Started

### Prerequisites
*   **Node.js** (v18+) or **Bun** (v1+)
*   A **Groq API Key** (Get one for free at [console.groq.com](https://console.groq.com/))

### Installation

1.  **Clone the repository** (if you haven't already):
    ```bash
    git clone [https://github.com/Aqib87Ramzan/nust-policy-finder.git]
    cd nust-policy-finder
    ```

2.  **Install Dependencies**:
    Using npm:
    ```bash
    npm install
    ```
    OR using Bun:
    ```bash
    bun install
    ```

3.  **Setup Environment Variables**:
    Create a new file named `.env` in the root of the project and add your Groq API key:
    ```env
    VITE_GROQ_API_KEY=gsk_your_actual_groq_api_key_here
    ```
    *Note: The project requires standard UTF-8 encoding for the `.env` file.*

4.  **Start the Development Server**:
    ```bash
    npm run dev
    ```
    *The app will usually start at `http://localhost:8080/` (or port `5173`).*

---

## 🕹️ Usage

1.  **Ask a Question**: Type a natural language query into the main search bar (e.g., *"What is the policy for dropping a course?"* or *"How many credits for graduation?"*).
2.  **Select Retrieval Method**: Use the dropdown underneath the search bar to test out different algorithms (TF-IDF vs LSH vs SimHash).
3.  **Adjust Top-K**: Move the slider to return 1-5 most relevant chunks from the handbook.
4.  **Compare All Methods**: Click the "Compare All Methods" button to see a side-by-side breakdown of the retrieval time (ms) and matched results for each algorithm across the same query.
5.  **Read the Synthesized Answer**: Once chunks are retrieved, the Groq API will generate a concise, factual answer in the green "Answer Box," complete with source citations referencing the specific handbook chunks.

---

## 📂 Project Structure

```
nust-policy-finder/
├── src/
│   ├── components/       # Reusable UI elements (SearchBar, ResultCards, etc.)
│   │   └── ui/           # base shadcn components (buttons, badges, inputs)
│   ├── data/             # NUST Policy document chunks (Ugchunk.ts)
│   ├── hooks/            # Custom React hooks (useLSH.ts)
│   ├── lib/              # Core Logic (LSH, MinHash, TF-IDF, Groq extraction)
│   ├── pages/            # Application views (Index.tsx, Experiments.tsx)
│   └── main.tsx          # Application Entry Point
├── .env                  # Environment Variables (Ignored in Git)
├── package.json          # Node dependencies and scripts
├── tailwind.config.ts    # Tailwind utility configuration
└── vite.config.ts        # Vite build and dev server configuration
```

---

## ⚠️ Important Notes

*   **Data Source**: The application searches over predefined chunks mapped in `src/data/Ugchunk.ts`. If NUST updates its policies, this file must be updated to reflect the new handbook text.
*   **Groq Limits**: Free tier Groq API keys may hit rate limits if too many searches are performed rapidly. The app implements debouncing and manual "Enter" submit logic to mitigate this.

## 📄 License
This project was developed for educational/experimental purposes regarding Big Data algorithms and Information Retrieval systems.
