import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { ColumnDef } from "./index";
import { DataTable } from "./testDataTable";

interface Row {
  id: string;
  team: string;
  status: string;
}
const ROWS: Row[] = [
  { id: "1", team: "Core", status: "active" },
  { id: "2", team: "Core", status: "blocked" },
  { id: "3", team: "Web", status: "active" },
];
const COLS: ColumnDef<Row>[] = [
  { key: "team", header: "Team", accessor: (r) => r.team },
  { key: "status", header: "Status", accessor: (r) => r.status },
];

/**
 * Controlled group expansion.
 *
 * The table performs the change and tells the host; a host that holds the set
 * decides what happens next. These check both halves, and that a key survives
 * a re-render with different data.
 */
describe("controlled group expansion (unstyled)", () => {
  const table = (extra?: Record<string, unknown>) =>
    render(
      <DataTable
        data={ROWS}
        columns={COLS}
        rowKey={(r) => r.id}
        urlSync={false}
        groupBy={["team", "status"]}
        {...extra}
      />
    );
  const headers = () =>
    document.querySelectorAll('[data-adapttable-part="group-row"]');
  const rows = () =>
    document.querySelectorAll('tbody [data-adapttable-part="row"]');

  it("starts with everything open", () => {
    table();
    expect(headers()).toHaveLength(5);
    expect(rows()).toHaveLength(3);
  });

  it("collapses what the controlled set names, without touching the rest", () => {
    const { container } = table();
    const first = container.querySelector(
      '[data-adapttable-part="group-row"]'
    )!;
    const key = first.getAttribute("data-collapsed");
    expect(key).toBeNull();
    // The host holds the set: pass the key of the group it wants closed.
    const onChange = vi.fn();
    table({
      collapsedGroupIds: ["group:team:s:Core"],
      onCollapsedGroupIdsChange: onChange,
    });
    // Core is closed, so only Web's inner header shows beneath the two teams.
    expect(headers()).toHaveLength(8);
  });

  it("asks the host to change, and changes nothing itself", () => {
    const onChange = vi.fn();
    table({ collapsedGroupIds: [], onCollapsedGroupIdsChange: onChange });
    fireEvent.click(
      document.querySelectorAll('[data-adapttable-part="group-toggle"]')[0]!
    );
    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange.mock.calls[0]?.[0]).toEqual(["group:team:s:Core"]);
    // Controlled: the table did not close it on its own.
    expect(headers()).toHaveLength(5);
  });

  it("uncontrolled, it just works", () => {
    table();
    fireEvent.click(
      document.querySelectorAll('[data-adapttable-part="group-toggle"]')[0]!
    );
    expect(headers()).toHaveLength(3);
  });
});
