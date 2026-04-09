import { Database, Clock, Filter, FileText } from "lucide-react";

interface StatsBarProps {
  totalDocs: number;
  candidateCount: number;
  queryTimeMs: number;
  hasSearched: boolean;
}

const StatsBar = ({ totalDocs, candidateCount, queryTimeMs, hasSearched }: StatsBarProps) => {
  if (!hasSearched) return null;

  return (
    <div className="animate-fade-in flex flex-wrap justify-center gap-4 text-sm">
      {[
        { icon: Database, label: "Total Chunks", value: totalDocs },
        { icon: Filter, label: "LSH Candidates", value: candidateCount },
        { icon: Clock, label: "Query Time", value: `${queryTimeMs.toFixed(2)} ms` },
        { icon: FileText, label: "Pruned", value: `${((1 - candidateCount / totalDocs) * 100).toFixed(0)}%` },
      ].map(({ icon: Icon, label, value }) => (
        <div key={label} className="flex items-center gap-2 rounded-md bg-card border border-border px-3 py-2 shadow-sm">
          <Icon className="h-4 w-4 text-primary" />
          <span className="text-muted-foreground">{label}:</span>
          <strong className="text-foreground font-mono">{value}</strong>
        </div>
      ))}
    </div>
  );
};

export default StatsBar;
