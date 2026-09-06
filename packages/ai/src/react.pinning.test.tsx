/**
 * Pinning through the live table, not through a host callback.
 *
 * The binding's job is to turn the composed view into capabilities: a table
 * that publishes pin setters offers them, a table that does not stays silent,
 * and the call lands on the very setter the chrome uses.
 */
import {
  applyTableFeatures,
  FeatureProviders,
  type TableRuntimeView,
  useFeatureState,
  usePublishTableRuntime,
} from "@adapttable/react/adapter";
import { render, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { TABLE_AGENT_STATE, tableAgent } from "./react";
import type { AgentSession } from "./types";

interface Row {
  id: string;
  name: string;
}

const ROWS: Row[] = [{ id: "1", name: "Ada" }];

const handles: { current: AgentSession | undefined } = { current: undefined };

function Publisher({ view }: { view: TableRuntimeView<Row> }) {
  usePublishTableRuntime(view.rows, undefined, view);
  return null;
}

function Reader() {
  handles.current = useFeatureState(TABLE_AGENT_STATE);
  return null;
}

function mount(view: TableRuntimeView<Row>): void {
  const props = applyTableFeatures({
    features: [
      tableAgent({
        tableId: "pinning",
        approval: "never",
        columns: { name: { type: "string" } },
      }),
    ],
  });
  render(
    <FeatureProviders props={props}>
      <Publisher view={view} />
      <Reader />
    </FeatureProviders>
  );
}

function baseView(
  patch: Partial<TableRuntimeView<Row>>
): TableRuntimeView<Row> {
  return {
    rows: ROWS,
    getRowId: (row) => row.id,
    rowLabel: (row) => row.name,
    ...patch,
  };
}

const session = (): AgentSession => {
  const value = handles.current;
  if (!value) throw new Error("no session");
  return value;
};

async function ready(): Promise<void> {
  await waitFor(() => {
    expect(handles.current).toBeDefined();
  });
}

describe("pinning capabilities follow the composed view", () => {
  it("offers neither when the table publishes no pinning", async () => {
    mount(baseView({}));
    await ready();

    const keys = session()
      .catalog()
      .map((entry) => entry.key);
    expect(keys).not.toContain("view.pinColumn");
    expect(keys).not.toContain("view.pinRow");
  });

  it("pins a column through the chrome's own setter", async () => {
    const setColumnPin = vi.fn();
    mount(baseView({ pinning: { columns: {}, setColumnPin } }));
    await ready();

    const result = await session().execute(
      "view.pinColumn",
      { key: "name", side: "start" },
      session().manifest().viewRevision,
      "live-1"
    );

    expect(result.ok).toBe(true);
    expect(setColumnPin).toHaveBeenCalledExactlyOnceWith("name", "start");
  });

  it("unpins through the same setter", async () => {
    const setColumnPin = vi.fn();
    mount(baseView({ pinning: { columns: { name: "start" }, setColumnPin } }));
    await ready();

    const result = await session().execute(
      "view.pinColumn",
      { key: "name", side: null },
      session().manifest().viewRevision,
      "live-2"
    );

    expect(result.ok).toBe(true);
    expect(setColumnPin).toHaveBeenCalledExactlyOnceWith("name", undefined);
  });

  it("reports the live pin state back through view.describe", async () => {
    mount(
      baseView({
        pinning: {
          columns: { name: "start" },
          setColumnPin: vi.fn(),
          rows: { top: ["1"], bottom: [] },
          setRowPin: vi.fn(),
        },
      })
    );
    await ready();

    const result = await session().execute(
      "view.describe",
      {},
      session().manifest().viewRevision,
      "live-3"
    );

    expect(result.result).toMatchObject({
      pinnedColumns: { name: "start" },
      pinnedRows: { top: ["1"], bottom: [] },
    });
  });

  it("pins a row through the chrome's own setter", async () => {
    const setRowPin = vi.fn();
    mount(
      baseView({
        pinning: { columns: {}, rows: { top: [], bottom: [] }, setRowPin },
      })
    );
    await ready();

    const result = await session().execute(
      "view.pinRow",
      { rowKey: "1", side: "top" },
      session().manifest().viewRevision,
      "live-4"
    );

    expect(result.ok).toBe(true);
    expect(setRowPin).toHaveBeenCalledExactlyOnceWith("1", "top");
  });

  it("offers row pinning without column pinning, and the reverse", async () => {
    mount(
      baseView({
        pinning: {
          columns: {},
          rows: { top: [], bottom: [] },
          setRowPin: vi.fn(),
        },
      })
    );
    await ready();

    const keys = session()
      .catalog()
      .map((entry) => entry.key);
    expect(keys).toContain("view.pinRow");
    expect(keys).not.toContain("view.pinColumn");
  });

  it("reports a host callback overriding the live setter", async () => {
    const hostPin = vi.fn();
    const props = applyTableFeatures({
      features: [
        tableAgent({
          tableId: "override",
          approval: "never",
          columns: { name: { type: "string" } },
          apply: { pinColumn: hostPin },
        }),
      ],
    });
    render(
      <FeatureProviders props={props}>
        <Publisher view={baseView({})} />
        <Reader />
      </FeatureProviders>
    );
    await ready();

    const result = await session().execute(
      "view.pinColumn",
      { key: "name", side: "start" },
      session().manifest().viewRevision,
      "live-5"
    );

    // The table publishes no pinning at all, so the capability exists only
    // because the host wired it, and it is the host's callback that runs.
    expect(result.ok).toBe(true);
    expect(hostPin).toHaveBeenCalledExactlyOnceWith("name", "start");
  });
});
