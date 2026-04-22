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

      // TF-IDF (uses prebuilt IDF) + Recommendation Content Ranking
      const tfidf = retrieveTopK(query, docs, idf, topK * 3); // Get extra candidates
      const rankedTfidf = recommendChunks(query, tfidf.results, docs, 'cosineSimilarity', topK, 0.7);
      setTfidfResults(rankedTfidf);
      setTfidfTimeMs(tfidf.queryTimeMs);

      // LSH Banding (uses prebuilt index) + Recommendation Content Ranking
      const lsh = lshRetrieve(query, lshIndex, topK * 3);
      const rankedLsh = recommendChunks(query, lsh.results, docs, 'jaccardSimilarity', topK, 0.7);
      setLshResults(rankedLsh);
      setLshTimeMs(lsh.queryTimeMs);
      setCandidateCount(lsh.candidateCount);

      // Standalone MinHash + Recommendation Content Ranking
      const mh = retrieveByMinHash(query, docs, topK * 3, 256);
      const rankedMh = recommendChunks(query, mh.results, docs, 'jaccardSimilarity', topK, 0.7);
      setMinhashResults(rankedMh);
      setMinhashTimeMs(mh.queryTimeMs);

      // SimHash returns hamming distance. We covert to sim and rank.
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
