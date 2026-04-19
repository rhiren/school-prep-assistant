import { NavLink, Outlet } from "react-router-dom";
import { useStudentProfiles } from "../state/AppServicesProvider";
import { useTestMode } from "../state/TestModeProvider";

const navItems = [
  { to: "/", label: "Home" },
  { to: "/courses", label: "Courses" },
  { to: "/progress", label: "Progress" },
];

export function AppLayout() {
  const { isTestMode } = useTestMode();
  const { activeProfile, createStudentProfile, profiles, setActiveStudent } = useStudentProfiles();

  const handleCreateStudent = async () => {
    const displayName = window.prompt("Add a student name");
    if (!displayName) {
      return;
    }

    const gradeLevel = window.prompt("Grade level (optional)") ?? undefined;
    await createStudentProfile(displayName, gradeLevel);
  };

  return (
    <div className="app-shell">
      {!isTestMode ? (
        <header className="panel mb-6 overflow-hidden">
          <div className="panel-padding flex flex-col gap-5 border-b border-stone-200 bg-[linear-gradient(135deg,#fffdf8_0%,#fff3d6_100%)] sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <h1 className="text-3xl font-semibold text-ink">School Prep Assistant</h1>
              <p className="mt-2 text-sm leading-6 text-stone-600">
                A growing learning platform for structured subject practice, progress tracking,
                and steady confidence-building.
              </p>
            </div>
            <div className="flex flex-col gap-2 rounded-2xl border border-stone-200/80 bg-white/80 px-4 py-3 sm:min-w-[260px] sm:items-end">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
                Student
              </div>
              {profiles.length > 1 ? (
                <select
                  className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-ink"
                  onChange={(event) => void setActiveStudent(event.target.value)}
                  value={activeProfile?.studentId ?? ""}
                >
                  {profiles.map((profile) => (
                    <option key={profile.studentId} value={profile.studentId}>
                      {profile.displayName}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm font-medium text-ink">
                  {activeProfile?.displayName ?? "Student 1"}
                </div>
              )}
              <button className="text-sm font-medium text-accent" onClick={() => void handleCreateStudent()} type="button">
                Add student
              </button>
            </div>
          </div>
          <nav className="flex flex-wrap gap-2 px-5 py-4 sm:px-6">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                className={({ isActive }) =>
                  isActive
                    ? "action-link"
                    : "secondary-link"
                }
                to={item.to}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </header>
      ) : (
        <div className="mb-4 flex justify-end">
          <div className="rounded-full border border-stone-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
            Focus Mode
          </div>
        </div>
      )}
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
