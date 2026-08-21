import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SelectionStatsBar } from "./components/SelectionStatsBar";
import { StatusBar } from "./components/StatusBar";
import { defaultLabels } from "@adapttable/core";

const STATS = {
  cells: 2,
  numeric: 2,
  sum: 40,
  average: 20,
  min: 10,
  max: 30,
};

describe("StatusBar and SelectionStatsBar (unstyled)", () => {
  it("paints notice appearance, selected count, and hosted stats", () => {
    render(
      <StatusBar
        enabled
        shown={2}
        selected={1}
        stats={STATS}
        locale="en-US"
        labels={defaultLabels}
        classNames={{ statusBar: "sb", statusItem: "si" }}
        notices={[
          {
            kind: "export-all-page",
            appearance: "one-page",
            message: "Export is this page",
          },
        ]}
      />
    );
    const bar = document.querySelector('[data-adapttable-part="status-bar"]');
    expect(bar).toHaveClass("sb");
    expect(
      document.querySelector('[data-appearance="one-page"]')
    ).toHaveTextContent("Export is this page");
    expect(bar?.textContent).toMatch(/selected/i);
    expect(
      document.querySelector('[data-adapttable-part="selection-stats"]')
    ).not.toBeNull();
  });

  it("renders the stats strip on its own", () => {
    render(
      <SelectionStatsBar stats={STATS} locale="en-US" labels={defaultLabels} />
    );
    expect(screen.getByText(/Sum/)).toBeInTheDocument();
    expect(screen.getByText(/Avg|Average/)).toBeInTheDocument();
  });
});
