import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { QuestionNav } from "../components/QuestionNav";
import { QuestionRenderer } from "../components/QuestionRenderer";
import type { Question, TestSession } from "../domain/models";
import { useAppServices, useStudentProfiles } from "../state/AppServicesProvider";
import { useTestMode } from "../state/TestModeProvider";

export function TestPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { contentRepository, sessionService } = useAppServices();
  const { activeProfile } = useStudentProfiles();
  const { setIsTestMode } = useTestMode();
  const [session, setSession] = useState<TestSession | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [flaggedQuestionIds, setFlaggedQuestionIds] = useState<string[]>([]);

  useEffect(() => {
    setIsTestMode(true);
    return () => {
      setIsTestMode(false);
    };
  }, [setIsTestMode]);

  useEffect(() => {
    if (!sessionId) {
      return;
    }

    sessionService.getSession(sessionId).then(async (loadedSession) => {
      if (!loadedSession) {
        setSession(null);
        setQuestions([]);
        return;
      }

      setSession(loadedSession);
      const loadedQuestions = await Promise.all(
        loadedSession.questionIds.map((questionId) =>
          contentRepository.getQuestionById(questionId),
        ),
      );
      setQuestions(loadedQuestions.filter((question): question is Question => Boolean(question)));
    });
  }, [activeProfile?.studentId, contentRepository, sessionId, sessionService]);

  const currentQuestion = useMemo(() => {
    if (!session) {
      return null;
    }

    return questions[session.currentQuestionIndex] ?? null;
  }, [questions, session]);

  const answeredIds = Object.keys(session?.answers ?? {}).filter((questionId) => {
    const response = session?.answers[questionId]?.response ?? "";
    return response.trim() !== "";
  });
  const unansweredIndexes = questions
    .map((question, index) => ({ question, index }))
    .filter(({ question }) => !answeredIds.includes(question.id))
    .map(({ index }) => index);

  if (!session || !currentQuestion) {
    return <div className="panel panel-padding">Session not found.</div>;
  }

  const handleAnswerChange = async (value: string) => {
    const answer = {
      questionId: currentQuestion.id,
      response: value,
      answeredAt: new Date().toISOString(),
    };

    setSession((current) =>
      current
        ? {
            ...current,
            answers: {
              ...current.answers,
              [currentQuestion.id]: answer,
            },
          }
        : current,
    );
    await sessionService.saveAnswer(session.id, answer);
  };

  const handleSelectIndex = async (index: number) => {
    setSession((current) =>
      current ? { ...current, currentQuestionIndex: index } : current,
    );
    await sessionService.setCurrentQuestionIndex(session.id, index);
  };

  const handleSubmit = async () => {
    if (unansweredIndexes.length > 0) {
      const confirmed = window.confirm(
        `You still have ${unansweredIndexes.length} unanswered question${unansweredIndexes.length === 1 ? "" : "s"}. Submit anyway?`,
      );

      if (!confirmed) {
        return;
      }
    }

    setIsSubmitting(true);
    const attempt = await sessionService.submitSession(session.id);
    navigate(`/results/${attempt.attemptId}`);
  };

  const handleReviewUnanswered = async () => {
    if (unansweredIndexes.length === 0) {
      return;
    }

    await handleSelectIndex(unansweredIndexes[0]);
  };

  const toggleFlagForCurrentQuestion = () => {
    setFlaggedQuestionIds((current) =>
      current.includes(currentQuestion.id)
        ? current.filter((questionId) => questionId !== currentQuestion.id)
        : [...current, currentQuestion.id],
    );
  };

  const isCurrentQuestionAnswered = answeredIds.includes(currentQuestion.id);
  const isCurrentQuestionFlagged = flaggedQuestionIds.includes(currentQuestion.id);
  const isLastQuestion = session.currentQuestionIndex === questions.length - 1;
  const sessionTitle = session.smartRetry ? "Smart Retry Session" : "Concept Test Session";

  return (
    <section className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="panel panel-padding">
          <Link className="text-sm font-medium text-accent" to={`/concept/${session.conceptId}`}>
            Back to concept
          </Link>
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.25em] text-accent">
            Question {session.currentQuestionIndex + 1} of {questions.length}
          </p>
          <h2 className="mt-2 text-3xl font-semibold text-ink">{sessionTitle}</h2>
          <p className="mt-2 text-sm text-stone-600">
            {session.smartRetry
              ? "This is a short 5-question targeted retry. Finish it, then return to your normal learning sequence."
              : "Autosave writes answers and current question position into local persistence."}
          </p>
        </div>

        <div className="panel panel-padding text-sm text-stone-600">
          <div className="grid gap-3 sm:grid-cols-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
                Status
              </div>
              <div className="mt-1 font-semibold text-ink">
                {session.status.replace("_", " ")}
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
                Answered
              </div>
              <div className="mt-1 font-semibold text-ink">{answeredIds.length}</div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
                Unanswered
              </div>
              <div className="mt-1 font-semibold text-rose-700">{unansweredIndexes.length}</div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
                Flagged
              </div>
              <div className="mt-1 font-semibold text-amber-700">
                {flaggedQuestionIds.length}
              </div>
            </div>
          </div>
        </div>
      </div>

      <aside className="panel panel-padding space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-ink">Question navigation</h3>
            <p className="mt-1 text-sm text-stone-600">
              Jump to any question and keep track of what still needs attention.
            </p>
          </div>
          <button
            className="secondary-link"
            disabled={unansweredIndexes.length === 0}
            onClick={() => void handleReviewUnanswered()}
            type="button"
          >
            Review unanswered questions
          </button>
        </div>
        <QuestionNav
          answeredIds={answeredIds}
          currentIndex={session.currentQuestionIndex}
          flaggedIds={flaggedQuestionIds}
          onSelect={handleSelectIndex}
          questionIds={session.questionIds}
        />
      </aside>

      <article
        className={`panel panel-padding space-y-5 ${
          isCurrentQuestionAnswered ? "" : "border-rose-300 ring-1 ring-rose-200"
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm font-semibold uppercase tracking-[0.2em] text-stone-500">
            {currentQuestion.difficulty} difficulty
          </div>
          <button
            className={isCurrentQuestionFlagged ? "secondary-link border-amber-400 bg-amber-50 text-amber-900" : "secondary-link"}
            onClick={toggleFlagForCurrentQuestion}
            type="button"
          >
            {isCurrentQuestionFlagged ? "Unflag question" : "Flag for review"}
          </button>
        </div>
        {!isCurrentQuestionAnswered ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            This question is still unanswered.
          </div>
        ) : null}
        {isCurrentQuestionFlagged ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Flagged for review before submission.
          </div>
        ) : null}
        <QuestionRenderer
          answer={session.answers[currentQuestion.id]}
          onAnswerChange={handleAnswerChange}
          question={currentQuestion}
        />
      </article>

      <div className="sticky bottom-4 z-10">
        <div className="panel panel-padding flex flex-col gap-3 border-stone-300 bg-white/95 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm leading-6 text-stone-600">
            <span>{answeredIds.length} answered</span>
            <span className="mx-2 hidden sm:inline">•</span>
            <span className="text-rose-700">{unansweredIndexes.length} unanswered</span>
            <span className="mx-2 hidden sm:inline">•</span>
            <span className="text-amber-700">{flaggedQuestionIds.length} flagged</span>
          </div>
          <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto sm:justify-end">
            <button
              className="secondary-link"
              disabled={session.currentQuestionIndex === 0}
              onClick={() => void handleSelectIndex(session.currentQuestionIndex - 1)}
              type="button"
            >
              Previous
            </button>
            {isLastQuestion ? (
              <button
                className={`action-link ${unansweredIndexes.length > 0 ? "bg-rose-700" : ""}`}
                disabled={isSubmitting}
                onClick={() => void handleSubmit()}
                type="button"
              >
                {isSubmitting ? "Submitting..." : "Submit test"}
              </button>
            ) : (
              <>
                <button
                  className="secondary-link"
                  onClick={() => void handleSelectIndex(session.currentQuestionIndex + 1)}
                  type="button"
                >
                  Next
                </button>
                <button
                  className={`action-link ${unansweredIndexes.length > 0 ? "bg-rose-700" : ""}`}
                  disabled={isSubmitting}
                  onClick={() => void handleSubmit()}
                  type="button"
                >
                  {isSubmitting ? "Submitting..." : "Submit test"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
