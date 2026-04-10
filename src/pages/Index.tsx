import { useState } from "react";
import { useLSH, type RetrievalMethod } from "@/hooks/useLSH";
import SearchBar from "@/components/SearchBar";
import ResultCard from "@/components/ResultCard";
import TFIDFResultCard from "@/components/TFIDFResultCard";
import MinHashResultCard from "@/components/MinHashResultCard";
import SimHashResultCard from "@/components/SimHashResultCard";
import StatsBar from "@/components/StatsBar";
import Suggestions from "@/components/Suggestions";
import { GraduationCap } from "lucide-react";

const methodMeta: Record<RetrievalMethod, { label: string; desc: string }> = {
  lsh: { label: "LSH (Banded)", desc: "Banded MinHash with word-level shingles" },
  tfidf: { label: "TF-IDF", desc: "Cosine similarity baseline" },
  minhash: { label: "MinHash", desc: "Word k-gram Jaccard estimation" },
  simhash: { label: "SimHash", desc: "64-bit fingerprint Hamming distance" },
};

const Index = () => {
  const [query, setQuery] = useState("");
  const {
    search, lshResults, tfidfResults, minhashResults, simhashResults,
    lshTimeMs, tfidfTimeMs, minhashTimeMs, simhashTimeMs, candidateCount,
    totalDocs, hasSearched, method, setMethod,
  } = useLSH();

  const handleSearch = () => search(query, 5);

  const handleSuggestion = (q: string) => {
    setQuery(q);
    search(q, 5);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container max-w-4xl mx-auto px-4 py-6 flex items-center gap-3">
          <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary">
            <GraduationCap className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground leading-tight">NUST Policy QA</h1>
            <p className="text-xs text-muted-foreground">LSH · MinHash · TF-IDF retrieval comparison</p>
          </div>
        </div>
      </header>

      <main className="container max-w-4xl mx-auto px-4 py-10 space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold text-foreground">Academic Policy Search</h2>
          <p className="text-muted-foreground text-sm max-w-lg mx-auto">
            Compare three retrieval methods on NUST handbook data: Banded LSH, standalone MinHash, and TF-IDF cosine similarity.
          </p>
        </div>

        <SearchBar value={query} onChange={setQuery} onSearch={handleSearch} />

        {hasSearched && (
          <div className="flex justify-center gap-2 flex-wrap">
            {(Object.keys(methodMeta) as RetrievalMethod[]).map((m) => (
              <button
                key={m}
                onClick={() => setMethod(m)}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors border ${
                  method === m
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-foreground border-border hover:bg-accent"
                }`}
              >
                {methodMeta[m].label}
              </button>
            ))}
          </div>
        )}

        <StatsBar
          totalDocs={totalDocs}
          candidateCount={candidateCount}
          lshTimeMs={lshTimeMs}
          tfidfTimeMs={tfidfTimeMs}
          minhashTimeMs={minhashTimeMs}
          simhashTimeMs={simhashTimeMs}
          hasSearched={hasSearched}
          method={method}
        />

        {hasSearched && method === "lsh" && lshResults.length > 0 && (
          <div className="space-y-4">
            {lshResults.map((r, i) => (
              <ResultCard key={r.docId} result={r} rank={i + 1} />
            ))}
          </div>
        )}

        {hasSearched && method === "tfidf" && tfidfResults.length > 0 && (
          <div className="space-y-4">
            {tfidfResults.map((r, i) => (
              <TFIDFResultCard key={r.docId} result={r} rank={i + 1} />
            ))}
          </div>
        )}

        {hasSearched && method === "minhash" && minhashResults.length > 0 && (
          <div className="space-y-4">
            {minhashResults.map((r, i) => (
              <MinHashResultCard key={r.docId} result={r} rank={i + 1} />
            ))}
          </div>
        )}

        {hasSearched && method === "simhash" && simhashResults.length > 0 && (
          <div className="space-y-4">
            {simhashResults.map((r, i) => (
              <SimHashResultCard key={r.docId} result={r} rank={i + 1} />
            ))}
          </div>
        )}

        {hasSearched &&
          ((method === "lsh" && lshResults.length === 0) ||
            (method === "tfidf" && tfidfResults.length === 0) ||
            (method === "minhash" && minhashResults.length === 0) ||
            (method === "simhash" && simhashResults.length === 0)) && (
            <p className="text-center text-muted-foreground py-8">No matching policies found.</p>
          )}

        {!hasSearched && <Suggestions onSelect={handleSuggestion} />}
      </main>

      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        Big Data Project — LSH · MinHash · TF-IDF Retrieval · NUST Academic Handbook QA
      </footer>
    </div>
  );
};

export default Index;
