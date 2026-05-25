import { Flame } from 'lucide-react';

interface Keyword {
  keyword: string;
  count: number;
}

interface TrendingKeywordsProps {
  keywords?: Keyword[];
  onKeywordClick?: (keyword: string) => void;
}

export default function TrendingKeywords({ keywords = [], onKeywordClick }: TrendingKeywordsProps) {
  if (!keywords || keywords.length === 0) return null;

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-secondary/10 border-b border-border/30 overflow-x-auto scrollbar-none shrink-0">
      <span className="flex items-center gap-1 text-[11px] font-bold text-primary shrink-0 uppercase tracking-tight">
        <Flame className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
        <span>Trending:</span>
      </span>
      <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
        {keywords.slice(0, 5).map((kw, index) => (
          <button
            key={index}
            onClick={() => onKeywordClick?.(kw.keyword)}
            className="px-2.5 py-0.5 bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-all rounded-full text-xs font-medium shrink-0"
          >
            #{kw.keyword}
          </button>
        ))}
      </div>
    </div>
  );
}
