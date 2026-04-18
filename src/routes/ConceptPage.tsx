import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { MasteryBadge } from "../components/MasteryBadge";
import type { Concept, ProgressRecord, TestAttempt, TestSet } from "../domain/models";
import { useAppServices, useStudentProfiles } from "../state/AppServicesProvider";
import { formatDate } from "../utils/format";

function getTestSetLabel(testSet: TestSet): string {
  const key = `${testSet.id} ${testSet.title}`.toLowerCase();

  if (key.includes("review")) {
    return "Review";
  }

  if (key.includes("practice")) {
    return "Practice";
  }

  return "Main Test";
}

export function ConceptPage() {
  const { conceptId } = useParams();
  const navigate = useNavigate();
  const { contentRepository, progressService, testGenerationService } = useAppServices();
  const { activeProfile } = useStudentProfiles();
  const [concept, setConcept] = useState<Concept | null>(null);
  const [progress, setProgress] = useState<ProgressRecord | null>(null);
  const [attempts, setAttempts] = useState<TestAttempt[]>([]);
  const [testSets, setTestSets] = useState<TestSet[]>([]);
  const [startingTestSetId, setStartingTestSetId] = useState<string | null>(null);

  useEffect(() => {
    if (!conceptId) {
      return;
    }

    contentRepository.getConcept(conceptId).then(setConcept);
    contentRepository.getTestSetsForConcept(conceptId).then(setTestSets);
    progressService.getConceptProgress(conceptId).then(setProgress);
    progressService.getConceptAttempts(conceptId).then(setAttempts);
  }, [activeProfile?.studentId, conceptId, contentRepository, progressService]);

  if (!concept) {
    return <div className="panel panel-padding">Concept not found.</div>;
  }

  const testSetTitles = Object.fromEntries(testSets.map((testSet) => [testSet.id, testSet.title]));

  const handleStart = async (testSetId?: string) => {
    setStartingTestSetId(testSetId ?? concept.id);
    const session = await testGenerationService.createConceptSession(concept.id, testSetId);
    navigate(`/test/${session.id}`);
  };

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Link className="text-sm font-medium text-accent" to={`/course/${concept.courseId}`}>
            Back to course
          </Link>
          <h2 className="mt-2 text-3xl font-semibold text-ink">{concept.title}</h2>
          {concept.description ? (
            <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
              {concept.description}
            </p>
          ) : null}
        </div>
        <MasteryBadge status={progress?.masteryStatus ?? concept.masteryStatus} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <article className="panel panel-padding">
          <h3 className="text-lg font-semibold text-ink">Concept snapshot</h3>
          <dl className="mt-4 grid gap-3 text-sm text-stone-600 sm:grid-cols-2">
            <div>
              <dt className="font-semibold text-ink">Practice status</dt>
              <dd>{concept.hasTest ? "Ready to practice" : "Practice coming soon"}</dd>
            </div>
            <div>
              <dt className="font-semibold text-ink">Tags</dt>
              <dd>{concept.tags.length > 0 ? concept.tags.join(", ") : "—"}</dd>
            </div>
            <div>
              <dt className="font-semibold text-ink">Question target</dt>
              <dd>
                {concept.hasTest ? concept.testQuestionCount ?? "All available questions" : "Practice coming soon"}
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-ink">Latest score</dt>
              <dd>{progress?.latestScore ?? "—"}%</dd>
            </div>
            <div>
              <dt className="font-semibold text-ink">Best score</dt>
              <dd>{progress?.bestScore ?? "—"}%</dd>
            </div>
          </dl>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link className="action-link" to={`/concept/${concept.id}/tutorial`}>
              View tutorial
            </Link>
            <Link className="secondary-link" to="/progress">
              View progress
            </Link>
          </div>
          <p className="mt-4 text-sm text-stone-600">
            {concept.hasTest
              ? "Start with the tutorial if you want a quick review, then choose a practice set below."
              : "Practice coming soon. Start with the tutorial so you are ready when the test opens."}
          </p>
        </article>

        <article className="panel panel-padding">
          <h3 className="text-lg font-semibold text-ink">Tutorial and test sets</h3>
          <div className="mt-4 space-y-3">
            <Link
              className="block rounded-2xl border border-stone-200 bg-white px-4 py-4 transition hover:border-accent"
              to={`/concept/${concept.id}/tutorial`}
            >
              <div className="font-semibold text-ink">Concept tutorial</div>
              <div className="mt-1 text-sm text-stone-600">
                Read the lesson overview, examples, and practice guidance for this concept.
              </div>
            </Link>

            {testSets.length === 0 ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900">
                Practice coming soon. You can review the tutorial for now.
              </div>
            ) : (
              testSets.map((testSet) => (
                <div
                  key={testSet.id}
                  className="rounded-2xl border border-stone-200 bg-white px-4 py-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-ink">{testSet.title}</div>
                      <div className="mt-2">
                        <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-stone-600">
                          {getTestSetLabel(testSet)}
                        </span>
                      </div>
                      <div className="mt-1 text-sm text-stone-600">{testSet.description}</div>
                    </div>
                    <div className="text-sm text-stone-500">
                      {testSet.questionCount} question{testSet.questionCount === 1 ? "" : "s"}
                    </div>
                  </div>
                  <div className="mt-4">
                    <button
                      className="action-link"
                      disabled={startingTestSetId === testSet.id}
                      onClick={() => void handleStart(testSet.id)}
                      type="button"
                    >
                      {startingTestSetId === testSet.id ? "Creating session..." : "Start test"}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </article>

        <article className="panel panel-padding lg:col-span-2">
          <h3 className="text-lg font-semibold text-ink">Attempt history</h3>
          <div className="mt-4 space-y-3">
            {attempts.length === 0 ? (
              <p className="text-sm text-stone-600">No attempts yet. Start the first session.</p>
            ) : (
              attempts.slice(0, 5).map((attempt) => (
                <Link
                  key={attempt.attemptId}
                  className="block rounded-2xl border border-stone-200 bg-white px-4 py-3 transition hover:border-accent"
                  to={`/results/${attempt.attemptId}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold text-ink">
                        {attempt.summary.percentage}% score
                      </div>
                      <div className="text-sm text-stone-500">
                        {attempt.summary.correctCount}/{attempt.summary.totalQuestions} correct
                        {attempt.testSetId ? ` • ${testSetTitles[attempt.testSetId] ?? "Practice set"}` : ""}
                      </div>
                    </div>
                    <div className="text-sm text-stone-500">
                      {formatDate(attempt.submittedAt)}
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </article>
      </div>
    </section>
  );
}
