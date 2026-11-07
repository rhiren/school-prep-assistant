import type { Question, TestAttempt, TestSet } from "../domain/models";
import { compareQuestionAnswer } from "../utils/answerNormalization";

export const CHECK_DELAY_MS = 7 * 24 * 60 * 60 * 1000;
export function checkAvailability(attempts: TestAttempt[], testSet: TestSet, now = Date.now()) {
  if (attempts.some(a => a.testSetId === testSet.id || a.questionIds.some(id => id.startsWith(`${testSet.id}-`)))) {
    return { ready: false, label: "Completed", priorPracticeAt: null };
  }
  const prior = attempts.filter(a => !a.understandingCheck && !a.testSetId?.includes("understanding-check"))
    .map(a => a.submittedAt).filter(date => Number.isFinite(Date.parse(date)))
    .sort().reverse()[0];
  if (!prior) return { ready: false, label: "Available after practice", priorPracticeAt: null };
  const due = Date.parse(prior) + CHECK_DELAY_MS;
  return { ready: now >= due, label: now >= due ? "Start understanding check" : `Available ${new Date(due).toLocaleDateString()}`, priorPracticeAt: prior };
}

export function summarizeUnderstandingCheck(attempt: TestAttempt, questions: Question[]) {
  let observed = 0, firstCorrect = 0;
  const groups = { foundation: { correct: 0, total: 0 }, transfer: { correct: 0, total: 0 } };
  for (const question of questions) {
    const entries = attempt.answerHistory?.[question.id] ?? [];
    const first = entries.find(e => e.response.trim() && (e.inputMethod === "choice" || e.committed === true));
    // A history starting mid-answer is incomplete, not evidence of a first response.
    if (first && (first.previousResponse === null || first.previousResponse === "")) {
      observed++;
      if (compareQuestionAnswer(question, first.response).isCorrect) firstCorrect++;
    }
    const group = question.tags.includes("check-foundation") ? groups.foundation : groups.transfer;
    group.total++;
    if (attempt.results.find(r => r.questionId === question.id)?.isCorrect) group.correct++;
  }
  const start = Date.parse(attempt.durationSignal?.startedAt ?? attempt.submittedAt);
  const prior = Date.parse(attempt.understandingCheck?.priorPracticeAt ?? "");
  return { observed, firstCorrect, groups,
    daysSincePractice: Number.isFinite(prior) ? Math.floor((start - prior) / 86400000) : null,
    support: attempt.understandingCheck?.support ?? null };
}
