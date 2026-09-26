/**
 * The operations map answers "what can this runtime view do right now?" from
 * the setters the view publishes, never from the state beside them.
 */
import { describe, expect, it } from "vitest";

import { deriveRuntimeOperations } from "./runtimeOperations";
import type { TableRuntimeView } from "./tableRuntime";

const noop = (): void => undefined;

const view = (patch: Partial<TableRuntimeView> = {}): TableRuntimeView => ({
  rows: [],
  getRowId: () => "",
  rowLabel: () => "",
  ...patch,
});

const query = (
  patch: Partial<NonNullable<TableRuntimeView["query"]>> = {}
): NonNullable<TableRuntimeView["query"]> => ({
  page: 1,
  limit: 10,
  search: "",
  setPage: noop,
  setLimit: noop,
  setSearch: noop,
  setSort: noop,
  ...patch,
});

describe("deriveRuntimeOperations", () => {
  it("reports every operation unwired when there is no view yet", () => {
    const ops = deriveRuntimeOperations(undefined);

    expect(Object.values(ops).every((wired) => !wired)).toBe(true);
    expect(Object.keys(ops)).toHaveLength(13);
  });

  it("reports every operation unwired on a bare view", () => {
    const ops = deriveRuntimeOperations(view());

    expect(Object.values(ops).every((wired) => !wired)).toBe(true);
  });

  it("reports every operation a fully wired view publishes", () => {
    const ops = deriveRuntimeOperations(
      view({
        query: query({ setExtras: noop, clearExtras: noop }),
        groupingState: {
          groupBy: undefined,
          aggregateOverrides: {},
          columnLabel: (key) => key,
          setGroupBy: noop,
        },
        selection: { selectedIds: new Set(), replace: noop },
        editing: { onCellEdit: noop },
        pinning: { columns: {}, setColumnPin: noop, setRowPin: noop },
        columnLayout: {
          keys: ["name"],
          hidden: [],
          setHidden: noop,
          move: noop,
          setOrder: noop,
        },
      })
    );

    expect(Object.values(ops).every(Boolean)).toBe(true);
  });

  it("follows the query setters without a filter channel", () => {
    const ops = deriveRuntimeOperations(view({ query: query() }));

    expect(ops.setPage).toBe(true);
    expect(ops.setLimit).toBe(true);
    expect(ops.setSearch).toBe(true);
    expect(ops.setSort).toBe(true);
    expect(ops.setFilters).toBe(false);
  });

  it("reports filters wired when the view can only clear them", () => {
    const ops = deriveRuntimeOperations(
      view({ query: query({ clearExtras: noop }) })
    );

    expect(ops.setFilters).toBe(true);
  });

  it("reports cell edits wired through the staging channel alone", () => {
    const ops = deriveRuntimeOperations(view({ editing: { stageCell: noop } }));

    expect(ops.editCells).toBe(true);
  });

  it("follows the pinning and layout setters, not their state", () => {
    const ops = deriveRuntimeOperations(
      view({
        pinning: { columns: { name: "start" } },
        columnLayout: { keys: ["name"], hidden: ["name"] },
      })
    );

    expect(ops.pinColumn).toBe(false);
    expect(ops.pinRow).toBe(false);
    expect(ops.hideColumn).toBe(false);
    expect(ops.moveColumn).toBe(false);
    expect(ops.setColumnOrder).toBe(false);
  });
});
