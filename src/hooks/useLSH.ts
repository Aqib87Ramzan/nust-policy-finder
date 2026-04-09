import { useMemo, useState, useCallback } from "react";
import { handbookChunks } from "@/data/handbookChunks";
import { buildIndex, queryIndex, type QueryResult, type LSHConfig, DEFAULT_LSH_CONFIG } from "@/lib/lsh";
import { retrieveTopK, type TFIDFResult } from "@/lib/tfidf";
import { retrieveByMinHash, type MinHashResult } from "@/lib/minhash";

export type RetrievalMethod = "lsh" | "tfidf" | "minhash";

export function useLSH(config: LSHConfig = DEFAULT_LSH_CONFIG) {
  const docs = useMemo(() => handbookChunks.map((c) => ({ id: c.id, text: c.text })), []);

  const index = useMemo(() => buildIndex(docs, config), [docs, config]);

  const [lshResults, setLshResults] = useState<QueryResult[]>([]);
  const [tfidfResults, setTfidfResults] = useState<TFIDFResult[]>([]);
  const [minhashResults, setMinhashResults] = useState<MinHashResult[]>([]);
  const [lshTimeMs, setLshTimeMs] = useState(0);
  const [tfidfTimeMs, setTfidfTimeMs] = useState(0);
  const [minhashTimeMs, setMinhashTimeMs] = useState(0);
  const [candidateCount, setCandidateCount] = useState(0);
  const [hasSearched, setHasSearched] = useState(false);
  const [method, setMethod] = useState<RetrievalMethod>("lsh");

  const search = useCallback(
    (query: string, topK = 5) => {
      if (!query.trim()) {
        setLshResults([]);
        setTfidfResults([]);
        setMinhashResults([]);
        setHasSearched(false);
        return;
      }

      const lsh = queryIndex(index, query, topK);
      setLshResults(lsh.results);
      setLshTimeMs(lsh.queryTimeMs);
      setCandidateCount(lsh.candidateCount);

      const tfidf = retrieveTopK(query, docs, topK);
      setTfidfResults(tfidf.results);
      setTfidfTimeMs(tfidf.queryTimeMs);

      const mh = retrieveByMinHash(query, docs, topK);
      setMinhashResults(mh.results);
      setMinhashTimeMs(mh.queryTimeMs);

      setHasSearched(true);
    },
    [index, docs]
  );

  return {
    search,
    lshResults,
    tfidfResults,
    minhashResults,
    lshTimeMs,
    tfidfTimeMs,
    minhashTimeMs,
    candidateCount,
    totalDocs: handbookChunks.length,
    hasSearched,
    method,
    setMethod,
    index,
  };
}
