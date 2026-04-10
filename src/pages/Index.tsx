import { useState } from "react";
import { useLSH, type RetrievalMethod } from "@/hooks/useLSH";
import SearchBar from "@/components/SearchBar";
import ResultCard from "@/components/ResultCard";
import TFIDFResultCard from "@/components/TFIDFResultCard";
import MinHashResultCard from "@/components/MinHashResultCard";
import SimHashResultCard from "@/components/SimHashResultCard";
import MetricsPanel from "@/components/MetricsPanel";
import ComparePanel from "@/components/ComparePanel";
import Suggestions from "@/components/Suggestions";
import { GraduationCap, GitCompareArrows } from "lucide-react";

const methods: { value: RetrievalMethod; label: string }[] = [
  { value: "tfidf", label: "TF-IDF (Exact)" },
  { value: "lsh", label: "MinHash + LSH (Approximate)" },
  { value: "minhash", label: "MinHash (Standalone)" },
  { value: "simhash", label: "SimHash" },
];

const Index = () => {
  const [query, setQuery] = useState("");
  const [topK, setTopK] = useState(3);
  const [showCompare, setShowCompare] = useState(false);
  const {
    search, lshResults, tfidfResults, minhashResults, simhashResults,
    lshTimeMs, tfidfTimeMs, minhashTimeMs, simhashTimeMs, candidateCount,
    totalDocs, hasSearched, method, setMethod,
  } = useLSH();

  const handleSearch = () => {
    setShowCompare(false);
    search(query, topK);
  };

  const handleSuggestion = (q: string) => {
    setQuery(q);
    setShowCompare(false);
    search(q, topK);
  };

  const handleCompare = () => {
    if (!query.trim()) return;
    search(query, topK);
    setShowCompare(true);
  };

  const timeMap: Record<RetrievalMethod, number> = { lsh: lshTimeMs, tfidf: tfidfTimeMs, minhash: minhashTimeMs, simhash: simhashTimeMs };
  const resultsMap: Record<RetrievalMethod, unknown[]> = { lsh: lshResults, tfidf: tfidfResults, minhash: minhashResults, simhash: simhashResults };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-primary text-primary-foreground">
        <div className="container max-w-5xl mx-auto px-4 py-6 flex items-center gap-4">
          <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-primary-foreground/15 backdrop-blur">
            <GraduationCap className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold leading-tight">NUST Academic Policy QA System</h1>
            <p className="text-sm opacity-80">Powered by LSH-based Retrieval</p>
          </div>
        </div>
      </header>

      <main className="container max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Query Section */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-5">
          <p className="text-sm font-semibold text-foreground">Ask a question about NUST policies</p>

          <SearchBar
            value={query}
            onChange={setQuery}
            onSearch={handleSearch}
            placeholder="Ask a question about NUST policies..."
          />

          {/* Controls row */}
          <div className="flex flex-wrap items-end gap-4">
            {/* Method dropdown */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Retrieval Method</label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value as RetrievalMethod)}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {methods.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>

            {/* Top-K slider */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground">
                Top-K Results: <span className="font-mono text-foreground">{topK}</span>
              </label>
              <input
                type="range"
                min={1}
                max={5}
                value={topK}
                onChange={(e) => setTopK(Number(e.target.value))}
                className="w-32 accent-primary"
              />
            </div>

            {/* Compare button */}
            {hasSearched && (
              <button
                onClick={handleCompare}
                className="flex items-center gap-2 rounded-md border border-border bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:bg-accent/80 transition-colors"
              >
                <GitCompareArrows className="h-4 w-4" />
                Compare All Methods
              </button>
            )}
          </div>
        </div>

        {/* Suggestions */}
        {!hasSearched && <Suggestions onSelect={handleSuggestion} />}

        {/* Metrics Panel */}
        {hasSearched && !showCompare && (
          <MetricsPanel
            method={method}
            timeMs={timeMap[method]}
            totalDocs={totalDocs}
            candidateCount={candidateCount}
            resultsReturned={resultsMap[method].length}
          />
        )}

        {/* Comparison Panel */}
        {hasSearched && showCompare && (
          <ComparePanel
            tfidfResults={tfidfResults}
            lshResults={lshResults}
            minhashResults={minhashResults}
            simhashResults={simhashResults}
            tfidfTimeMs={tfidfTimeMs}
            lshTimeMs={lshTimeMs}
            minhashTimeMs={minhashTimeMs}
            simhashTimeMs={simhashTimeMs}
          />
        )}

        {/* Single-method results */}
        {hasSearched && !showCompare && (
          <div className="space-y-4">
            {method === "lsh" && lshResults.map((r, i) => (
              <ResultCard key={r.docId} result={r} rank={i + 1} />
            ))}
            {method === "tfidf" && tfidfResults.map((r, i) => (
              <TFIDFResultCard key={r.docId} result={r} rank={i + 1} />
            ))}
            {method === "minhash" && minhashResults.map((r, i) => (
              <MinHashResultCard key={r.docId} result={r} rank={i + 1} />
            ))}
            {method === "simhash" && simhashResults.map((r, i) => (
              <SimHashResultCard key={r.docId} result={r} rank={i + 1} />
            ))}
            {resultsMap[method].length === 0 && (
              <p className="text-center text-muted-foreground py-8">No matching policies found.</p>
            )}
          </div>
        )}
      </main>

      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        Big Data Project — LSH · MinHash · TF-IDF · SimHash Retrieval · NUST Academic Handbook QA
      </footer>
    </div>
  );
};

export default Index;
