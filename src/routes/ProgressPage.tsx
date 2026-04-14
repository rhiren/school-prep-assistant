import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MasteryBadge } from "../components/MasteryBadge";
import type { Concept, ProgressRecord } from "../domain/models";
import { useAppServices } from "../state/AppServicesProvider";
import { formatDate } from "../utils/format";

const LAST_BACKUP_KEY = "math-prep:last-backup-at";

function getLastBackupLabel(lastBackupAt: string | null): string {
  if (!lastBackupAt) {
    return "Never";
  }

  const timestamp = new Date(lastBackupAt).getTime();
  if (Number.isNaN(timestamp)) {
    return "Never";
  }

  const diffDays = Math.floor((Date.now() - timestamp) / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) {
    return "Today";
  }

  if (diffDays === 1) {
    return "1 day ago";
  }

  return `${diffDays} days ago`;
}

export function ProgressPage() {
  const { contentRepository, mixedTestService, progressService, dataTransferService } =
    useAppServices();
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [progress, setProgress] = useState<Record<string, ProgressRecord>>({});
  const [eligibility, setEligibility] = useState<{ unlocked: boolean; conceptIds: string[] }>({
    unlocked: false,
    conceptIds: [],
  });
  const [transferMessage, setTransferMessage] = useState<string | null>(null);
  const [lastBackupAt, setLastBackupAt] = useState<string | null>(null);

  useEffect(() => {
    contentRepository.getCourseConcepts("course-2").then(setConcepts);
    progressService.getProgress().then((records) => {
      setProgress(
        Object.fromEntries(records.map((record) => [record.conceptId, record])),
      );
    });
    mixedTestService.getEligibility("course-2").then(setEligibility);
    if (typeof window !== "undefined") {
      setLastBackupAt(window.localStorage.getItem(LAST_BACKUP_KEY));
    }
  }, [contentRepository, mixedTestService, progressService]);

  const handleDownload = async () => {
    const snapshot = await dataTransferService.exportProgress();
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
      type: "application/json",
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `math-progress-${snapshot.exportedAt.slice(0, 10)}.json`;
    link.click();
    window.URL.revokeObjectURL(url);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(LAST_BACKUP_KEY, snapshot.exportedAt);
    }
    setLastBackupAt(snapshot.exportedAt);
    setTransferMessage("Progress downloaded.");
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const parsed = JSON.parse(await file.text()) as unknown;
      const counts = (() => {
        if (
          typeof parsed === "object" &&
          parsed !== null &&
          "data" in parsed &&
          typeof parsed.data === "object" &&
          parsed.data !== null
        ) {
          const data = parsed.data as Record<string, unknown>;
          return {
            sessions: Array.isArray(data.sessions) ? data.sessions.length : 0,
            attempts: Array.isArray(data.attempts) ? data.attempts.length : 0,
            progress: Array.isArray(data.progress) ? data.progress.length : 0,
          };
        }

        return { sessions: 0, attempts: 0, progress: 0 };
      })();

      const confirmed = window.confirm(
        `This will replace your current progress. It is recommended to download a backup first.\n\nReplace your current saved data with this import?\n\nSessions: ${counts.sessions}\nAttempts: ${counts.attempts}\nProgress records: ${counts.progress}`,
      );

      if (!confirmed) {
        event.target.value = "";
        return;
      }

      await dataTransferService.importProgress(parsed);
      setTransferMessage("Progress uploaded. Reloading...");
      window.location.reload();
    } catch (error) {
      setTransferMessage(
        error instanceof Error ? error.message : "Import failed. Please check the file.",
      );
      event.target.value = "";
    }
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent">
            Progress
          </p>
          <h2 className="text-2xl font-semibold text-ink">Concept mastery dashboard</h2>
        </div>
        <Link className="secondary-link" to="/courses">
          Back to courses
        </Link>
      </div>

      <article className="panel panel-padding">
        <div className="flex flex-wrap items-center gap-3">
          <button className="action-link" onClick={() => void handleDownload()} type="button">
            Download Progress
          </button>
          <label className="secondary-link cursor-pointer">
            Upload Progress
            <input className="hidden" onChange={(event) => void handleUpload(event)} type="file" accept="application/json" />
          </label>
        </div>
        <p className="mt-3 text-sm text-stone-600">
          Last backup: {getLastBackupLabel(lastBackupAt)}
        </p>
        {transferMessage ? (
          <p className="mt-3 text-sm text-stone-600">{transferMessage}</p>
        ) : null}
      </article>

      <article className="panel panel-padding">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-ink">Mixed reinforcement status</h3>
            <p className="mt-2 text-sm text-stone-600">
              Unlocks after three completed concepts. The generation hook is scaffolded,
              but the test itself is still a future extension.
            </p>
          </div>
          <div
            className={`rounded-2xl px-4 py-3 text-sm font-semibold ${
              eligibility.unlocked
                ? "bg-emerald-100 text-emerald-700"
                : "bg-amber-100 text-amber-700"
            }`}
          >
            {eligibility.unlocked
              ? `Unlocked for ${eligibility.conceptIds.join(", ")}`
              : "Locked until 3 concepts are completed"}
          </div>
        </div>
      </article>

      <div className="space-y-4">
        {concepts.map((concept) => {
          const record = progress[concept.id];

          return (
            <article
              key={concept.id}
              className="panel panel-padding flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"
            >
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="text-lg font-semibold text-ink">{concept.title}</h3>
                  <MasteryBadge status={record?.masteryStatus ?? concept.masteryStatus} />
                </div>
                <p className="mt-2 text-sm leading-6 text-stone-600">{concept.description}</p>
              </div>
              <div className="grid gap-2 text-sm text-stone-600 sm:grid-cols-4 sm:text-right">
                <div>
                  <div className="font-semibold text-ink">Attempts</div>
                  <div>{record?.attemptCount ?? 0}</div>
                </div>
                <div>
                  <div className="font-semibold text-ink">Latest</div>
                  <div>{record?.latestScore ?? "—"}%</div>
                </div>
                <div>
                  <div className="font-semibold text-ink">Best</div>
                  <div>{record?.bestScore ?? "—"}%</div>
                </div>
                <div>
                  <div className="font-semibold text-ink">Last attempt</div>
                  <div>{formatDate(record?.lastAttemptedAt ?? null)}</div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
