import { handbookChunks } from "@/data/handbookChunks";
import { MessageCircleQuestion } from "lucide-react";

const sampleQueries = [
  "What is the minimum GPA requirement?",
  "What happens if a student fails a course?",
  "What is the attendance policy?",
  "How many times can a course be repeated?",
  "What are the PhD publication requirements?",
];

interface SuggestionsProps {
  onSelect: (query: string) => void;
}

const Suggestions = ({ onSelect }: SuggestionsProps) => {
  return (
    <div className="text-center space-y-5">
      <div className="flex items-center justify-center gap-2 text-muted-foreground">
        <MessageCircleQuestion className="h-4 w-4" />
        <p className="text-sm font-semibold">Try a sample query</p>
      </div>
      <div className="flex flex-wrap justify-center gap-2 max-w-2xl mx-auto">
        {sampleQueries.map((q) => (
          <button
            key={q}
            onClick={() => onSelect(q)}
            className="rounded-full border border-border bg-card px-4 py-2 text-sm text-foreground hover:bg-primary hover:text-primary-foreground transition-colors shadow-sm"
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
