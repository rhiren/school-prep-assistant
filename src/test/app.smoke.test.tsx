import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RouterProvider, createMemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { routes } from "../app/router";
import {
  AppServicesProvider,
  createAppServices,
} from "../state/AppServicesProvider";
import { MemoryStorageService } from "../storage/memoryStorageService";

describe("app smoke flow", () => {
  it("navigates from courses to concept test start", async () => {
    const user = userEvent.setup();
    const router = createMemoryRouter(routes, {
      initialEntries: ["/courses"],
    });
    const services = createAppServices(new MemoryStorageService());

    render(
      <AppServicesProvider services={services}>
        <RouterProvider router={router} />
      </AppServicesProvider>,
    );

    expect(await screen.findByText("Course 2")).toBeInTheDocument();
    await user.click(screen.getByRole("link", { name: "Open course" }));

    expect(await screen.findByText("Ratios and Proportions")).toBeInTheDocument();
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
});
