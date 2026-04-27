// Project source file for metrics panel.
import { Clock, Database, Filter, BarChart3, Layers } from "lucide-react";
import type { RetrievalMethod } from "@/hooks/useLSH";

const methodLabel: Record<RetrievalMethod, string> = {
  lsh: "MinHash + LSH (Banded)",
  tfidf: "TF-IDF (Exact)",
  minhash: "MinHash (Standalone)",
  simhash: "SimHash",
};

interface MetricsPanelProps {
  method: RetrievalMethod;
  timeMs: number;
  totalDocs: number;
  candidateCount: number;
  resultsReturned: number;
}

const MetricsPanel = ({ method, timeMs, totalDocs, candidateCount, resultsReturned }: MetricsPanelProps) => {
  const metrics = [
    { icon: Clock, label: "Query Latency", value: `${timeMs.toFixed(2)} ms` },
    { icon: Layers, label: "Method Used", value: methodLabel[method] },
    { icon: Database, label: "Candidates Evaluated", value: method === "lsh" ? String(candidateCount) : String(totalDocs) },
    { icon: BarChart3, label: "Results Returned", value: String(resultsReturned) },
  ];

  if (method === "lsh") {
    metrics.push({
      icon: Filter,
      label: "Pruned",
      value: `${((1 - candidateCount / totalDocs) * 100).toFixed(0)}%`,
    });
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-primary" />
        Search Metrics
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {metrics.map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex flex-col gap-0.5">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Icon className="h-3 w-3" /> {label}
            </span>
            <strong className="text-sm font-mono text-foreground">{value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MetricsPanel;
