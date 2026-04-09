import { useMemo, useState, useCallback } from "react";
import { handbookChunks } from "@/data/handbookChunks";
import { buildIndex, queryIndex, type LSHIndex, type QueryResult, type LSHConfig, DEFAULT_LSH_CONFIG } from "@/lib/lsh";

export function useLSH(config: LSHConfig = DEFAULT_LSH_CONFIG) {
  const index = useMemo<LSHIndex>(() => {
    return buildIndex(
      handbookChunks.map((c) => ({ id: c.id, text: c.text })),
      config
    );
  }, [config]);

  const [results, setResults] = useState<QueryResult[]>([]);
  const [queryTimeMs, setQueryTimeMs] = useState(0);
  const [candidateCount, setCandidateCount] = useState(0);
  const [hasSearched, setHasSearched] = useState(false);

  const search = useCallback(
    (query: string, topK = 5) => {
      if (!query.trim()) {
        setResults([]);
        setHasSearched(false);
        return;
      }
      const res = queryIndex(index, query, topK);
      setResults(res.results);
      setQueryTimeMs(res.queryTimeMs);
      setCandidateCount(res.candidateCount);
      setHasSearched(true);
    },
    [index]
  );

  return {
    search,
    results,
    queryTimeMs,
    candidateCount,
    totalDocs: handbookChunks.length,
    hasSearched,
    index,
  };
}
