import { createHashRouter, type RouteObject } from "react-router-dom";
import { AppLayout } from "../components/AppLayout";
import { ConceptPage } from "../routes/ConceptPage";
import { ConceptTutorialPage } from "../routes/ConceptTutorialPage";
import { CoursePage } from "../routes/CoursePage";
import { CoursesPage } from "../routes/CoursesPage";
import { HomePage } from "../routes/HomePage";
import { ProgressPage } from "../routes/ProgressPage";
import { ResultsPage } from "../routes/ResultsPage";
import { TestPage } from "../routes/TestPage";

export const routes: RouteObject[] = [
  {
    path: "/",
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: "courses",
        element: <CoursesPage />,
      },
      {
        path: "course/:courseId",
        element: <CoursePage />,
      },
      {
        path: "concept/:conceptId",
        element: <ConceptPage />,
      },
      {
        path: "concept/:conceptId/tutorial",
        element: <ConceptTutorialPage />,
      },
      {
        path: "test/:sessionId",
        element: <TestPage />,
      },
      {
        path: "results/:attemptId",
        element: <ResultsPage />,
      },
      {
        path: "progress",
        element: <ProgressPage />,
      },
    ],
  },
];

export const router = createHashRouter(routes);
