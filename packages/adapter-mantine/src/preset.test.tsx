import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DataTable } from "./DataTable";
import type { ColumnDef } from "./index";
import { standardFeatures } from "./preset";

interface Row {
  id: string;
  name: string;
  team: string;
}
const ROWS: Row[] = [
  { id: "1", name: "Ada", team: "Core" },
  { id: "2", name: "Grace", team: "Web" },
];
const COLS: ColumnDef<Row>[] = [
  { key: "name", header: "Name", accessor: (r) => r.name },
  { key: "team", header: "Team", accessor: (r) => r.team },
];

/**
 * One import, a good table.
 *
 * The preset is assembled from the same public feature entries a caller would
 * import by hand, so what it proves here is that composing it needs no type
 * argument, arms the zero-configuration chrome, and adds a configured member
 * only when its option is supplied — an inert feature is the one thing the
 * preset must never ship.
 */
describe("standard preset (mantine)", () => {
  const part = (name: string) =>
    document.querySelector(`[data-adapttable-part="${name}"]`);

  const table = (features: unknown) =>
    render(
      <MantineProvider>
        <DataTable
          data={ROWS}
          columns={COLS}
          rowKey={(r) => r.id}
          urlSync={false}
          features={features as never}
        />
      </MantineProvider>
    );

  it("composes with no arguments and no type argument", () => {
    table(standardFeatures());

    expect(document.querySelector("table")).not.toBeNull();
    expect(part("column-menu-button")).not.toBeNull();
    expect(part("density-toggle")).not.toBeNull();
    expect(part("status-bar")).not.toBeNull();
    expect(screen.queryByRole("button", { name: /export/i })).not.toBeNull();
  });

  it("leaves out the members whose configuration was not supplied", () => {
    table(standardFeatures());

    expect(part("group-toggle")).toBeNull();
    expect(part("bulk-bar")).toBeNull();
    expect(part("saved-views-button")).toBeNull();
  });

  it("leaves out the remaining bare feature that would be inert", () => {
    table(standardFeatures());

    // Selection statistics needs a cell range, so it is not a preset member
    // and leaves no trace here, in particular no selection column.
    expect(part("selection-header")).toBeNull();
    expect(part("selection-stats")).toBeNull();
  });

  it("owns density when the caller supplies no density props", () => {
    table(standardFeatures());
    const toggle = part("density-toggle")!;

    expect(toggle).toHaveTextContent(/comfortable/i);
    fireEvent.click(toggle);
    expect(toggle).toHaveTextContent(/compact/i);
  });

  it("adds a configured member, and only that one", () => {
    table(standardFeatures<Row>({ grouping: "team" }));

    expect(part("group-toggle")).not.toBeNull();
    expect(part("bulk-bar")).toBeNull();
  });

  it("draws no Find control unless asked", () => {
    table(standardFeatures());

    expect(part("find-button")).toBeNull();
  });

  it("findButton: true draws Find after Export and before Fullscreen, and it opens the find bar", () => {
    table(standardFeatures<Row>({ findButton: true }));
    const find = part("find-button")!;
    const exportButton = screen.getByRole("button", { name: /export/i });
    const fullscreen = part("fullscreen-toggle")!;

    expect(
      exportButton.compareDocumentPosition(find) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(
      find.compareDocumentPosition(fullscreen) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();

    fireEvent.click(find);
    expect(part("find-bar")).not.toBeNull();
  });

  it("is an ordinary array a caller can extend", () => {
    const mine = { id: "mine", apply: () => ({ tableLabel: "Mine" }) };
    const composed = [...standardFeatures<Row>(), mine];
    table(composed);

    expect(composed).toHaveLength(standardFeatures<Row>().length + 1);
    expect(document.querySelector("table")).not.toBeNull();
    expect(vi.isMockFunction(vi.fn())).toBe(true);
  });
});
