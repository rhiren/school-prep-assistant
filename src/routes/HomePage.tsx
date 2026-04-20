import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type {
  Concept,
  ProgressRecord,
  SmartRetryMetadata,
  TestAttempt,
  TestSession,
} from "../domain/models";
import { useAppServices, useStudentProfiles } from "../state/AppServicesProvider";
import { getSmartRetryRecommendation } from "../services/smartRetry";

function toStudentStatus(
  progress: ProgressRecord | null | undefined,
): "Not Started" | "In Progress" | "Mastered" {
  if (!progress || progress.attemptCount === 0) {
    return "Not Started";
  }

  if (progress.masteryStatus === "mastered") {
    return "Mastered";
  }

  return "In Progress";
}

function getEncouragement(completed: number, total: number): string {
  if (completed === 0) {
    return "A fresh start is a great way to begin.";
  }

  if (total > 0 && completed < total / 2) {
    return "Nice start. Keep going one step at a time.";
  }

  if (total > 0 && completed < total) {
    return "You are making good progress. You are getting close.";
  }

  return "Great work. You finished this set.";
}

function sortConceptsForDisplay(concepts: Concept[]): Concept[] {
  return [...concepts].sort((left, right) => {
    if (left.hasTest !== right.hasTest) {
      return left.hasTest ? -1 : 1;
    }

    return left.order - right.order;
  });
}

