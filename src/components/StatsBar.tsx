// Project source file for stats bar.
import { Database, Clock, Filter, BarChart3 } from "lucide-react";
import type { RetrievalMethod } from "@/hooks/useLSH";

interface StatsBarProps {
  totalDocs: number;
  candidateCount: number;
  lshTimeMs: number;
  tfidfTimeMs: number;
  minhashTimeMs: number;
  simhashTimeMs: number;
  hasSearched: boolean;
  method: RetrievalMethod;
}

const methodLabel: Record<RetrievalMethod, string> = {
  lsh: "LSH",
  tfidf: "TF-IDF",
  minhash: "MinHash",
  simhash: "SimHash",
};

const StatsBar = ({ totalDocs, candidateCount, lshTimeMs, tfidfTimeMs, minhashTimeMs, simhashTimeMs, hasSearched, method }: StatsBarProps) => {
  if (!hasSearched) return null;

  const timeMap: Record<RetrievalMethod, number> = { lsh: lshTimeMs, tfidf: tfidfTimeMs, minhash: minhashTimeMs, simhash: simhashTimeMs };

  const stats = [
    { icon: Database, label: "Chunks", value: String(totalDocs) },
    { icon: Clock, label: `${methodLabel[method]} Time`, value: `${timeMap[method].toFixed(2)} ms` },
  ];

  if (method === "lsh") {
    stats.push(
      { icon: Filter, label: "LSH Candidates", value: String(candidateCount) },
      { icon: BarChart3, label: "Pruned", value: `${((1 - candidateCount / totalDocs) * 100).toFixed(0)}%` },
    );
  }

  // Comparison times
  const others = (["lsh", "tfidf", "minhash", "simhash"] as const).filter((m) => m !== method);

  return (
    <div className="animate-fade-in flex flex-wrap justify-center gap-3 text-sm">
      {stats.map(({ icon: Icon, label, value }) => (
        <div key={label} className="flex items-center gap-2 rounded-md bg-card border border-border px-3 py-2 shadow-sm">
          <Icon className="h-4 w-4 text-primary" />
          <span className="text-muted-foreground">{label}:</span>
          <strong className="text-foreground font-mono">{value}</strong>
        </div>
      ))}
      {others.map((m) => (
        <div key={m} className="flex items-center gap-2 rounded-md bg-accent border border-border px-3 py-2 shadow-sm">
          <Clock className="h-4 w-4 text-accent-foreground" />
          <span className="text-muted-foreground">{methodLabel[m]}:</span>
          <strong className="text-foreground font-mono">{timeMap[m].toFixed(2)} ms</strong>
        </div>
      ))}
    </div>
  );
};

export default StatsBar;
