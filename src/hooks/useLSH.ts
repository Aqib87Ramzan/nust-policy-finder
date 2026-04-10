import { useMemo, useState, useCallback } from "react";
import { handbookChunks } from "@/data/handbookChunks";
import { retrieveTopK, type TFIDFResult } from "@/lib/tfidf";
import {
  retrieveByMinHash,
  buildLSHIndex,
  lshRetrieve,
  type MinHashResult,
  type LSHBandedResult,
  type LSHBandedIndex,
} from "@/lib/minhash";

export type RetrievalMethod = "lsh" | "tfidf" | "minhash";

export interface LSHBandingConfig {
  numHashes: number;
  bands: number;
  rows: number;
  shingleK: number;
}

export const DEFAULT_BANDING_CONFIG: LSHBandingConfig = {
  numHashes: 100,
  bands: 20,
  rows: 5,
  shingleK: 3,
};

export function useLSH(config: LSHBandingConfig = DEFAULT_BANDING_CONFIG) {
  const docs = useMemo(() => handbookChunks.map((c) => ({ id: c.id, text: c.text })), []);

  const lshIndex = useMemo(
    () => buildLSHIndex(docs, config.numHashes, config.bands, config.rows, config.shingleK),
    [docs, config]
  );

  const [lshResults, setLshResults] = useState<LSHBandedResult[]>([]);
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

      // LSH Banding (built on MinHash foundation)
      const lsh = lshRetrieve(query, lshIndex, topK);
      setLshResults(lsh.results);
      setLshTimeMs(lsh.queryTimeMs);
      setCandidateCount(lsh.candidateCount);

      // TF-IDF baseline
      const tfidf = retrieveTopK(query, docs, topK);
      setTfidfResults(tfidf.results);
      setTfidfTimeMs(tfidf.queryTimeMs);

      // Standalone MinHash
      const mh = retrieveByMinHash(query, docs, topK);
      setMinhashResults(mh.results);
      setMinhashTimeMs(mh.queryTimeMs);

      setHasSearched(true);
    },
    [lshIndex, docs]
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
    lshIndex,
  };
}
