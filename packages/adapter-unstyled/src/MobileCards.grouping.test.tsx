/**
 * Grouping on a phone is a different code path from grouping on a desktop:
 * the card list rebuilds the whole body itself rather than reusing the table
 * row assembly, so every block a grouped table can contain — group headers,
 * host-inserted extra rows, and pinned summaries — has to be proven to reach
 * the cards too. Losing one of them there is invisible on a desktop run.
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DataTable } from "./data-table.test-utils";
import { grouping } from "./grouping";
import type { ColumnDef } from "./index";
import { pinnedSummaryRows } from "./pinned-summary-rows";

interface Task {
  id: string;
  title: string;
  team: string;
}

const ROWS: Task[] = [
  { id: "1", title: "Ship", team: "Core" },
  { id: "2", title: "Test", team: "Core" },
  { id: "3", title: "Write guide", team: "Docs" },
];
const COLS: ColumnDef<Task>[] = [
  { key: "title", header: "Title", accessor: (r) => r.title },
  { key: "team", header: "Team", accessor: (r) => r.team },
];
const TOP = { id: "totals", title: "Team total", team: "All" };
const BOTTOM = { id: "grand", title: "Grand total", team: "All" };

const parts = (name: string) => [
  ...document.querySelectorAll<HTMLElement>(`[data-adapttable-part="${name}"]`),
];

function mount() {
  render(
    <DataTable
      data={ROWS}
      columns={COLS}
      rowKey={(r) => r.id}
      urlSync={false}
      forceMobile
      extraRows={[
        { key: "s", kind: "separator", beforeRowId: "3" },
        { key: "n", kind: "fullWidth", render: () => "Team note" },
      ]}
      features={[
        grouping(["team"]),
        pinnedSummaryRows({ top: [TOP], bottom: [BOTTOM] }),
      ]}
    />
  );
}

describe("grouped card list (unstyled)", () => {
  it("gives every group its own header card and keeps its rows", () => {
    mount();
    const headers = parts("group-card").map((el) => el.textContent ?? "");
    expect(headers.some((text) => text.includes("Core"))).toBe(true);
    expect(headers.some((text) => text.includes("Docs"))).toBe(true);
    // The leaf rows still render as ordinary cards under their header.
    expect(screen.getByText("Ship")).toBeInTheDocument();
    expect(screen.getByText("Write guide")).toBeInTheDocument();
  });

  it("carries host-inserted extra rows into the cards", () => {
    mount();
    const separator = parts("separator-row")[0];
    expect(separator).toBeDefined();
    expect(separator).toHaveAttribute("role", "separator");
    expect(separator).toHaveAccessibleName();
    expect(screen.getByText("Team note")).toBeInTheDocument();
    expect(parts("full-width-row")).toHaveLength(1);
  });

  it("pins the summary cards above and below the grouped list", () => {
    mount();
    const list = document.querySelector<HTMLElement>(
      '[data-adapttable-part="cards"]'
    );
    expect(list).not.toBeNull();
    const text = [...(list?.children ?? [])].map((el) => el.textContent ?? "");
    expect(text[0]).toContain("Team total");
    expect(text.at(-1)).toContain("Grand total");
  });
});
