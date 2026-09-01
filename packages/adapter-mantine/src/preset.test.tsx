import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
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
    expect(part("status-bar")).not.toBeNull();
    expect(screen.queryByRole("button", { name: /export/i })).not.toBeNull();
  });

  it("leaves out the members whose configuration was not supplied", () => {
    table(standardFeatures());

    expect(part("group-toggle")).toBeNull();
    expect(part("bulk-bar")).toBeNull();
    expect(part("saved-views-button")).toBeNull();
  });

  it("composes nothing that would be inert on its own", () => {
    table(standardFeatures());

    // The density toggle needs the host's `onDensityChange` and selection
    // statistics need a cell range, so neither is a preset member — and
    // neither leaves a trace here, in particular no selection column.
    expect(part("density-toggle")).toBeNull();
    expect(part("selection-header")).toBeNull();
    expect(part("selection-stats")).toBeNull();
  });

  it("adds a configured member, and only that one", () => {
    table(standardFeatures<Row>({ grouping: "team" }));

    expect(part("group-toggle")).not.toBeNull();
    expect(part("bulk-bar")).toBeNull();
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
