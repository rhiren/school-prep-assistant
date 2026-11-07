interface QuestionNavProps {
  questionIds: string[];
  currentIndex: number;
  answeredIds: string[];
  flaggedIds?: string[];
  onSelect: (index: number) => void;
}

export function QuestionNav({
  questionIds,
  currentIndex,
  answeredIds,
  flaggedIds = [],
  onSelect,
}: QuestionNavProps) {
  return (
    <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
      {questionIds.map((questionId, index) => {
        const isAnswered = answeredIds.includes(questionId);
        const isFlagged = flaggedIds.includes(questionId);
        const isCurrent = index === currentIndex;

        return (
          <button
            aria-current={isCurrent ? "true" : undefined}
            aria-label={`Question ${index + 1}${isAnswered ? ", answered" : ", unanswered"}${isFlagged ? ", flagged" : ""}`}
            key={questionId}
            className={`rounded-2xl border px-3 py-2 text-sm font-medium transition ${
              isCurrent
                ? "border-accent bg-accent text-white"
                : isFlagged
                  ? "border-amber-400 bg-amber-100 text-amber-900"
                : isAnswered
                  ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                  : "border-rose-300 bg-rose-50 text-rose-800 ring-1 ring-rose-200"
            }`}
            onClick={() => onSelect(index)}
            type="button"
          >
            <span className="block">Q{index + 1}</span>
            <span className="block text-[10px] uppercase tracking-normal opacity-75">
              {isFlagged ? "Flagged" : isAnswered ? "Done" : "Open"}
            </span>
          </button>
        );
      })}
    </div>
  );
}
