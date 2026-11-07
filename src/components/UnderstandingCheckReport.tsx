import { useEffect, useState } from "react";
import type { Question, StudentProfile, TestAttempt } from "../domain/models";
import { useAppServices } from "../state/AppServicesProvider";
import { summarizeUnderstandingCheck } from "../services/understandingChecks";

export function UnderstandingCheckReport({ student }: { student: StudentProfile }) {
  const { dataTransferService, contentRepository } = useAppServices();
  const [rows, setRows] = useState<{ attempt: TestAttempt; title: string; questions: Question[] }[]>([]);
  const [status, setStatus] = useState("Loading checks...");
  useEffect(() => {
    let active = true;
    setRows([]); setStatus("Loading checks...");
    void (async () => {
      const snapshot = await dataTransferService.exportProgressForStudent(student);
      const checks = snapshot.data.attempts.filter(a => a.studentId === student.studentId && a.understandingCheck);
      const loaded = await Promise.all(checks.map(async attempt => ({
        attempt,
        title: (await contentRepository.getConcept(attempt.conceptId ?? ""))?.title ?? "Understanding Check",
        questions: (await Promise.all(attempt.questionIds.map(id => contentRepository.getQuestionById(id)))).filter((q): q is Question => Boolean(q)),
      })));
      if (active) { setRows(loaded.sort((a,b) => b.attempt.submittedAt.localeCompare(a.attempt.submittedAt))); setStatus(loaded.length ? "" : "No understanding checks recorded for this student yet."); }
    })().catch(() => { if(active) setStatus("Unable to load checks. Try reopening the admin console."); });
    return () => { active = false; };
  }, [student.studentId, contentRepository, dataTransferService]);
  return <section className="border-t border-stone-200 py-4 sm:col-span-2">
    <h3 className="font-semibold">Understanding Checks: {student.displayName}</h3>
    <p className="mt-2 text-sm text-stone-600">First answers reflect recorded choices or committed entries, not keystrokes. Missing history is unavailable. Help is self-reported; these short checks are evidence, not a mastery verdict.</p>
    {status ? <p className="mt-3 text-sm" role="status">{status}</p> : null}
    {rows.map(({ attempt, title, questions }) => {
      const s = summarizeUnderstandingCheck(attempt, questions);
      return <article key={attempt.attemptId} className="border-b border-stone-200 py-4">
        <h4 className="font-semibold">{title}</h4>
        <p className="text-sm">{new Date(attempt.submittedAt).toLocaleDateString()} · {s.daysSincePractice ?? "Unknown"} days since prior submitted practice</p>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
          <div><dt>First recorded answers</dt><dd>{s.observed ? `${s.firstCorrect}/${s.observed} correct (${s.observed}/${attempt.questionIds.length} observed)` : "Unavailable"}</dd></div>
          <div><dt>Submitted answers</dt><dd>{attempt.summary.correctCount}/{attempt.summary.totalQuestions} correct</dd></div>
          <div><dt>Help used</dt><dd>{s.support === "help" ? "Reported help" : s.support === "independent" ? "Reported independent" : "Unavailable"}</dd></div>
          <div><dt>Foundations</dt><dd>{s.groups.foundation.correct}/{s.groups.foundation.total}</dd></div>
          <div><dt>Transfer and reasoning</dt><dd>{s.groups.transfer.correct}/{s.groups.transfer.total}</dd></div>
        </dl>
      </article>;
    })}
  </section>;
}
