import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ScoreSummary } from "../components/ScoreSummary";
import type { Question, TestAttempt } from "../domain/models";
import { useAppServices, useStudentProfiles } from "../state/AppServicesProvider";
import { useTestMode } from "../state/TestModeProvider";
import { formatDate } from "../utils/format";

export function ResultsPage() {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const { contentRepository, progressService, testGenerationService } = useAppServices();
  const { activeProfile } = useStudentProfiles();
  const { setIsTestMode } = useTestMode();
  const [attempt, setAttempt] = useState<TestAttempt | null>(null);
  const [questionsById, setQuestionsById] = useState<Record<string, Question>>({});
  const [testSetTitle, setTestSetTitle] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    setIsTestMode(false);
  }, [setIsTestMode]);

  useEffect(() => {
    if (!attemptId) {
      return;
    }

    progressService.getAttempt(attemptId).then(async (loadedAttempt) => {
      if (!loadedAttempt) {
        setAttempt(null);
        return;
      }

      setAttempt(loadedAttempt);
      const pairs = await Promise.all(
        loadedAttempt.questionIds.map(async (questionId) => {
          const question = await contentRepository.getQuestionById(questionId);
          return [questionId, question] as const;
        }),
      );
      setQuestionsById(
        Object.fromEntries(
          pairs.filter((entry): entry is [string, Question] => Boolean(entry[1])),
        ),
      );

      if (loadedAttempt.testSetId) {
        const testSet = await contentRepository.getTestSet(loadedAttempt.testSetId);
        setTestSetTitle(testSet?.title ?? null);
      } else {
        setTestSetTitle(null);
      }
    });
  }, [activeProfile?.studentId, attemptId, contentRepository, progressService]);

  if (!attempt) {
    return <div className="panel panel-padding">Attempt not found.</div>;
  }

  const incorrectResults = attempt.results.filter((result) => !result.isCorrect);
  const feedbackResults = attempt.results.filter((result) => result.feedbackTip);
  const handleRetry = async () => {
    if (!attempt.conceptId) {
      return;
    }

    setIsRetrying(true);
    const session = await testGenerationService.createConceptSession(
      attempt.conceptId,
      attempt.testSetId,
    );
    navigate(`/test/${session.id}`);
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            className="text-sm font-medium text-accent"
            to={attempt.conceptId ? `/concept/${attempt.conceptId}` : "/progress"}
          >
            Back
          </Link>
          <h2 className="mt-2 text-3xl font-semibold text-ink">Results Summary</h2>
          <p className="mt-2 text-sm text-stone-600">
            Submitted on {formatDate(attempt.submittedAt)}
          </p>
        </div>
        {attempt.conceptId ? (
          <button
            className="action-link"
            disabled={isRetrying}
            onClick={() => void handleRetry()}
            type="button"
          >
            {isRetrying ? "Creating retry..." : "Retry Concept Test"}
          </button>
        ) : null}
      </div>

      <div className="panel panel-padding space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-ink">Score summary</h3>
          <p className="mt-1 text-sm text-stone-600">
            Review the overall outcome first, then focus on the missed questions below.
          </p>
          {testSetTitle ? (
            <p className="mt-2 text-sm text-stone-500">Completed set: {testSetTitle}</p>
          ) : null}
        </div>
        <ScoreSummary summary={attempt.summary} />
      </div>

      <div className="panel panel-padding">
        <h3 className="text-lg font-semibold text-ink">Next step</h3>
        <p className="mt-2 text-sm leading-6 text-stone-600">
          {attempt.summary.percentage >= 85
            ? "Nice work. Review any notes below, then try another set or move ahead in the course."
            : "Review the explanation for each missed question, then retry this concept when you are ready."}
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          {attempt.conceptId ? (
            <>
              <button
                className="action-link"
                disabled={isRetrying}
                onClick={() => void handleRetry()}
                type="button"
              >
                {isRetrying ? "Creating retry..." : "Retry this test"}
              </button>
              <Link className="secondary-link" to={`/concept/${attempt.conceptId}`}>
                Back to concept
              </Link>
              <Link className="secondary-link" to={`/concept/${attempt.conceptId}/tutorial`}>
                Review tutorial
              </Link>
            </>
          ) : null}
          <Link className="secondary-link" to="/progress">
            View progress
          </Link>
        </div>
      </div>

      {feedbackResults.length > 0 ? (
        <article className="panel panel-padding">
          <h3 className="text-lg font-semibold text-ink">Answer notes</h3>
          <div className="mt-4 space-y-3">
            {feedbackResults.map((result) => {
              const question = questionsById[result.questionId];
              if (!question || !result.feedbackTip) {
                return null;
              }

              return (
                <div
                  key={result.questionId}
                  className="rounded-2xl border border-stone-200 bg-white px-4 py-4"
                >
                  <div className="font-semibold text-ink">{question.prompt}</div>
                  <div className="mt-2 text-sm text-stone-600">{result.feedbackTip}</div>
                </div>
              );
            })}
          </div>
        </article>
      ) : null}

      <article className="panel panel-padding">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-ink">Incorrect answer review</h3>
          <span className="text-sm text-stone-500">{incorrectResults.length} item(s)</span>
        </div>
        <div className="mt-5 space-y-4">
          {incorrectResults.length === 0 ? (
            <p className="text-sm text-stone-600">
              No incorrect responses on this attempt.
            </p>
          ) : (
            incorrectResults.map((result) => {
              const question = questionsById[result.questionId];
              if (!question) {
                return null;
              }

              return (
                <article
                  key={result.questionId}
                  className="rounded-2xl border border-stone-200 bg-white px-4 py-4"
                >
                  <div className="text-sm font-semibold uppercase tracking-[0.2em] text-rose-600">
                    Incorrect question
                  </div>
                  <h4 className="mt-2 text-base font-semibold text-ink">{question.prompt}</h4>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-stone-700">
                      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-700">
                        Selected answer
                      </div>
                      <div className="mt-2 font-medium text-ink">
                        {result.submittedAnswer ?? "No answer"}
                      </div>
                    </div>
                    <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-stone-700">
                      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
                        Correct answer
                      </div>
                      <div className="mt-2 font-medium text-ink">{result.correctAnswer}</div>
                    </div>
                  </div>
                  <details className="mt-4 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
                    <summary className="cursor-pointer text-sm font-semibold text-ink">
                      View explanation
                    </summary>
                    <p className="mt-3 text-sm leading-6 text-stone-600">
                      {question.explanation}
                    </p>
                  </details>
                </article>
              );
            })
          )}
        </div>
      </article>
    </section>
  );
}
