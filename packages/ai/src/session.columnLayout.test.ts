/**
 * Hide and column order: the Columns menu's own operations, as capabilities.
 */
import { describe, expect, it, vi } from "vitest";

import { createAgentSession } from "./session";
import type { AgentObservation } from "./types";

const SOURCE = {
  fullDataset: true,
  grouping: "client" as const,
  selectAcrossPages: false,
  exportScope: "page" as const,
  totalCount: "loaded" as const,
};

function observation(patch: Partial<AgentObservation> = {}): AgentObservation {
  return {
    tableId: "staff",
    viewRevision: 1,
    featureIds: ["column-menu"],
    columns: [
      {
        id: "person",
        label: "Person",
        type: "string",
        readable: true,
        writable: false,
        sortable: true,
        visible: true,
      },
      {
        id: "salary",
        label: "Salary",
        type: "number",
        readable: true,
        writable: false,
        sortable: true,
        visible: true,
      },
    ],
    source: SOURCE,
    writePolicy: "allow",
    approval: "writes",
    hasPagination: true,
    hasSearch: true,
    hasSort: true,
    hasFilters: false,
    hasExport: false,
    hasEdit: false,
    hasReorder: false,
    hasColumnHide: true,
    hasColumnOrder: true,
    hiddenColumns: [],
    columnOrder: ["person", "salary"],
    page: 1,
    limit: 10,
    search: "",
    pageMax: 50,
    rowAddressScope: "visible",
    ...patch,
  };
}

describe("column hide and order follow the wired operation", () => {
  it("advertises neither when the table cannot change layout", () => {
    const session = createAgentSession({
      observe: () =>
        observation({ hasColumnHide: false, hasColumnOrder: false }),
      apply: {},
    });
    const keys = session.catalog().map((entry) => entry.key);

    expect(keys).not.toContain("view.hideColumn");
    expect(keys).not.toContain("view.setColumnOrder");
  });

  it("advertises both when both are wired", () => {
    const session = createAgentSession({ observe: observation, apply: {} });
    const keys = session.catalog().map((entry) => entry.key);

    expect(keys).toContain("view.hideColumn");
    expect(keys).toContain("view.setColumnOrder");
  });

  it("closes hide and order to the live column ids", () => {
    const input = createAgentSession({
      observe: observation,
      apply: {},
    }).describe("view.hideColumn").input;

    expect(input?.properties?.key?.enum).toEqual(["person", "salary"]);
    expect(
      createAgentSession({ observe: observation, apply: {} }).describe(
        "view.setColumnOrder"
      ).input?.properties?.order?.items
    ).toEqual({ type: "string", enum: ["person", "salary"] });
  });

  it("reports the live layout through view.describe", async () => {
    const session = createAgentSession({
      observe: () =>
        observation({
          hiddenColumns: ["salary"],
          columnOrder: ["salary", "person"],
          columns: [
            {
              id: "salary",
              label: "Salary",
              type: "number",
              readable: true,
              writable: false,
              sortable: true,
              visible: false,
            },
            {
              id: "person",
              label: "Person",
              type: "string",
              readable: true,
              writable: false,
              sortable: true,
              visible: true,
            },
          ],
        }),
      apply: {},
    });
    const result = await session.execute("view.describe", {}, 1, "d1");

    expect(result.result).toMatchObject({
      hiddenColumns: ["salary"],
      columnOrder: ["salary", "person"],
    });
  });
});

