import type { QueryResult } from "@/lib/lsh";
import type { HandbookChunk } from "@/data/handbookChunks";
import { handbookChunks } from "@/data/handbookChunks";
import { BookOpen, FileText, Hash, Zap } from "lucide-react";

interface ResultCardProps {
  result: QueryResult;
  rank: number;
}

function getChunk(id: number): HandbookChunk | undefined {
  return handbookChunks.find((c) => c.id === id);
}

function similarityColor(sim: number): string {
  if (sim >= 0.4) return "text-success";
  if (sim >= 0.2) return "text-warning";
  return "text-muted-foreground";
}

const ResultCard = ({ result, rank }: ResultCardProps) => {
  const chunk = getChunk(result.docId);
  if (!chunk) return null;

  return (
    <div className="animate-fade-in rounded-lg border border-border bg-card p-5 shadow-sm hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <span className="flex items-center justify-center h-7 w-7 rounded-full bg-primary text-primary-foreground text-xs font-bold">
            {rank}
          </span>
          <h3 className="font-display text-lg font-semibold text-foreground">{chunk.section}</h3>
        </div>
        {result.isCandidateFromLSH && (
          <span className="flex items-center gap-1 rounded-full bg-secondary/30 px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground">
            <Zap className="h-3 w-3" /> LSH Hit
          </span>
        )}
      </div>

      {/* Body */}
      <p className="text-foreground/80 text-sm leading-relaxed mb-4">{chunk.text}</p>

      {/* Meta row */}
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><BookOpen className="h-3.5 w-3.5" />{chunk.source}</span>
        <span className="flex items-center gap-1"><FileText className="h-3.5 w-3.5" />{chunk.chapter}</span>
        <span className="flex items-center gap-1"><Hash className="h-3.5 w-3.5" />Page {chunk.page}</span>
      </div>

      {/* Similarity scores */}
      <div className="mt-3 pt-3 border-t border-border flex gap-6 text-xs font-mono">
        <span>
          Jaccard: <strong className={similarityColor(result.jaccardSimilarity)}>{(result.jaccardSimilarity * 100).toFixed(1)}%</strong>
        </span>
        <span>
          MinHash Est: <strong className={similarityColor(result.estimatedSimilarity)}>{(result.estimatedSimilarity * 100).toFixed(1)}%</strong>
        </span>
      </div>
    </div>
  );
};

export default ResultCard;
