import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ConceptCard } from "../components/ConceptCard";
import type { Course, ProgressRecord } from "../domain/models";
import { useAppServices } from "../state/AppServicesProvider";

function sortConceptsForDisplay(concepts: Course["units"][number]["concepts"]) {
  return [...concepts].sort((left, right) => {
    if (left.hasTest !== right.hasTest) {
      return left.hasTest ? -1 : 1;
    }

    return left.order - right.order;
  });
}

export function CoursePage() {
  const { courseId } = useParams();
  const { contentRepository, progressService } = useAppServices();
  const [course, setCourse] = useState<Course | null>(null);
  const [progress, setProgress] = useState<Record<string, ProgressRecord>>({});

  useEffect(() => {
    if (!courseId) {
      return;
    }

    contentRepository.getCourse(courseId).then(setCourse);
    progressService.getProgress().then((records) => {
      setProgress(
        Object.fromEntries(records.map((record) => [record.conceptId, record])),
      );
    });
  }, [contentRepository, courseId, progressService]);

  if (!course) {
    return <div className="panel panel-padding">Course not found.</div>;
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link className="text-sm font-medium text-accent" to="/courses">
            Back to courses
          </Link>
          <h2 className="mt-2 text-3xl font-semibold text-ink">{course.title}</h2>
          <p className="mt-2 text-sm leading-6 text-stone-600">{course.description}</p>
        </div>
      </div>
      {course.units.map((unit) => (
        <section key={unit.id} className="space-y-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
              Unit {unit.order}
            </p>
            <h3 className="text-xl font-semibold text-ink">{unit.title}</h3>
            <p className="mt-1 text-sm text-stone-600">{unit.description}</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {sortConceptsForDisplay(unit.concepts).map((concept) => (
              <ConceptCard
                key={concept.id}
                concept={concept}
                progress={progress[concept.id]}
              />
            ))}
          </div>
        </section>
      ))}
    </section>
  );
}
