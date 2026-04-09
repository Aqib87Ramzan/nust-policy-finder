import { useMemo, useState, useCallback } from "react";
import { handbookChunks } from "@/data/handbookChunks";
import { buildIndex, queryIndex, type LSHIndex, type QueryResult, type LSHConfig, DEFAULT_LSH_CONFIG } from "@/lib/lsh";
import { retrieveTopK, type TFIDFResult } from "@/lib/tfidf";

export type RetrievalMethod = "lsh" | "tfidf";

export function useLSH(config: LSHConfig = DEFAULT_LSH_CONFIG) {
  const docs = useMemo(() => handbookChunks.map((c) => ({ id: c.id, text: c.text })), []);

  const index = useMemo<LSHIndex>(() => buildIndex(docs, config), [docs, config]);

  const [lshResults, setLshResults] = useState<QueryResult[]>([]);
  const [tfidfResults, setTfidfResults] = useState<TFIDFResult[]>([]);
  const [lshTimeMs, setLshTimeMs] = useState(0);
  const [tfidfTimeMs, setTfidfTimeMs] = useState(0);
  const [candidateCount, setCandidateCount] = useState(0);
  const [hasSearched, setHasSearched] = useState(false);
  const [method, setMethod] = useState<RetrievalMethod>("lsh");

  const search = useCallback(
    (query: string, topK = 5) => {
      if (!query.trim()) {
        setLshResults([]);
        setTfidfResults([]);
        setHasSearched(false);
        return;
      }

      // Always run both for comparison
      const lsh = queryIndex(index, query, topK);
      setLshResults(lsh.results);
      setLshTimeMs(lsh.queryTimeMs);
      setCandidateCount(lsh.candidateCount);

      const tfidf = retrieveTopK(query, docs, topK);
      setTfidfResults(tfidf.results);
      setTfidfTimeMs(tfidf.queryTimeMs);

      setHasSearched(true);
    },
    [index, docs]
  );

  return {
    search,
    lshResults,
    tfidfResults,
    lshTimeMs,
    tfidfTimeMs,
    candidateCount,
    totalDocs: handbookChunks.length,
    hasSearched,
    method,
    setMethod,
    index,
  };
}
