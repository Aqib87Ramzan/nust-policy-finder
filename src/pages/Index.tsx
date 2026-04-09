import { useState } from "react";
import { useLSH } from "@/hooks/useLSH";
import SearchBar from "@/components/SearchBar";
import ResultCard from "@/components/ResultCard";
import TFIDFResultCard from "@/components/TFIDFResultCard";
import StatsBar from "@/components/StatsBar";
import Suggestions from "@/components/Suggestions";
import { GraduationCap } from "lucide-react";

const Index = () => {
  const [query, setQuery] = useState("");
  const {
    search, lshResults, tfidfResults,
    lshTimeMs, tfidfTimeMs, candidateCount,
    totalDocs, hasSearched, method, setMethod,
  } = useLSH();

  const handleSearch = () => search(query, 5);

  const handleSuggestion = (q: string) => {
    setQuery(q);
    search(q, 5);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container max-w-4xl mx-auto px-4 py-6 flex items-center gap-3">
          <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary">
            <GraduationCap className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground leading-tight">NUST Policy QA</h1>
            <p className="text-xs text-muted-foreground">LSH + TF-IDF academic handbook retrieval</p>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="container max-w-4xl mx-auto px-4 py-10 space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold text-foreground">Academic Policy Search</h2>
          <p className="text-muted-foreground text-sm max-w-lg mx-auto">
            Compare LSH (approximate) vs TF-IDF + Cosine Similarity (exact baseline) retrieval on NUST handbook data.
          </p>
        </div>

        <SearchBar value={query} onChange={setQuery} onSearch={handleSearch} />

        {/* Method toggle */}
        {hasSearched && (
          <div className="flex justify-center gap-2">
            {(["lsh", "tfidf"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMethod(m)}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors border ${
                  method === m
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-foreground border-border hover:bg-accent"
                }`}
              >
                {m === "lsh" ? "LSH (MinHash)" : "TF-IDF (Baseline)"}
              </button>
            ))}
          </div>
        )}

        <StatsBar
          totalDocs={totalDocs}
          candidateCount={candidateCount}
          lshTimeMs={lshTimeMs}
          tfidfTimeMs={tfidfTimeMs}
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

        {hasSearched &&
          ((method === "lsh" && lshResults.length === 0) ||
            (method === "tfidf" && tfidfResults.length === 0)) && (
            <p className="text-center text-muted-foreground py-8">No matching policies found.</p>
          )}

        {!hasSearched && <Suggestions onSelect={handleSuggestion} />}
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        Big Data Project — LSH + TF-IDF Text Retrieval Engine · NUST Academic Handbook QA
      </footer>
    </div>
  );
};

export default Index;
