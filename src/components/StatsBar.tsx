import { Database, Clock, Filter, FileText, BarChart3 } from "lucide-react";
import type { RetrievalMethod } from "@/hooks/useLSH";

interface StatsBarProps {
  totalDocs: number;
  candidateCount: number;
  lshTimeMs: number;
  tfidfTimeMs: number;
  hasSearched: boolean;
  method: RetrievalMethod;
}

const StatsBar = ({ totalDocs, candidateCount, lshTimeMs, tfidfTimeMs, hasSearched, method }: StatsBarProps) => {
  if (!hasSearched) return null;

  const stats = method === "lsh"
    ? [
        { icon: Database, label: "Total Chunks", value: totalDocs },
        { icon: Filter, label: "LSH Candidates", value: candidateCount },
        { icon: Clock, label: "LSH Time", value: `${lshTimeMs.toFixed(2)} ms` },
        { icon: BarChart3, label: "Pruned", value: `${((1 - candidateCount / totalDocs) * 100).toFixed(0)}%` },
      ]
    : [
        { icon: Database, label: "Total Chunks", value: totalDocs },
        { icon: Clock, label: "TF-IDF Time", value: `${tfidfTimeMs.toFixed(2)} ms` },
        { icon: BarChart3, label: "Compared", value: `${totalDocs} docs` },
      ];

  return (
    <div className="animate-fade-in flex flex-wrap justify-center gap-3 text-sm">
      {stats.map(({ icon: Icon, label, value }) => (
        <div key={label} className="flex items-center gap-2 rounded-md bg-card border border-border px-3 py-2 shadow-sm">
          <Icon className="h-4 w-4 text-primary" />
          <span className="text-muted-foreground">{label}:</span>
          <strong className="text-foreground font-mono">{String(value)}</strong>
        </div>
      ))}
      {/* Always show comparison */}
      <div className="flex items-center gap-2 rounded-md bg-accent border border-border px-3 py-2 shadow-sm">
        <Clock className="h-4 w-4 text-accent-foreground" />
        <span className="text-muted-foreground">vs {method === "lsh" ? "TF-IDF" : "LSH"}:</span>
        <strong className="text-foreground font-mono">
          {method === "lsh" ? `${tfidfTimeMs.toFixed(2)} ms` : `${lshTimeMs.toFixed(2)} ms`}
        </strong>
      </div>
    </div>
  );
};

export default StatsBar;
