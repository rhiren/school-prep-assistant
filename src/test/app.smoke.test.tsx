import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RouterProvider, createMemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { routes } from "../app/router";
import {
  AppServicesProvider,
  createAppServices,
} from "../state/AppServicesProvider";
import { TestModeProvider } from "../state/TestModeProvider";
import { MemoryStorageService } from "../storage/memoryStorageService";

describe("app smoke flow", () => {
  it("renders graphing tutorial figures with accessible descriptions and the deployment base path", async () => {
    const router = createMemoryRouter(routes, {
      initialEntries: ["/concept/concept-graph-linear-equations/tutorial"],
    });
    const services = await createAppServices(new MemoryStorageService());
    render(
      <AppServicesProvider services={services}>
        <TestModeProvider><RouterProvider router={router} /></TestModeProvider>
      </AppServicesProvider>,
    );
    const images = await screen.findAllByRole("img", { name: /^Graph of y =/ });
    expect(images).toHaveLength(2);
    for (const [i, name] of ["positive", "negative"].entries()) {
      expect(images[i]).toHaveAttribute("src", `${import.meta.env.BASE_URL}content/math/course3/images/graph-linear-${name}.svg`);
    }
    expect(screen.getByRole("heading", { name: "When you are unsure, make a table" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Check your reasoning" })).toBeInTheDocument();
  });

  it("navigates from subjects to concept test start", async () => {
    const user = userEvent.setup();
    const router = createMemoryRouter(routes, {
      initialEntries: ["/subjects"],
    });
    const services = await createAppServices(new MemoryStorageService());

    render(
      <AppServicesProvider services={services}>
        <TestModeProvider>
          <RouterProvider router={router} />
        </TestModeProvider>
      </AppServicesProvider>,
    );

    expect(await screen.findByText("Mathematics")).toBeInTheDocument();
    expect(screen.getAllByText("2 courses available").length).toBeGreaterThan(0);
    await user.click(screen.getByRole("link", { name: "Open Course 2" }));

    expect(
      await screen.findByText("Ratios and Proportional Relationships"),
    ).toBeInTheDocument();
    await user.click(screen.getAllByRole("link", { name: "Open concept" })[0]);

    expect(await screen.findByText("Tutorial and test sets")).toBeInTheDocument();
    await user.click(screen.getAllByRole("button", { name: "Start test" })[0]);

    expect(await screen.findByText("Concept Test Session")).toBeInTheDocument();
    expect(screen.getByText("Question 1 of 50")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Review unanswered questions" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Question 2, unanswered" })).toBeInTheDocument();

    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    await user.click(screen.getByRole("button", { name: "Submit test" }));

    expect(confirmSpy).toHaveBeenCalledOnce();
    expect(screen.getByText("Concept Test Session")).toBeInTheDocument();
    confirmSpy.mockRestore();
  });

  it("renders structured Course 3 tutorial content for learners", async () => {
    const router = createMemoryRouter(routes, {
      initialEntries: ["/concept/concept-square-roots-perfect-squares/tutorial"],
    });
    const services = await createAppServices(new MemoryStorageService());

    render(
      <AppServicesProvider services={services}>
        <TestModeProvider>
          <RouterProvider router={router} />
        </TestModeProvider>
      </AppServicesProvider>,
    );

    expect(
      await screen.findByRole("heading", {
        level: 3,
        name: "Square Roots and Perfect Squares",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        level: 4,
        name: "Perfect squares to know",
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Number" })).toBeInTheDocument();
    expect(screen.getByText("7² = 49")).toBeInTheDocument();
  });
});
