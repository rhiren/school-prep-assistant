import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RouterProvider, createMemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { APP_VERSION } from "../app/version";
import { routes } from "../app/router";
import { syncDiagnosticsStore } from "../services/syncDiagnostics";
import {
  AppServicesProvider,
  createAppServices,
} from "../state/AppServicesProvider";
import { TestModeProvider } from "../state/TestModeProvider";
import { MemoryStorageService } from "../storage/memoryStorageService";

describe("admin console", () => {
  beforeEach(() => {
    syncDiagnosticsStore.clear();
    window.localStorage.clear();
  });

  it("opens from the hidden title gesture and supports profile cleanup", async () => {
    const user = userEvent.setup();
    const router = createMemoryRouter(routes, {
      initialEntries: ["/"],
    });
    const services = await createAppServices(new MemoryStorageService());

    const testProfile = await services.studentProfileService.createProfile("Test Student", "6", undefined, {
      profileType: "test",
      featureFlags: {
        smartRetry: true,
      },
    });

    render(
      <AppServicesProvider services={services}>
        <TestModeProvider>
          <RouterProvider router={router} />
        </TestModeProvider>
      </AppServicesProvider>,
    );

    const titleButton = await screen.findByRole("button", { name: "School Prep Assistant" });
    for (let count = 0; count < 5; count += 1) {
      await user.click(titleButton);
    }

    expect(await screen.findByText("Admin Console")).toBeInTheDocument();
    expect(screen.getByText(APP_VERSION)).toBeInTheDocument();
    expect(screen.getByText("Weekly Parent Report")).toBeInTheDocument();
    expect(screen.getByText("Remote Diagnostics")).toBeInTheDocument();
    expect(screen.getByText("Sync Diagnostics")).toBeInTheDocument();
    expect(screen.getAllByText("student-1").length).toBeGreaterThan(0);
    expect(screen.getAllByText(testProfile.studentId).length).toBeGreaterThan(0);
    expect(screen.getAllByText("smartRetry").length).toBeGreaterThan(0);
    expect(screen.getAllByText("enabled").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "Delete profile" }).length).toBeGreaterThan(0);

    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    await user.click(screen.getAllByRole("button", { name: "Delete profile" })[0]);

    await waitFor(() => {
      expect(screen.queryByText("Test Student")).not.toBeInTheDocument();
    });

    expect(confirmSpy).toHaveBeenCalledOnce();
    expect(confirmSpy.mock.calls[0]?.[0]).toContain("No saved work was found for this profile.");
    confirmSpy.mockRestore();
  }, 10000);

  it("can convert a production profile into a test profile from hidden admin", async () => {
    const user = userEvent.setup();
    const router = createMemoryRouter(routes, {
      initialEntries: ["/"],
    });
    const services = await createAppServices(new MemoryStorageService());

    await services.studentProfileService.createProfile("test1", "6");

    render(
      <AppServicesProvider services={services}>
        <TestModeProvider>
          <RouterProvider router={router} />
        </TestModeProvider>
      </AppServicesProvider>,
    );

    const titleButton = await screen.findByRole("button", { name: "School Prep Assistant" });
    for (let count = 0; count < 5; count += 1) {
      await user.click(titleButton);
    }

    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    const featureFlagsSection = screen.getByText("Feature Flags").closest("section");
    expect(featureFlagsSection).not.toBeNull();
    const test1Card = within(featureFlagsSection as HTMLElement)
      .getAllByText("test1")
      .find((element) => element.tagName.toLowerCase() === "div")
      ?.closest("div.rounded-2xl");
    expect(test1Card).not.toBeNull();
    await user.click(
      within(test1Card as HTMLElement).getByRole("button", { name: "Convert to test" }),
    );

    await waitFor(() => {
      const testStudentsSection = screen.getByText("Test Students").closest("section");
      expect(testStudentsSection).not.toBeNull();
      expect(within(testStudentsSection as HTMLElement).getByText("test1")).toBeInTheDocument();
      expect(screen.getAllByRole("button", { name: "Delete profile" }).length).toBeGreaterThan(0);
    });

    expect(confirmSpy).toHaveBeenCalledOnce();
    confirmSpy.mockRestore();
  });

  it("can enable smart retry for a test profile from hidden admin", async () => {
    const user = userEvent.setup();
    const router = createMemoryRouter(routes, {
      initialEntries: ["/"],
    });
    const services = await createAppServices(new MemoryStorageService());

    await services.studentProfileService.createProfile("Test Student", "6", undefined, {
      profileType: "test",
    });

    render(
      <AppServicesProvider services={services}>
        <TestModeProvider>
          <RouterProvider router={router} />
        </TestModeProvider>
      </AppServicesProvider>,
    );

    const titleButton = await screen.findByRole("button", { name: "School Prep Assistant" });
    for (let count = 0; count < 5; count += 1) {
      await user.click(titleButton);
    }

    const featureFlagsSection = screen.getByText("Feature Flags").closest("section");
    expect(featureFlagsSection).not.toBeNull();
    const toggle = within(featureFlagsSection as HTMLElement).getByRole("checkbox");
    expect(toggle).not.toBeChecked();

    await user.click(toggle);

    await waitFor(() => {
      expect(toggle).toBeChecked();
      expect(screen.getByText("enabled")).toBeInTheDocument();
    });
  });

  it("includes saved-work details before deleting a profile", async () => {
    const user = userEvent.setup();
    const router = createMemoryRouter(routes, {
      initialEntries: ["/"],
    });
    const services = await createAppServices(new MemoryStorageService());
    const profile = await services.studentProfileService.createProfile("Kashish", "6");
    await services.studentProfileService.setActiveStudent(profile.studentId);

    const session = await services.testGenerationService.createConceptSession("concept-unit-rates");
    const question = await services.contentRepository.getQuestionById(session.questionIds[0] ?? "");
    if (!question) {
      throw new Error("Expected question for delete-confirmation test.");
    }

    await services.sessionService.saveAnswer(session.id, {
      questionId: question.id,
      response: question.correctAnswer,
      answeredAt: "2026-04-24T10:02:00.000Z",
    });

    render(
      <AppServicesProvider services={services}>
        <TestModeProvider>
          <RouterProvider router={router} />
        </TestModeProvider>
      </AppServicesProvider>,
    );

    const titleButton = await screen.findByRole("button", { name: "School Prep Assistant" });
    for (let count = 0; count < 5; count += 1) {
      await user.click(titleButton);
    }

    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    const featureFlagsSection = screen.getByText("Feature Flags").closest("section");
    expect(featureFlagsSection).not.toBeNull();
    const card = within(featureFlagsSection as HTMLElement)
      .getAllByText("Kashish")
      .find((element) => element.tagName.toLowerCase() === "div")
      ?.closest("div.rounded-2xl");
    expect(card).not.toBeNull();

    await user.click(within(card as HTMLElement).getByRole("button", { name: "Delete profile" }));

    expect(confirmSpy).toHaveBeenCalledOnce();
    expect(confirmSpy.mock.calls[0]?.[0]).toContain("1 in-progress session(s)");
    expect(confirmSpy.mock.calls[0]?.[0]).toContain("Delete profile Kashish");
    confirmSpy.mockRestore();
  });

  it("shows captured sync diagnostics in hidden admin", async () => {
    const user = userEvent.setup();
    const router = createMemoryRouter(routes, {
      initialEntries: ["/"],
    });
    const services = await createAppServices(new MemoryStorageService());

    syncDiagnosticsStore.record({
      severity: "error",
      source: "profile-sync",
      message: "Cloud student roster read failed.",
      details: {
        code: "permission-denied",
      },
    });

    render(
      <AppServicesProvider services={services}>
        <TestModeProvider>
          <RouterProvider router={router} />
        </TestModeProvider>
      </AppServicesProvider>,
    );

    const titleButton = await screen.findByRole("button", { name: "School Prep Assistant" });
    for (let count = 0; count < 5; count += 1) {
      await user.click(titleButton);
    }

    expect(await screen.findByText("Cloud student roster read failed.")).toBeInTheDocument();
    expect(screen.getByText(/permission-denied/)).toBeInTheDocument();
  });

  it("shows daily and weekly parent report views for the active student in hidden admin", async () => {
    const user = userEvent.setup();
    const router = createMemoryRouter(routes, {
      initialEntries: ["/"],
    });
    const services = await createAppServices(new MemoryStorageService());
    const profile = await services.studentProfileService.createProfile("Kashish", "6");
    await services.studentProfileService.setActiveStudent(profile.studentId);

    const session = await services.testGenerationService.createConceptSession("concept-unit-rates");
    const question = await services.contentRepository.getQuestionById(session.questionIds[0] ?? "");
    if (!question) {
      throw new Error("Expected concept question for weekly report test.");
    }

    await services.sessionService.saveAnswer(session.id, {
      questionId: question.id,
      response: question.correctAnswer,
      answeredAt: "2026-04-24T10:02:00.000Z",
    });
    await services.sessionService.submitSession(session.id);

    render(
      <AppServicesProvider services={services}>
        <TestModeProvider>
          <RouterProvider router={router} />
        </TestModeProvider>
      </AppServicesProvider>,
    );

    const titleButton = await screen.findByRole("button", { name: "School Prep Assistant" });
    for (let count = 0; count < 5; count += 1) {
      await user.click(titleButton);
    }

    expect(await screen.findByText("Today: 1 completed attempt(s), 1 concept(s) worked, 1 min of completed time, 0 in-progress session(s).")).toBeInTheDocument();
    expect(screen.getByText("Today's Concept Activity")).toBeInTheDocument();
    expect(screen.getByText("Reviewing the last 7 days of completed attempts and in-progress work.")).toBeInTheDocument();
    expect(screen.getAllByText("Mathematics").length).toBeGreaterThan(0);
    expect(screen.getByText("Recent Concept Signals")).toBeInTheDocument();
  });
});
