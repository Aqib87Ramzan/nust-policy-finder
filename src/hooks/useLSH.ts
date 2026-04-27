// Project source file for use lsh.
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
import { recommendChunks } from "@/lib/recommendation";

export type RetrievalMethod = "lsh" | "tfidf" | "minhash" | "simhash";

export function useLSH() {
  // Load and prepare the undergraduate handbook policy chunks
  const allChunks = useMemo(() => [...ugChunks], []);
  const docs = useMemo(() => allChunks.map((c) => ({ id: c.id, text: c.text })), [allChunks]);

  // State handles for our pre-computed search indexes
  const [isIndexing, setIsIndexing] = useState(true);
  const [idf, setIdf] = useState<Map<string, number>>(new Map());
  const [lshIndex, setLshIndex] = useState<ReturnType<typeof buildLSHIndex> | null>(null);
  const [chunkHashes, setChunkHashes] = useState<[number, number][]>([]);

  useEffect(() => {
    // Generate the internal search indexes so we don't have to compute them on every query
    const builtIdf = buildIDF(docs);
    setIdf(builtIdf);

    // Creates the Locality-Sensitive Hash index parameters
    const builtLsh = buildLSHIndex(docs, 256, 32, 8);
    setLshIndex(builtLsh);

    // Compute simple document hashes for SimHash comparisons
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

      // Run TF-IDF, get slightly more results than needed, then run them through our ranker
      const tfidf = retrieveTopK(query, docs, idf, topK * 3);
      const rankedTfidf = recommendChunks(query, tfidf.results, docs, 'cosineSimilarity', topK, 0.7);
      setTfidfResults(rankedTfidf);
      setTfidfTimeMs(tfidf.queryTimeMs);

      // Same logic for Locality-Sensitive Hashing
      const lsh = lshRetrieve(query, lshIndex, topK * 3);
      const rankedLsh = recommendChunks(query, lsh.results, docs, 'jaccardSimilarity', topK, 0.7);
      setLshResults(rankedLsh);
      setLshTimeMs(lsh.queryTimeMs);
      setCandidateCount(lsh.candidateCount);

      // Same logic for MinHash
      const mh = retrieveByMinHash(query, docs, topK * 3, 256);
      const rankedMh = recommendChunks(query, mh.results, docs, 'jaccardSimilarity', topK, 0.7);
      setMinhashResults(rankedMh);
      setMinhashTimeMs(mh.queryTimeMs);

      // SimHash uses distance instead of direct similarity, so we convert distance to a score 0-1
      const sh = simHashRetrieve(query, docs, topK * 3);
      const simhashNormalized = sh.results.map(r => ({
        ...r,
        simScore: 1 - (r.hammingDistance / 64) 
      }));
      const rankedSh = recommendChunks(query, simhashNormalized, docs, 'simScore', topK, 0.7);
      setSimhashResults(rankedSh as any);
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
