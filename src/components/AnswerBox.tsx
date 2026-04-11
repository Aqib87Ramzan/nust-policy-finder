import { Target } from "lucide-react";

interface AnswerBoxProps {
  answer: string;
}

const AnswerBox = ({ answer }: AnswerBoxProps) => {
  if (!answer) return null;

  const lines = answer.split('\n')
  
  return (
    <div className="rounded-lg border-l-4 border-green-500 bg-green-50 p-5 shadow-sm mb-6 animate-fade-in">
      <div className="flex items-center gap-2 mb-4">
        <Target className="h-5 w-5 text-green-600" />
        <h2 className="text-lg font-bold text-green-900 flex items-center">
          🎯 Direct Answer
        </h2>
      </div>
      
      <div className="space-y-3">
        {lines.filter(line => line.trim()).map((line, idx) => (
          <div key={idx} className="text-sm text-green-800 leading-relaxed">
            {line}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AnswerBox;