describe("view.hideColumn", () => {
  it("hides a column the menu can hide", async () => {
    const hideColumn = vi.fn();
    const session = createAgentSession({
      observe: observation,
      apply: { hideColumn },
    });
    const result = await session.execute(
      "view.hideColumn",
      { key: "Person", hidden: true },
      1,
      "h1"
    );

    expect(result.ok).toBe(true);
    expect(result.result).toMatchObject({ key: "person", hidden: true });
    expect(hideColumn).toHaveBeenCalledExactlyOnceWith("person", true);
  });

  it("shows a hidden column", async () => {
    const hideColumn = vi.fn();
    const session = createAgentSession({
      observe: () =>
        observation({
          hiddenColumns: ["person"],
          columns: [
            {
              id: "person",
              label: "Person",
              type: "string",
              readable: true,
              writable: false,
              sortable: true,
              visible: false,
            },
            {
              id: "salary",
              label: "Salary",
              type: "number",
              readable: true,
              writable: false,
              sortable: true,
              visible: true,
            },
          ],
        }),
      apply: { hideColumn },
    });
    await session.execute(
      "view.hideColumn",
      { key: "person", hidden: false },
      1,
      "h2"
    );

    expect(hideColumn).toHaveBeenCalledExactlyOnceWith("person", false);
  });

  it("defaults omitted hidden to true", async () => {
    const hideColumn = vi.fn();
    const session = createAgentSession({
      observe: observation,
      apply: { hideColumn },
    });
    await session.execute("view.hideColumn", { key: "salary" }, 1, "h3");

    expect(hideColumn).toHaveBeenCalledExactlyOnceWith("salary", true);
  });

  it("refuses the last visible column", async () => {
    const hideColumn = vi.fn();
    const session = createAgentSession({
      observe: () =>
        observation({
          hiddenColumns: ["salary"],
          columns: [
            {
              id: "person",
              label: "Person",
              type: "string",
              readable: true,
              writable: false,
              sortable: true,
              visible: true,
            },
            {
              id: "salary",
              label: "Salary",
              type: "number",
              readable: true,
              writable: false,
              sortable: true,
              visible: false,
            },
          ],
        }),
      apply: { hideColumn },
    });
    const result = await session.execute(
      "view.hideColumn",
      { key: "person" },
      1,
      "h4"
    );

    expect(result.ok).toBe(false);
    expect(result.error?.message).toMatch(/last visible column/);
    expect(hideColumn).not.toHaveBeenCalled();
  });

  it("refuses a column the host marked unhideable", async () => {
    const hideColumn = vi.fn();
    const session = createAgentSession({
      observe: () =>
        observation({
          columns: [
            {
              id: "person",
              label: "Person",
              type: "string",
              readable: true,
              writable: false,
              sortable: true,
              hideable: false,
            },
            {
              id: "salary",
              label: "Salary",
              type: "number",
              readable: true,
              writable: false,
              sortable: true,
            },
          ],
        }),
      apply: { hideColumn },
    });
    const result = await session.execute(
      "view.hideColumn",
      { key: "person" },
      1,
      "h5"
    );

    expect(result.ok).toBe(false);
    expect(result.error?.message).toMatch(/not hideable/);
    expect(hideColumn).not.toHaveBeenCalled();
  });
});

describe("view.setColumnOrder", () => {
  it("moves one column by index", async () => {
    const moveColumn = vi.fn();
    const session = createAgentSession({
      observe: observation,
      apply: { moveColumn },
    });
    const result = await session.execute(
      "view.setColumnOrder",
      { key: "salary", index: 0 },
      1,
      "o1"
    );

    expect(result.ok).toBe(true);
    expect(result.result).toMatchObject({ key: "salary", index: 0 });
    expect(moveColumn).toHaveBeenCalledExactlyOnceWith("salary", 0);
  });

  it("replaces the full order", async () => {
    const setColumnOrder = vi.fn();
    const session = createAgentSession({
      observe: observation,
      apply: { setColumnOrder },
    });
    const result = await session.execute(
      "view.setColumnOrder",
      { order: ["salary", "person"] },
      1,
      "o2"
    );

    expect(result.ok).toBe(true);
    expect(result.result).toMatchObject({ order: ["salary", "person"] });
    expect(setColumnOrder).toHaveBeenCalledExactlyOnceWith([
      "salary",
      "person",
    ]);
  });

  it("refuses an order that skips a column", async () => {
    const setColumnOrder = vi.fn();
    const session = createAgentSession({
      observe: observation,
      apply: { setColumnOrder },
    });
    const result = await session.execute(
      "view.setColumnOrder",
      { order: ["salary"] },
      1,
      "o3"
    );

    expect(result.ok).toBe(false);
    expect(result.error?.message).toMatch(/every column/);
    expect(setColumnOrder).not.toHaveBeenCalled();
  });

  it("falls back to rewriting the order when only setColumnOrder is wired", async () => {
    const setColumnOrder = vi.fn();
    const session = createAgentSession({
      observe: observation,
      apply: { setColumnOrder },
    });
    await session.execute(
      "view.setColumnOrder",
      { key: "salary", index: 0 },
      1,
      "o4"
    );

    expect(setColumnOrder).toHaveBeenCalledExactlyOnceWith([
      "salary",
      "person",
    ]);
  });
});
