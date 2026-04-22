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
import { computePageRank, applyPageRank } from "@/lib/pagerank";

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
  const [pageRankScores, setPageRankScores] = useState<Map<number, number>>(new Map());

  useEffect(() => {
    // Build all indexes once at startup with optimized parameters
    const builtIdf = buildIDF(docs);
    setIdf(builtIdf);

    // Calculate PageRank (Authority ranking based on intrinsic similarity graph)
    // using a fast damping factor of 0.85
    const prScores = computePageRank(docs, builtIdf, 0.85, 20, 0.05);
    setPageRankScores(prScores);

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

      // TF-IDF (uses prebuilt IDF) + PageRank
      const tfidf = retrieveTopK(query, docs, idf, topK * 2); // Get more candidates
      const rankedTfidf = applyPageRank(tfidf.results, 'cosineSimilarity', pageRankScores, 0.4).slice(0, topK);
      setTfidfResults(rankedTfidf);
      setTfidfTimeMs(tfidf.queryTimeMs);

      // LSH Banding (uses prebuilt index) + PageRank
      const lsh = lshRetrieve(query, lshIndex, topK * 2);
      const rankedLsh = applyPageRank(lsh.results, 'jaccardSimilarity', pageRankScores, 0.4).slice(0, topK);
      setLshResults(rankedLsh);
      setLshTimeMs(lsh.queryTimeMs);
      setCandidateCount(lsh.candidateCount);

      // Standalone MinHash + PageRank
      const mh = retrieveByMinHash(query, docs, topK * 2, 256);
      const rankedMh = applyPageRank(mh.results, 'jaccardSimilarity', pageRankScores, 0.4).slice(0, topK);
      setMinhashResults(rankedMh);
      setMinhashTimeMs(mh.queryTimeMs);

      // SimHash returns hamming distance. We need to handle this differently because a lower distance is better.
      // Easiest is to convert distance to similarity roughly bounded [0, 1] then pagerank.
      const sh = simHashRetrieve(query, docs, topK * 2);
      const simhashNormalized = sh.results.map(r => ({
        ...r,
        simScore: 1 - (r.hammingDistance / 64) // Lower distance -> higher simScore
      }));
      const rankedSh = applyPageRank(simhashNormalized, 'simScore', pageRankScores, 0.4).slice(0, topK);
      // We still want to preserve the distance for display, but it is now ranked by PageRank-boosted similarity
      setSimhashResults(rankedSh);
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
