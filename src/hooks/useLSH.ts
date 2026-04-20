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
  // Use only UG chunks for focused undergraduate policy search
  const allChunks = useMemo(() => [...ugChunks], []);
  const docs = useMemo(() => allChunks.map((c) => ({ id: c.id, text: c.text })), [allChunks]);

  // Pre-built indexes
  const [isIndexing, setIsIndexing] = useState(true);
  const [idf, setIdf] = useState<Map<string, number>>(new Map());
  const [lshIndex, setLshIndex] = useState<ReturnType<typeof buildLSHIndex> | null>(null);
  const [chunkHashes, setChunkHashes] = useState<[number, number][]>([]);

  useEffect(() => {
    // Build all indexes once at startup with optimized parameters
    const builtIdf = buildIDF(docs);
    setIdf(builtIdf);

    // Optimized LSH: 256 hashes, 32 bands, 8 rows per band
    const builtLsh = buildLSHIndex(docs, 256, 32, 8);
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

      // Standalone MinHash with optimized 256 hashes
      const mh = retrieveByMinHash(query, docs, topK, 256);
      setMinhashResults(mh.results);
      setMinhashTimeMs(mh.queryTimeMs);

      // SimHash with adaptive threshold
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
    totalDocs: allChunks.length,
    hasSearched,
    method,
    setMethod,
    lshIndex,
    isIndexing,
  };
}
