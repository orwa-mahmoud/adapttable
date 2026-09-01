import { useHighlight } from "@adapttable/core";
import { act, fireEvent, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DataTable } from "./data-table.test-utils";
import type { ColumnDef } from "./index";

interface Row {
  id: string;
  name: string;
}
const ROWS: Row[] = [
  { id: "r1", name: "Ada" },
  { id: "r2", name: "Grace" },
];
const COLS: ColumnDef<Row>[] = [
  { key: "name", header: "Name", accessor: (r) => r.name },
];

/**
 * The highlight against a real table.
 *
 * There is no new adapter seam here on purpose. `rowClassName` already
 * reaches every kit, so a highlight is a class the host computes from
 * `useHighlight` — which means the feature works in all nine adapters
 * without one of them being touched, and a host can style it with whatever
 * their design system already uses.
 */
/** The class a host would compute — one branch for marked, one for motion. */
function flashClass(
  highlight: ReturnType<typeof useHighlight>,
  id: string
): string | undefined {
  if (!highlight.isRowHighlighted(id)) return undefined;
  return highlight.animated ? "flash flash--animated" : "flash";
}

function Harness() {
  const highlight = useHighlight(true);
  return (
    <div>
      <button
        type="button"
        data-testid="flash"
        onClick={() => {
          highlight.flashRow("r2");
        }}
      >
        flash
      </button>
      <DataTable
        data={ROWS}
        columns={COLS}
        rowKey={(r) => r.id}
        urlSync={false}
        rowClassName={(row) => flashClass(highlight, row.id)}
      />
    </div>
  );
}

const rowFor = (id: string) =>
  document.querySelector(`[data-adapttable-part="row"][data-row-id="${id}"]`);

describe("highlighting a row through rowClassName", () => {
  it("marks only the row that was flashed", () => {
    const view = render(<Harness />);

    expect(rowFor("r2")?.className).not.toContain("flash");

    act(() => {
      fireEvent.click(view.getByTestId("flash"));
    });

    expect(rowFor("r2")?.className).toContain("flash");
    expect(rowFor("r1")?.className ?? "").not.toContain("flash");
  });

  it("says whether the mark may animate, so the host can pick a class", () => {
    const view = render(<Harness />);
    act(() => {
      fireEvent.click(view.getByTestId("flash"));
    });

    // jsdom reports no reduced-motion preference, so animation is allowed.
    expect(rowFor("r2")?.className).toContain("flash--animated");
  });
});
