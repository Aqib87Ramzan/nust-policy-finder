import { ugChunks, type Chunk } from "@/data/Ugchunk";
import type { LSHBandedResult, MinHashResult } from "@/lib/minhash";
import type { TFIDFResult } from "@/lib/tfidf";
import type { SimHashResult } from "@/lib/simhash";
import { BookOpen, FileText, Hash } from "lucide-react";

function getChunk(id: number): Chunk | undefined {
  const allChunks = [...ugChunks];
  return allChunks.find((c) => c.id === id);
}

function rankBadge(rank: number) {
  const labels = ["1st", "2nd", "3rd", "4th", "5th"];
  return (
    <span className="inline-flex items-center justify-center h-6 w-8 rounded-full bg-primary text-primary-foreground text-xs font-bold">
      {labels[rank - 1] ?? rank}
    </span>
  );
}

interface ColumnProps {
  title: string;
  timeMs: number;
  children: React.ReactNode;
}

const Column = ({ title, timeMs, children }: ColumnProps) => (
  <div className="flex-1 min-w-0">
    <div className="flex items-center justify-between mb-3">
      <h4 className="text-sm font-bold text-foreground">{title}</h4>
      <span className="text-xs font-mono text-muted-foreground">{timeMs.toFixed(2)} ms</span>
    </div>
    <div className="space-y-3">{children}</div>
  </div>
);

function MiniCard({ rank, chunk, score, scoreLabel }: { rank: number; chunk: Chunk; score: string; scoreLabel: string }) {
  return (
    <div className="rounded-md border border-border bg-card p-3 shadow-sm text-xs">
      <div className="flex items-center gap-2 mb-1.5">
        {rankBadge(rank)}
        <span className="font-semibold text-foreground truncate">{chunk.chapter}</span>
      </div>
      <p className="text-foreground/80 leading-relaxed mb-2 line-clamp-3">{chunk.text}</p>
      <div className="flex flex-wrap gap-2 text-muted-foreground mb-1.5">
        <span className="flex items-center gap-0.5"><BookOpen className="h-3 w-3" />{chunk.source}</span>
        <span className="flex items-center gap-0.5"><FileText className="h-3 w-3" />p.{chunk.page}</span>
      </div>
      <div className="font-mono text-xs">
        {scoreLabel}: <strong className="text-primary">{score}</strong>
      </div>
    </div>
  );
}

interface ComparePanelProps {
  tfidfResults: TFIDFResult[];
  lshResults: LSHBandedResult[];
  minhashResults: MinHashResult[];
  simhashResults: SimHashResult[];
  tfidfTimeMs: number;
  lshTimeMs: number;
  minhashTimeMs: number;
  simhashTimeMs: number;
}

const ComparePanel = ({
  tfidfResults, lshResults, minhashResults, simhashResults,
  tfidfTimeMs, lshTimeMs, minhashTimeMs, simhashTimeMs,
}: ComparePanelProps) => {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-4 shadow-sm">
      <h3 className="text-lg font-bold text-foreground mb-4 font-display">Side-by-Side Comparison</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Column title="TF-IDF (Exact)" timeMs={tfidfTimeMs}>
          {tfidfResults.map((r, i) => {
            const chunk = getChunk(r.docId);
            if (!chunk) return null;
            return <MiniCard key={r.docId} rank={i + 1} chunk={chunk} score={`${(r.cosineSimilarity * 100).toFixed(1)}%`} scoreLabel="Cosine" />;
          })}
        </Column>
        <Column title="MinHash + LSH" timeMs={lshTimeMs}>
          {lshResults.map((r, i) => {
            const chunk = getChunk(r.docId);
            if (!chunk) return null;
            return <MiniCard key={r.docId} rank={i + 1} chunk={chunk} score={`${(r.exactJaccard * 100).toFixed(1)}%`} scoreLabel="Jaccard" />;
          })}
        </Column>
        <Column title="MinHash" timeMs={minhashTimeMs}>
          {minhashResults.map((r, i) => {
            const chunk = getChunk(r.docId);
            if (!chunk) return null;
            return <MiniCard key={r.docId} rank={i + 1} chunk={chunk} score={`${(r.estimatedJaccard * 100).toFixed(1)}%`} scoreLabel="Est. Jaccard" />;
          })}
        </Column>
        <Column title="SimHash" timeMs={simhashTimeMs}>
          {simhashResults.map((r, i) => {
            const chunk = getChunk(r.docId);
            if (!chunk) return null;
            return <MiniCard key={r.docId} rank={i + 1} chunk={chunk} score={`${(r.similarity * 100).toFixed(1)}%`} scoreLabel="Similarity" />;
          })}
        </Column>
      </div>
    </div>
  );
};

export default ComparePanel;
