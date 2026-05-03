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

  const sortedCourses = [...courses].sort((left, right) => left.order - right.order);

  return (
    <section className="space-y-4">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent">
          Subjects
        </p>
        <h2 className="text-2xl font-semibold text-ink">Choose a subject</h2>
        <p className="mt-2 text-sm leading-6 text-stone-600">
          Subjects organize the learning experience. Mathematics stays as the
          primary path, and additional subjects appear here as they become ready.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {sortedCourses.map((course, index) => {
          const isPrimaryCourse = index === 0;
          const subjectIcon = course.subjectId === "science" ? "🧪" : "📘";

          return (
            <article
              className={`panel panel-padding ${isPrimaryCourse ? "" : "bg-stone-50"}`}
              key={course.id}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-2xl">{subjectIcon}</div>
                  <h3 className="mt-3 text-xl font-semibold text-ink">{course.subjectTitle}</h3>
                  <p className="mt-3 text-sm leading-6 text-stone-600">
                    {isPrimaryCourse
                      ? "Primary subject. Continue into the current learning flow."
                      : "Additional subject. Open the course to start its first unit."}
                  </p>
                  <p className="mt-4 text-sm font-semibold text-ink">
                    Current course: {course.title}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-stone-600">
                    {course.description}
                  </p>
                  <p className="mt-3 text-sm text-stone-500">
                    {course.units.length} unit(s) and{" "}
                    {course.units.flatMap((unit) => unit.concepts).length} concept(s)
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${
                    isPrimaryCourse
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-sky-100 text-sky-700"
                  }`}
                >
                  {isPrimaryCourse ? "Active" : "Available"}
                </span>
              </div>
              <div className="mt-5">
                <Link className="action-link" to={`/course/${course.id}`}>
                  Open {course.title}
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
