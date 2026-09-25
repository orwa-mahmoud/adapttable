import { defaultLabels } from "@adapttable/core";
import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { renderMui } from "../test-utils";
import { ErrorState } from "./ErrorState";

/**
 * The load-failure path.
 *
 * A source that rejects is the one state the table cannot recover from on its
 * own, so what matters is that it says what went wrong and offers the way back
 * when — and only when — the host gave it one.
 */
describe("ErrorState (mui)", () => {
  it("names the failure and offers a retry the host can act on", () => {
    const onRetry = vi.fn();
    renderMui(
      <ErrorState
        error={new Error("network down")}
        labels={defaultLabels}
        onRetry={onRetry}
      />
    );

    expect(screen.getByText(defaultLabels.errorTitle)).toBeVisible();
    expect(screen.getByText(/network down/)).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: defaultLabels.retry }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("draws no retry when the host offers none", () => {
    renderMui(
      <ErrorState error={new Error("network down")} labels={defaultLabels} />
    );

    expect(screen.getByText(/network down/)).toBeVisible();
    expect(
      screen.queryByRole("button", { name: defaultLabels.retry })
    ).not.toBeInTheDocument();
  });
});
