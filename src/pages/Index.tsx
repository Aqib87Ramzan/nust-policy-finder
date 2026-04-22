import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useLSH, type RetrievalMethod } from "@/hooks/useLSH";
import SearchBar from "@/components/SearchBar";
import ResultCard from "@/components/ResultCard";
import TFIDFResultCard from "@/components/TFIDFResultCard";
import MinHashResultCard from "@/components/MinHashResultCard";
import SimHashResultCard from "@/components/SimHashResultCard";
import AnswerBox from "@/components/AnswerBox";
import MetricsPanel from "@/components/MetricsPanel";
import ComparePanel from "@/components/ComparePanel";
import Suggestions from "@/components/Suggestions";
import { extractAnswer } from "@/lib/answerExtractor";
import { extractAnswerWithGroq } from "@/lib/groqExtractor";
import { ugChunks } from "@/data/Ugchunk";
import { GraduationCap, GitCompareArrows, Loader2, Database } from "lucide-react";

const methods: { value: RetrievalMethod; label: string }[] = [
  { value: "tfidf", label: "TF-IDF (Exact)" },
  { value: "lsh", label: "MinHash + LSH (Approximate)" },
  { value: "minhash", label: "MinHash (Standalone)" },
  { value: "simhash", label: "SimHash" },
];

const Index = () => {
  const [query, setQuery] = useState("");
  const [searchedQuery, setSearchedQuery] = useState("");
  const [topK, setTopK] = useState(3);
  const [showCompare, setShowCompare] = useState(false);
  const [extractedAnswer, setExtractedAnswer] = useState("");
  const [isExtractingAnswer, setIsExtractingAnswer] = useState(false);
  const [searchTrigger, setSearchTrigger] = useState(0);

  const {
    search, lshResults, tfidfResults, minhashResults, simhashResults,
    lshTimeMs, tfidfTimeMs, minhashTimeMs, simhashTimeMs, candidateCount,
    totalDocs, hasSearched, method, setMethod, isIndexing,
  } = useLSH();

  // Helper to get full chunk data from results
  const getFullChunksFromResults = (results: any[]) => {
    const fullChunks = results
      .map((r) => ugChunks.find((c) => c.id === r.docId))
      .filter((c) => c !== undefined);
    return fullChunks;
  };

  // Extract a concise answer directly from the retrieved chunks
  useEffect(() => {
    let active = true;
    const currentResults = method === 'tfidf' ? tfidfResults :
      method === 'lsh' ? lshResults :
      method === 'minhash' ? minhashResults :
      simhashResults;

    if (!hasSearched || !currentResults || currentResults.length === 0) {
      setExtractedAnswer("");
      return;
    }

    const fetchAnswer = async () => {
      setIsExtractingAnswer(true);
      const chunks = getFullChunksFromResults(currentResults as any[]);
      
      // Fallback to local heuristic extraction
      const fallbackAnswer = extractAnswer(searchedQuery, chunks);
      
      try {
        const groqResult = await extractAnswerWithGroq(searchedQuery, chunks);
        if (active) {
          if (groqResult && groqResult.answer) {
            setExtractedAnswer(groqResult.answer);
          } else {
            // Include a warning about failing over to fallback
            setExtractedAnswer("⚠️ *AI enhancement failed (check API key).* Showing raw extracted text:\n\n" + fallbackAnswer);
          }
        }
      } catch (error) {
        if (active) {
          setExtractedAnswer("⚠️ *AI enhancement encountered an error.* Showing raw extracted text:\n\n" + fallbackAnswer);
        }
      } finally {
        if (active) {
          setIsExtractingAnswer(false);
        }
      }
    };
    
    fetchAnswer();
    
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTrigger]);

  const handleSearch = () => {
    setShowCompare(false);
    setSearchedQuery(query);
    search(query, topK);
    setSearchTrigger((prev) => prev + 1);
  };

  const handleSuggestion = (q: string) => {
    setQuery(q);
    setSearchedQuery(q);
    setShowCompare(false);
    search(q, topK);
    setSearchTrigger((prev) => prev + 1);
  };

  const handleCompare = () => {
    if (!query.trim()) return;
    setSearchedQuery(query);
    search(query, topK);
    setShowCompare(true);
    setSearchTrigger((prev) => prev + 1);
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
          <div className="flex-1">
            <h1 className="text-2xl font-bold leading-tight">NUST Academic Policy QA System</h1>
            <p className="text-sm opacity-80">Powered by LSH-based Retrieval</p>
          </div>
          <Link to="/experiments" className="px-4 py-2 rounded-lg bg-primary-foreground/15 hover:bg-primary-foreground/25 text-sm font-medium transition-colors backdrop-blur">
            📊 Experiments
          </Link>
        </div>
      </header>

      <main className="container max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Indexing status */}
        {isIndexing ? (
          <div className="flex items-center justify-center gap-3 py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm font-medium">Building search index...</span>
          </div>
        ) : (
          <>
            {/* Index ready badge */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Database className="h-3.5 w-3.5 text-primary" />
              <span>{totalDocs} chunks indexed and ready</span>
            </div>

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
                {/* Answer Box generated from the retrieved chunks */}
                {resultsMap[method].length > 0 && (extractedAnswer || isExtractingAnswer) && (
                  isExtractingAnswer ? (
                    <div className="rounded-lg border-l-4 border-green-500 bg-green-50 p-5 shadow-sm mb-6 flex items-center gap-3">
                      <Loader2 className="h-5 w-5 animate-spin text-green-600" />
                      <span className="text-sm font-medium text-green-900">Synthesizing Answer with Groq AI...</span>
                    </div>
                  ) : (
                    <AnswerBox answer={extractedAnswer} />
                  )
                )}

                {method === "lsh" && lshResults.map((r, i) => (
                  <ResultCard key={r.docId} result={r} rank={i + 1} query={query} />
                ))}
                {method === "tfidf" && tfidfResults.map((r, i) => (
                  <TFIDFResultCard key={r.docId} result={r} rank={i + 1} query={query} />
                ))}
                {method === "minhash" && minhashResults.map((r, i) => (
                  <MinHashResultCard key={r.docId} result={r} rank={i + 1} query={query} />
                ))}
                {method === "simhash" && simhashResults.map((r, i) => (
                  <SimHashResultCard key={r.docId} result={r} rank={i + 1} query={query} />
                ))}
                {resultsMap[method].length === 0 && (
                  <p className="text-center text-muted-foreground py-8">No matching policies found.</p>
                )}
              </div>
            )}
          </>
        )}
      </main>

      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        Big Data Project — LSH · MinHash · TF-IDF · SimHash Retrieval · NUST Academic Handbook QA
      </footer>
    </div>
  );
};

export default Index;
