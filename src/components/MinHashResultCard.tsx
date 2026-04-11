import type { MinHashResult } from "@/lib/minhash";
import type { Chunk } from "@/data/Ugchunk";
import { ugChunks } from "@/data/Ugchunk";
import { pgChunks } from "@/data/Pgchunks";
import { BookOpen, FileText, Hash, Fingerprint } from "lucide-react";
import { getQueryWords } from "@/lib/answerExtractor";
import { HighlightedText } from "@/lib/highlightExtractor";

interface MinHashResultCardProps {
  result: MinHashResult;
  rank: number;
  query?: string;
}

function getChunk(id: number): Chunk | undefined {
  const allChunks = [...ugChunks, ...pgChunks];
  return allChunks.find((c) => c.id === id);
}

function scoreColor(sim: number): string {
  if (sim >= 0.3) return "text-success";
  if (sim >= 0.1) return "text-warning";
  return "text-muted-foreground";
}

const MinHashResultCard = ({ result, rank, query }: MinHashResultCardProps) => {
  const chunk = getChunk(result.docId);
  if (!chunk) return null;

  const queryWords = query ? getQueryWords(query) : [];

  return (
    <div className="animate-fade-in rounded-lg border border-border bg-card p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <span className="flex items-center justify-center h-7 w-7 rounded-full bg-info text-info-foreground text-xs font-bold">
            {rank}
          </span>
          <h3 className="font-display text-lg font-semibold text-foreground">{chunk.chapter}</h3>
        </div>
        <span className="flex items-center gap-1 rounded-full bg-accent px-2.5 py-0.5 text-xs font-semibold text-accent-foreground">
          <Fingerprint className="h-3 w-3" /> MinHash
        </span>
      </div>

      <p className="text-foreground/80 text-sm leading-relaxed mb-4">
        <HighlightedText text={chunk.text} queryWords={queryWords} />
      </p>

      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><BookOpen className="h-3.5 w-3.5" />{chunk.source}</span>
        <span className="flex items-center gap-1"><FileText className="h-3.5 w-3.5" />{chunk.chapter}</span>
        <span className="flex items-center gap-1"><Hash className="h-3.5 w-3.5" />Page {chunk.page}</span>
      </div>

      <div className="mt-3 pt-3 border-t border-border flex gap-6 text-xs font-mono">
        <span>
          Est. Jaccard: <strong className={scoreColor(result.estimatedJaccard)}>{(result.estimatedJaccard * 100).toFixed(1)}%</strong>
        </span>
        <span>
          Exact Jaccard: <strong className={scoreColor(result.exactJaccard)}>{(result.exactJaccard * 100).toFixed(1)}%</strong>
        </span>
      </div>
    </div>
  );
};

export default MinHashResultCard;
