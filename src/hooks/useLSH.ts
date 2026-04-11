import { useMemo, useState, useCallback, useEffect } from "react";
import { ugChunks } from "@/data/Ugchunk";
import { buildIDF, retrieveTopK, type TFIDFResult } from "@/lib/tfidf";
import {
  retrieveByMinHash,
  buildLSHIndex,
  lshRetrieve,
  type MinHashResult,
  type LSHBandedResult,
} from "@/lib/minhash";
import { simHashRetrieve, computeSimHash, type SimHashResult } from "@/lib/simhash";

export type RetrievalMethod = "lsh" | "tfidf" | "minhash" | "simhash";

export function useLSH() {
  const docs = useMemo(() => ugChunks.map((c) => ({ id: c.id, text: c.text })), []);

  // Pre-built indexes
  const [isIndexing, setIsIndexing] = useState(true);
  const [idf, setIdf] = useState<Map<string, number>>(new Map());
  const [lshIndex, setLshIndex] = useState<ReturnType<typeof buildLSHIndex> | null>(null);
  const [chunkHashes, setChunkHashes] = useState<[number, number][]>([]);

  useEffect(() => {
    // Build all indexes once at startup
    const builtIdf = buildIDF(docs);
    setIdf(builtIdf);

    const builtLsh = buildLSHIndex(docs, 100, 20, 5);
    setLshIndex(builtLsh);

    const hashes = docs.map((d) => computeSimHash(d.text));
    setChunkHashes(hashes);

    setIsIndexing(false);
  }, [docs]);

  const [lshResults, setLshResults] = useState<LSHBandedResult[]>([]);
  const [tfidfResults, setTfidfResults] = useState<TFIDFResult[]>([]);
  const [minhashResults, setMinhashResults] = useState<MinHashResult[]>([]);
  const [simhashResults, setSimhashResults] = useState<SimHashResult[]>([]);
  const [lshTimeMs, setLshTimeMs] = useState(0);
  const [tfidfTimeMs, setTfidfTimeMs] = useState(0);
  const [minhashTimeMs, setMinhashTimeMs] = useState(0);
  const [simhashTimeMs, setSimhashTimeMs] = useState(0);
  const [candidateCount, setCandidateCount] = useState(0);
  const [hasSearched, setHasSearched] = useState(false);
  const [method, setMethod] = useState<RetrievalMethod>("lsh");

  const search = useCallback(
    (query: string, topK = 5) => {
      if (!query.trim() || !lshIndex) {
        setLshResults([]);
        setTfidfResults([]);
        setMinhashResults([]);
        setSimhashResults([]);
        setHasSearched(false);
        return;
      }

      // TF-IDF (uses prebuilt IDF)
      const tfidf = retrieveTopK(query, docs, idf, topK);
      setTfidfResults(tfidf.results);
      setTfidfTimeMs(tfidf.queryTimeMs);

      // LSH Banding (uses prebuilt index)
      const lsh = lshRetrieve(query, lshIndex, topK);
      setLshResults(lsh.results);
      setLshTimeMs(lsh.queryTimeMs);
      setCandidateCount(lsh.candidateCount);

      // Standalone MinHash
      const mh = retrieveByMinHash(query, docs, topK);
      setMinhashResults(mh.results);
      setMinhashTimeMs(mh.queryTimeMs);

      // SimHash
      const sh = simHashRetrieve(query, docs, topK);
      setSimhashResults(sh.results);
      setSimhashTimeMs(sh.queryTimeMs);

      setHasSearched(true);
    },
    [lshIndex, docs, idf]
  );

  return {
    search,
    lshResults,
    tfidfResults,
    minhashResults,
    simhashResults,
    lshTimeMs,
    tfidfTimeMs,
    minhashTimeMs,
    simhashTimeMs,
    candidateCount,
    totalDocs: ugChunks.length,
    hasSearched,
    method,
    setMethod,
    lshIndex,
    isIndexing,
  };
}
