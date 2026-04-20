import { Target } from "lucide-react";

interface AnswerBoxProps {
  answer: string;
}

// Very basic inline markdown to HTML converter for Bolds and links.
function formatMarkdownLine(line: string) {
  let html = line
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\((.*?)\)/g, '<a href="$2" class="text-green-700 underline" target="_blank" rel="noopener noreferrer">$1</a>');
  
  // Add bullet points for lines starting with "- " or "* "
  if (line.startsWith("- ") || line.trim().startsWith("* ")) {
    html = `<span class="mr-2 text-green-700 font-bold">•</span> ${html.replace(/^[\s\-*]+/, "")}`;
  }
  return { __html: html };
}

const AnswerBox = ({ answer }: AnswerBoxProps) => {
  if (!answer) return null;

  // Split on newlines, filtering out completely empty lines
  const lines = answer.split('\n').filter(line => line.trim());
  
  return (
    <div className="rounded-lg border-l-4 border-green-500 bg-green-50 p-5 shadow-sm mb-6 animate-fade-in">
      <div className="flex items-center gap-2 mb-4">
        <Target className="h-5 w-5 text-green-600" />
        <h2 className="text-lg font-bold text-green-900 flex items-center">
          🎯 Direct Answer
        </h2>
      </div>
      
      <div className="space-y-2">
        {lines.map((line, idx) => (
          <div 
            key={idx} 
            className="text-sm text-green-800 leading-relaxed"
            dangerouslySetInnerHTML={formatMarkdownLine(line)}
          />
        ))}
      </div>
    </div>
  );
};

export default AnswerBox;
