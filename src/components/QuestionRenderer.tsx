import type { AnswerRecord, Question } from "../domain/models";
import {
  isRatioQuestion,
  usesFractionRatioNotation,
} from "../utils/answerNormalization";

interface QuestionRendererProps {
  question: Question;
  answer?: AnswerRecord;
  onAnswerChange: (value: string) => void;
  onAnswerCommit?: (value: string) => void;
  hideHint?: boolean;
}

export function QuestionRenderer({
  question,
  answer,
  onAnswerChange,
  onAnswerCommit,
  hideHint,
}: QuestionRendererProps) {
  const showRatioHelper = isRatioQuestion(question) && question.questionType !== "multiple_choice";
  const showRatioTip =
    showRatioHelper && usesFractionRatioNotation(answer?.response ?? "");

  if (question.questionType === "multiple_choice") {
    return (
      <fieldset className="space-y-4">
        <legend className="mb-5 text-xl font-semibold leading-8 text-ink sm:text-2xl">
          {question.prompt}
        </legend>
        {question.choices?.map((choice) => (
          <label
            key={choice.id}
            className="flex cursor-pointer items-start gap-3 rounded-2xl border border-stone-200 bg-white px-4 py-4 text-base leading-7"
          >
            <input
              checked={answer?.response === choice.value}
              className="mt-1"
              name={question.id}
              onChange={() => onAnswerChange(choice.value)}
              type="radio"
            />
            <span>
              <span className="mr-2 font-semibold text-accent">{choice.label}</span>
              {choice.value}
            </span>
          </label>
        ))}
      </fieldset>
    );
  }

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-semibold leading-8 text-ink sm:text-2xl">
        {question.prompt}
      </h2>
      <input
        className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-4 text-base outline-none ring-0 transition focus:border-accent"
        onChange={(event) => onAnswerChange(event.target.value)}
        onBlur={(event) => onAnswerCommit?.(event.target.value)}
        placeholder={
          showRatioHelper
            ? "Enter ratio using ':' (e.g., 2:3)"
            : question.questionType === "numeric"
            ? "Enter a numeric answer"
            : "Type your answer"
        }
        type="text"
        value={answer?.response ?? ""}
      />
      {showRatioHelper ? (
        <p className="text-sm text-stone-500">
          Enter ratio using ":" (e.g., 2:3)
        </p>
      ) : null}
      {showRatioTip ? (
        <p className="text-sm text-accent">
          Tip: this answer can still be correct, but ratios are usually written with ":"
          like 2:3.
        </p>
      ) : null}
      {question.hint && !hideHint ? (
        <p className="text-sm text-stone-500">Hint: {question.hint}</p>
      ) : null}
    </div>
  );
}
