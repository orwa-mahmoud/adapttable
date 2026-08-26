import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DataTable } from "./DataTable";
import { grouping } from "./grouping";
import type { ColumnDef } from "./index";

interface Row {
  id: string;
  team: string;
  status: string;
}
const ROWS: Row[] = [
  { id: "1", team: "Core", status: "active" },
  { id: "2", team: "Core", status: "blocked" },
  { id: "3", team: "Web", status: "blocked" },
];
const COLS: ColumnDef<Row>[] = [
  { key: "team", header: "Team", accessor: (r) => r.team },
  { key: "status", header: "Status", accessor: (r) => r.status },
];

/**
 * Nested grouping for the antd adapter.
 *
 * Core owns the tree; each adapter has to render a header per level, indent
 * the deeper ones, and collapse one branch without touching another.
 */
describe.each(["prop", "feature"] as const)(
  "nested grouping via %s (antd)",
  (path) => {
    const table = () =>
      render(
        <DataTable<Row>
          data={ROWS}
          columns={COLS}
          rowKey={(r) => r.id}
          urlSync={false}
          forceMobile={false}
          {...(path === "feature"
            ? { features: [grouping(["team", "status"])] }
            : { groupBy: ["team", "status"] })}
        />
      );
    /** Group headers in document order, as plain text. */
    const headers = () =>
      [...document.querySelectorAll('[data-adapttable-part="group-row"]')].map(
        (el) => el.textContent?.replace(/\s+/g, " ").trim() ?? ""
      );
    /** The element each kit puts the indent on. */
    const indents = () =>
      [
        ...document.querySelectorAll<HTMLElement>(
          '[data-adapttable-part="group-cell"]'
        ),
      ].map((el) => el.style.paddingInlineStart);

    it("renders a header per level, parents before children", () => {
      table();
      const labels = headers();
      expect(labels).toHaveLength(5);
      expect(labels[0]).toContain("Core");
      expect(labels[1]).toContain("active");
      expect(labels[3]).toContain("Web");
    });

    it("indents the deeper level, logically so RTL mirrors it", () => {
      table();
      expect(indents()[0]).toBe("");
      expect(indents()[1]).toBe("1.5rem");
    });

    it("counts a parent by its whole subtree", () => {
      table();
      expect(headers()[0]).toContain("2");
    });

    it("collapses one branch and leaves the other alone", () => {
      table();
      fireEvent.click(
        document.querySelectorAll('[data-adapttable-part="group-toggle"]')[0]!
      );
      const after = headers();
      // Core is closed, so its status headers are gone; Web keeps its own.
      expect(after).toHaveLength(3);
      expect(after[0]).toContain("Core");
      expect(after[1]).toContain("Web");
    });
  }
);
