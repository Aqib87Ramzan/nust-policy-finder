import { handbookChunks } from "@/data/handbookChunks";

const sampleQueries = [
  "What is the attendance policy?",
  "minimum CGPA for PhD degree",
  "course repetition rules",
  "withdrawal from university",
  "GPA grading scale",
  "summer semester credit hours",
  "PhD qualifying examination",
  "probation conditions",
];

interface SuggestionsProps {
  onSelect: (query: string) => void;
}

const Suggestions = ({ onSelect }: SuggestionsProps) => {
  return (
    <div className="text-center space-y-4">
      <p className="text-sm text-muted-foreground">Try a sample query:</p>
      <div className="flex flex-wrap justify-center gap-2 max-w-2xl mx-auto">
        {sampleQueries.map((q) => (
          <button
            key={q}
            onClick={() => onSelect(q)}
            className="rounded-full border border-border bg-card px-3 py-1.5 text-sm text-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            {q}
          </button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground mt-6">
        {handbookChunks.length} policy chunks indexed from NUST handbooks
      </p>
    </div>
  );
};

export default Suggestions;
