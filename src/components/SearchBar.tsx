import { Search } from "lucide-react";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: () => void;
  placeholder?: string;
}

const SearchBar = ({ value, onChange, onSearch, placeholder = "Ask about NUST academic policies..." }: SearchBarProps) => {
  return (
    <div className="relative w-full max-w-2xl mx-auto">
      <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-3 shadow-sm focus-within:ring-2 focus-within:ring-ring focus-within:border-primary transition-all">
        <Search className="h-5 w-5 text-muted-foreground shrink-0" />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSearch()}
          placeholder={placeholder}
          className="flex-1 bg-transparent outline-none text-foreground placeholder:text-muted-foreground font-body text-base"
        />
        <button
          onClick={onSearch}
          className="shrink-0 rounded-md bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
        >
          Search
        </button>
      </div>
    </div>
  );
};

export default SearchBar;
