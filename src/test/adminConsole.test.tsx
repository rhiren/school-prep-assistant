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

  it("opens from the hidden title gesture and manages only test students", async () => {
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
    expect(screen.getByText("Remote Diagnostics")).toBeInTheDocument();
    expect(screen.getByText("Sync Diagnostics")).toBeInTheDocument();
    expect(screen.getAllByText("student-1").length).toBeGreaterThan(0);
    expect(screen.getAllByText(testProfile.studentId).length).toBeGreaterThan(0);
    expect(screen.getAllByText("smartRetry").length).toBeGreaterThan(0);
    expect(screen.getAllByText("enabled").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "Delete test profile" })).toHaveLength(1);

    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    await user.click(screen.getByRole("button", { name: "Delete test profile" }));

    await waitFor(() => {
      expect(screen.queryByText("Test Student")).not.toBeInTheDocument();
    });

    expect(confirmSpy).toHaveBeenCalledOnce();
    expect(screen.queryByRole("button", { name: "Delete test profile" })).not.toBeInTheDocument();
    confirmSpy.mockRestore();
  });

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
      expect(screen.getByRole("button", { name: "Delete test profile" })).toBeInTheDocument();
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
});
