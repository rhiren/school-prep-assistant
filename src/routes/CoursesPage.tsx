import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { Course } from "../domain/models";
import { useAppServices } from "../state/AppServicesProvider";

export function CoursesPage() {
  const { contentRepository } = useAppServices();
  const [courses, setCourses] = useState<Course[]>([]);

  useEffect(() => {
    contentRepository.listCourses().then(setCourses);
  }, [contentRepository]);

  const activeCourse = courses[0] ?? null;
  const activeSubjectTitle = activeCourse?.subjectTitle ?? "Mathematics";

  return (
    <section className="space-y-4">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent">
          Subjects
        </p>
        <h2 className="text-2xl font-semibold text-ink">Choose a subject</h2>
        <p className="mt-2 text-sm leading-6 text-stone-600">
          Subjects organize the learning experience. Mathematics is active today,
          and Science is planned next.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <article className="panel panel-padding">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-2xl">📘</div>
              <h3 className="mt-3 text-xl font-semibold text-ink">{activeSubjectTitle}</h3>
              <p className="mt-3 text-sm leading-6 text-stone-600">
                Active subject. Start from the current course and continue into the
                existing learning flow.
              </p>
              {activeCourse ? (
                <>
                  <p className="mt-4 text-sm font-semibold text-ink">
                    Current course: {activeCourse.title}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-stone-600">
                    {activeCourse.description}
                  </p>
                  <p className="mt-3 text-sm text-stone-500">
                    {activeCourse.units.length} unit(s) and{" "}
                    {activeCourse.units.flatMap((unit) => unit.concepts).length} concept(s)
                  </p>
                </>
              ) : null}
            </div>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
              Active
            </span>
          </div>
          {activeCourse ? (
            <div className="mt-5">
              <Link className="action-link" to={`/course/${activeCourse.id}`}>
                Open {activeCourse.title}
              </Link>
            </div>
          ) : null}
        </article>

        <article className="panel panel-padding bg-stone-50">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-2xl">🧪</div>
              <h3 className="mt-3 text-xl font-semibold text-ink">Science</h3>
              <p className="mt-3 text-sm leading-6 text-stone-600">
                Coming soon. This subject will appear here when the first science
                course is ready.
              </p>
            </div>
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
              Coming Soon
            </span>
          </div>
        </article>
      </div>
    </section>
  );
}
