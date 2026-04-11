import type { TFIDFResult } from "@/lib/tfidf";
import type { Chunk } from "@/data/Ugchunk";
import { ugChunks } from "@/data/Ugchunk";
import { BookOpen, FileText, Hash } from "lucide-react";

interface TFIDFResultCardProps {
  result: TFIDFResult;
  rank: number;
}

function getChunk(id: number): Chunk | undefined {
  return ugChunks.find((c) => c.id === id);
}

function scoreColor(sim: number): string {
  if (sim >= 0.3) return "text-success";
  if (sim >= 0.1) return "text-warning";
  return "text-muted-foreground";
}

const TFIDFResultCard = ({ result, rank }: TFIDFResultCardProps) => {
  const chunk = getChunk(result.docId);
  if (!chunk) return null;

  return (
    <div className="animate-fade-in rounded-lg border border-border bg-card p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <span className="flex items-center justify-center h-7 w-7 rounded-full bg-secondary text-secondary-foreground text-xs font-bold">
            {rank}
          </span>
          <h3 className="font-display text-lg font-semibold text-foreground">{chunk.chapter}</h3>
        </div>
        <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-semibold text-accent-foreground">
          TF-IDF
        </span>
      </div>

      <p className="text-foreground/80 text-sm leading-relaxed mb-4">{chunk.text}</p>

      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><BookOpen className="h-3.5 w-3.5" />{chunk.source}</span>
        <span className="flex items-center gap-1"><FileText className="h-3.5 w-3.5" />{chunk.chapter}</span>
        <span className="flex items-center gap-1"><Hash className="h-3.5 w-3.5" />Page {chunk.page}</span>
      </div>

      <div className="mt-3 pt-3 border-t border-border flex gap-6 text-xs font-mono">
        <span>
          Cosine Sim: <strong className={scoreColor(result.cosineSimilarity)}>{(result.cosineSimilarity * 100).toFixed(1)}%</strong>
        </span>
      </div>
    </div>
  );
};

export default TFIDFResultCard;