export function HomePage() {
  const navigate = useNavigate();
  const {
    contentRepository,
    progressService,
    sessionService,
    studentProfileService,
    testGenerationService,
  } = useAppServices();
  const { activeProfile } = useStudentProfiles();
  const [subjectTitle, setSubjectTitle] = useState("Mathematics");
  const [courseTitle, setCourseTitle] = useState("Course 2");
  const [unitTitles, setUnitTitles] = useState<Record<string, string>>({});
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [progressByConcept, setProgressByConcept] = useState<Record<string, ProgressRecord>>({});
  const [latestAttemptsByConcept, setLatestAttemptsByConcept] = useState<
    Record<string, TestAttempt | null>
  >({});
  const [smartRetryRecommendation, setSmartRetryRecommendation] = useState<{
    concept: Concept;
    explanation: string;
    shortDescription: string;
    questionIds: string[];
    smartRetry: SmartRetryMetadata;
  } | null>(null);
  const [lastSession, setLastSession] = useState<TestSession | null>(null);
  const [resumeConcept, setResumeConcept] = useState<Concept | null>(null);
  const [startingConceptId, setStartingConceptId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    void (async () => {
      const [course, loadedConcepts, records, session, smartRetryEnabled] = await Promise.all([
        contentRepository.getCourse("course-2"),
        contentRepository.getCourseConcepts("course-2"),
        progressService.getProgress(),
        sessionService.getLatestInProgressSession(),
        activeProfile?.studentId
          ? studentProfileService.isFeatureEnabled(activeProfile.studentId, "smartRetry")
          : Promise.resolve(false),
      ]);

      if (!isMounted) {
        return;
      }

      if (course) {
        setSubjectTitle(course.subjectTitle);
        setCourseTitle(course.title);
        setUnitTitles(
          Object.fromEntries(course.units.map((unit) => [unit.id, unit.title])),
        );
      }

      setConcepts(loadedConcepts);
      setProgressByConcept(
        Object.fromEntries(records.map((record) => [record.conceptId, record])),
      );
      setLastSession(session);

      if (session?.conceptId) {
        setResumeConcept(await contentRepository.getConcept(session.conceptId));
      } else {
        setResumeConcept(null);
      }

      const attemptsByConceptEntries = await Promise.all(
        loadedConcepts.map(async (concept) => {
          const conceptAttempts = await progressService.getConceptAttempts(concept.id);
          return [concept.id, conceptAttempts] as const;
        }),
      );
      const questionsByConceptEntries = await Promise.all(
        loadedConcepts.map(async (concept) => {
          const conceptQuestions = await contentRepository.getQuestionsForConcept(concept.id);
          return [concept.id, conceptQuestions] as const;
        }),
      );

      if (!isMounted) {
        return;
      }

      const attemptsByConcept = Object.fromEntries(attemptsByConceptEntries);
      const questionsByConcept = Object.fromEntries(questionsByConceptEntries);
      setLatestAttemptsByConcept(
        Object.fromEntries(
          attemptsByConceptEntries.map(([conceptId, conceptAttempts]) => [
            conceptId,
            conceptAttempts[0] ?? null,
          ]),
        ),
      );

      if (!smartRetryEnabled) {
        setSmartRetryRecommendation(null);
        return;
      }

      const retryConcept =
        sortConceptsForDisplay(loadedConcepts)
          .map((concept) => {
            const recommendation = getSmartRetryRecommendation(
              attemptsByConcept[concept.id] ?? [],
              questionsByConcept[concept.id] ?? [],
            );
            return recommendation;
          })
          .map((recommendation) => {
            if (!recommendation) {
              return null;
            }

            const concept = loadedConcepts.find((candidate) => candidate.id === recommendation.conceptId);
            if (!recommendation) {
              return null;
            }

            if (!concept) {
              return null;
            }

            return {
              concept,
              explanation: recommendation.explanation,
              shortDescription: recommendation.shortDescription,
              questionIds: recommendation.retrySet.questionIds,
              smartRetry: {
                kind: "targeted" as const,
                cycle: recommendation.retryCycle,
              },
            };
          })
          .find((recommendation) => recommendation !== null) ?? null;

      setSmartRetryRecommendation(retryConcept);
    })();

    return () => {
      isMounted = false;
    };
  }, [
    activeProfile?.studentId,
    contentRepository,
    progressService,
    sessionService,
    studentProfileService,
  ]);

  const progressSummary = useMemo(() => {
    return concepts.reduce(
      (summary, concept) => {
        const status = toStudentStatus(progressByConcept[concept.id]);
        summary[status] += 1;
        return summary;
      },
      { "Not Started": 0, "In Progress": 0, Mastered: 0 } as Record<
        "Not Started" | "In Progress" | "Mastered",
        number
      >,
    );
  }, [concepts, progressByConcept]);

  const orderedConcepts = useMemo(() => sortConceptsForDisplay(concepts), [concepts]);
  const hasStartedAnyConcept = useMemo(
    () =>
      lastSession !== null ||
      orderedConcepts.some(
        (concept) => toStudentStatus(progressByConcept[concept.id]) !== "Not Started",
      ),
    [lastSession, orderedConcepts, progressByConcept],
  );
  const firstConceptId = orderedConcepts[0]?.id ?? null;

  const recommendedNextStep = useMemo(() => {
    if (resumeConcept && lastSession) {
      return {
        title: "Continue Practice",
        concept: resumeConcept,
        actionLabel: "Resume Practice",
        helper: "You already started this concept. Finishing it is the best next step.",
        onClick: () => navigate(`/test/${lastSession.id}`),
      };
    }

    if (smartRetryRecommendation) {
      return {
        title: "Retry Recommended",
        concept: smartRetryRecommendation.concept,
        actionLabel: smartRetryRecommendation.concept.hasTest
          ? "Retry Practice"
          : "View Tutorial",
        helper: smartRetryRecommendation.concept.hasTest
          ? `${smartRetryRecommendation.shortDescription}. ${smartRetryRecommendation.explanation}`
          : `${smartRetryRecommendation.explanation} Practice is coming soon, so start with the tutorial.`,
        onClick: () =>
          smartRetryRecommendation.concept.hasTest
            ? void handleStartConcept(
                smartRetryRecommendation.concept.id,
                smartRetryRecommendation.questionIds,
                smartRetryRecommendation.smartRetry,
              )
            : navigate(`/concept/${smartRetryRecommendation.concept.id}/tutorial`),
      };
    }

    const firstInProgress = orderedConcepts.find((concept) => {
      const status = toStudentStatus(progressByConcept[concept.id]);
      return status === "In Progress";
    });

    if (firstInProgress) {
      return {
        title: "Continue Practice",
        concept: firstInProgress,
        actionLabel: firstInProgress.hasTest ? "Continue Working" : "View Tutorial",
        helper: "Keep building confidence by finishing this concept next.",
        onClick: () =>
          firstInProgress.hasTest
            ? void handleStartConcept(firstInProgress.id)
            : navigate(`/concept/${firstInProgress.id}/tutorial`),
      };
    }

    const firstNotStarted = orderedConcepts.find(
      (concept) => toStudentStatus(progressByConcept[concept.id]) === "Not Started",
    );

    if (firstNotStarted) {
      return {
        title: "Start Here",
        concept: firstNotStarted,
        actionLabel: firstNotStarted.hasTest ? "Start Here" : "View Tutorial",
        helper: firstNotStarted.hasTest
          ? "This is the best place to begin your next round of practice."
          : "Practice is coming soon. Start with the tutorial to learn the idea first.",
        onClick: () =>
          firstNotStarted.hasTest
            ? void handleStartConcept(firstNotStarted.id)
            : navigate(`/concept/${firstNotStarted.id}/tutorial`),
      };
    }

    const nextToReview = orderedConcepts.find((concept) => concept.id !== resumeConcept?.id);
    return nextToReview
      ? {
          title: "Try This Next",
          concept: nextToReview,
          actionLabel: nextToReview.hasTest ? "Practice Again" : "View Tutorial",
          helper: nextToReview.hasTest
            ? "You have worked through everything once. Pick a concept and sharpen it."
            : "Practice is coming soon. Review the tutorial while you wait for the test.",
          onClick: () =>
            nextToReview.hasTest
              ? void handleStartConcept(nextToReview.id)
              : navigate(`/concept/${nextToReview.id}/tutorial`),
        }
      : null;
  }, [
    lastSession,
    navigate,
    orderedConcepts,
    progressByConcept,
    resumeConcept,
    smartRetryRecommendation,
  ]);
  const conceptsByUnit = useMemo(() => {
    return concepts.reduce<Record<string, Concept[]>>((groups, concept) => {
      groups[concept.unitId] ??= [];
      groups[concept.unitId].push(concept);
      groups[concept.unitId] = sortConceptsForDisplay(groups[concept.unitId]);
      return groups;
    }, {});
  }, [concepts]);

  const getCompletedQuestions = (concept: Concept): { completed: number; total: number } => {
    const total = concept.testQuestionCount ?? latestAttemptsByConcept[concept.id]?.summary.totalQuestions ?? 0;

    if (lastSession?.conceptId === concept.id) {
      const completed = Object.values(lastSession.answers).filter(
        (answer) => answer.response.trim() !== "",
      ).length;
      return { completed, total: total || lastSession.questionIds.length };
    }

    const latestAttempt = latestAttemptsByConcept[concept.id];
    if (!latestAttempt) {
      return { completed: 0, total };
    }

    return {
      completed:
        latestAttempt.summary.totalQuestions - latestAttempt.summary.unansweredCount,
      total: latestAttempt.summary.totalQuestions,
    };
  };

  const handleStartConcept = async (
    conceptId: string,
    questionIds?: string[],
    smartRetry?: SmartRetryMetadata,
  ) => {
    setStartingConceptId(conceptId);
    const session = await testGenerationService.createConceptSession(conceptId, undefined, {
      questionIds,
      smartRetry,
    });
    navigate(`/test/${session.id}`);
  };

  return (
    <section className="space-y-6">
      <div className="panel panel-padding">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent">
          School Prep Assistant
        </p>
        <h2 className="mt-2 text-3xl font-semibold text-ink">Learning Dashboard</h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-stone-600">
          Build confidence across subjects with structured concept practice, progress
          tracking, and mastery over time.
        </p>
        <p className="mt-3 text-sm text-stone-600">
          Mathematics is the active subject today, with Course 2 ready inside the
          Subjects flow and more subjects planned over time.
        </p>
      </div>

      <section className="panel panel-padding">
        <h3 className="text-xl font-semibold text-ink">Subjects</h3>
        <p className="mt-2 text-sm text-stone-600">
          Mathematics is active now, and Science is planned as the next subject area.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Link
            className="rounded-2xl border border-accent/30 bg-white px-4 py-4 transition hover:border-accent hover:bg-accent/5"
            to="/course/course-2"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-2xl">📘</div>
                <h4 className="mt-3 text-lg font-semibold text-ink">{subjectTitle}</h4>
                <p className="mt-1 text-sm text-stone-600">
                  Active subject. Continue into the current {courseTitle} learning flow.
                </p>
              </div>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                Active
              </span>
            </div>
          </Link>

          <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-2xl">🧪</div>
                <h4 className="mt-3 text-lg font-semibold text-ink">Science</h4>
                <p className="mt-1 text-sm text-stone-600">
                  Coming soon. This subject will be added in a future update.
                </p>
              </div>
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
                Coming Soon
              </span>
            </div>
          </div>
        </div>
      </section>

      <div
        className={`grid gap-6 ${
          lastSession && resumeConcept ? "" : "lg:grid-cols-[1.05fr_0.95fr]"
        }`}
      >
        <section className="panel panel-padding">
          <h3 className="text-xl font-semibold text-ink">Continue Learning</h3>
          {lastSession && resumeConcept ? (
            <div className="mt-4 rounded-2xl border border-stone-200 bg-white px-4 py-4">
              <p className="text-sm text-stone-600">You were working on</p>
              <h4 className="mt-1 text-lg font-semibold text-ink">{resumeConcept.title}</h4>
              <p className="mt-2 text-sm text-stone-600">
                You have answered{" "}
                {
                  Object.values(lastSession.answers).filter(
                    (answer) => answer.response.trim() !== "",
                  ).length
                }{" "}
                of {lastSession.questionIds.length} questions. Keep going.
              </p>
              <p className="mt-2 text-sm text-stone-600">
                {getEncouragement(
                  Object.values(lastSession.answers).filter(
                    (answer) => answer.response.trim() !== "",
                  ).length,
                  lastSession.questionIds.length,
                )}
              </p>
              <div className="mt-4">
                <Link className="action-link" to={`/test/${lastSession.id}`}>
                  Resume
                </Link>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm leading-6 text-stone-600">
              No practice is in progress right now. Pick a concept below and get
              started.
            </p>
          )}
        </section>

        {!lastSession || !resumeConcept ? (
          <section className="panel panel-padding">
            <h3 className="text-xl font-semibold text-ink">Recommended Next</h3>
            <div className="mt-4 rounded-2xl border border-stone-200 bg-white px-4 py-4">
              <p className="text-sm font-semibold text-accent">
                {recommendedNextStep?.title ?? "Start Here"}
              </p>
              <h4 className="text-lg font-semibold text-ink">
                {recommendedNextStep?.concept.title}
              </h4>
              <p className="mt-2 text-sm leading-6 text-stone-600">
                {recommendedNextStep?.helper}
              </p>
              <p className="mt-3 text-sm text-stone-600">
                Status:{" "}
                {recommendedNextStep
                  ? toStudentStatus(progressByConcept[recommendedNextStep.concept.id])
                  : "Not Started"}
              </p>
              <p className="mt-1 text-sm text-stone-600">
                {recommendedNextStep
                  ? (() => {
                      const { completed, total } = getCompletedQuestions(
                        recommendedNextStep.concept,
                      );
                      return `${completed} / ${total} questions completed`;
                    })()
                  : "0 / 0 questions completed"}
              </p>
              {recommendedNextStep ? (
                <p className="mt-2 text-sm text-stone-600">
                  {(() => {
                    const { completed, total } = getCompletedQuestions(
                      recommendedNextStep.concept,
                    );
                    return getEncouragement(completed, total);
                  })()}
                </p>
              ) : null}
              <div className="mt-4">
                <button
                  className="action-link"
                  disabled={
                    recommendedNextStep
                      ? startingConceptId === recommendedNextStep.concept.id
                      : false
                  }
                  onClick={recommendedNextStep?.onClick}
                  type="button"
                >
                  {recommendedNextStep &&
                  startingConceptId === recommendedNextStep.concept.id
                    ? "Starting..."
                    : recommendedNextStep?.actionLabel ?? "Start"}
                </button>
              </div>
            </div>
          </section>
        ) : null}
      </div>

      <section className="panel panel-padding">
        <h3 className="text-xl font-semibold text-ink">Course Roadmap</h3>
        <p className="mt-2 text-sm text-stone-600">
          Follow {courseTitle} step by step. If practice is not ready yet, read the tutorial first.
        </p>
        <div className="mt-5 space-y-6">
          {Object.entries(conceptsByUnit).map(([unitId, unitConcepts]) => (
            <section key={unitId} className="space-y-3">
              <div>
                <h4 className="text-lg font-semibold text-ink">{unitTitles[unitId] ?? unitId}</h4>
              </div>
              <div className="space-y-3">
                {unitConcepts.map((concept) => (
                  <article
                    key={concept.id}
                    className={`rounded-2xl border bg-white px-4 py-4 ${
                      !hasStartedAnyConcept && concept.id === firstConceptId
                        ? "border-accent ring-1 ring-accent/30"
                        : "border-stone-200"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h5 className="text-lg font-semibold text-ink">{concept.title}</h5>
                        {recommendedNextStep?.concept.id === concept.id &&
                        recommendedNextStep.title === "Start Here" ? (
                          <p className="mt-1 text-sm font-semibold text-accent">Start Here</p>
                        ) : null}
                        {!concept.hasTest ? (
                          <p className="mt-1 text-sm font-medium text-amber-700">
                            ⏳ Practice Coming Soon
                          </p>
                        ) : null}
                      </div>
                      <div className="text-sm text-stone-600">
                        {getCompletedQuestions(concept).completed} /{" "}
                        {getCompletedQuestions(concept).total} questions completed
                      </div>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-stone-600">
                      {concept.description}
                    </p>
                    {!concept.hasTest ? (
                      <p className="mt-2 text-sm text-stone-600">
                        Practice coming soon. View the tutorial now so you are ready.
                      </p>
                    ) : null}
                    <div className="mt-4 flex flex-wrap gap-3">
                      {concept.hasTest ? (
                        <>
                          <button
                            className="action-link"
                            disabled={startingConceptId === concept.id}
                            onClick={() => void handleStartConcept(concept.id)}
                            type="button"
                          >
                            {startingConceptId === concept.id ? "Starting..." : "Start Test"}
                          </button>
                          <Link
                            className="secondary-link"
                            to={`/concept/${concept.id}/tutorial`}
                          >
                            View Tutorial
                          </Link>
                        </>
                      ) : (
                        <>
                          <span className="secondary-link cursor-default border-amber-300 bg-amber-50 text-amber-800">
                            Coming Soon
                          </span>
                          <Link
                            className="action-link"
                            to={`/concept/${concept.id}/tutorial`}
                          >
                            View Tutorial
                          </Link>
                        </>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      </section>

      <section className="panel panel-padding">
        <h3 className="text-xl font-semibold text-ink">Progress Summary</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {(["Not Started", "In Progress", "Mastered"] as const).map((status) => (
            <div
              key={status}
              className="rounded-2xl border border-stone-200 bg-white px-4 py-4"
            >
              <div className="text-sm font-semibold text-stone-600">{status}</div>
              <div className="mt-2 text-3xl font-semibold text-ink">
                {progressSummary[status]}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-5 space-y-3">
          {concepts.map((concept) => (
            <div
              key={concept.id}
              className="rounded-2xl border border-stone-200 bg-white px-4 py-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-semibold text-ink">{concept.title}</div>
                  <div className="text-sm text-stone-600">
                    {toStudentStatus(progressByConcept[concept.id])}
                  </div>
                </div>
                <div className="text-sm text-stone-600">
                  {getCompletedQuestions(concept).completed} /{" "}
                  {getCompletedQuestions(concept).total} questions completed
                </div>
              </div>
              <div className="mt-2 text-sm text-stone-500">
                {getEncouragement(
                  getCompletedQuestions(concept).completed,
                  getCompletedQuestions(concept).total,
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}
