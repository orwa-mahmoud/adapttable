import type { BulkAction, RowAction } from "@adapttable/core";
import { describe, expect, it, vi } from "vitest";

import { createAgentSession } from "../session";
import type { AgentObservation, ApprovalSubject } from "../types";
import {
  type DeclaredTableActions,
  tableActionCapabilities,
  tableActionSignature,
} from "./actions";

interface Row {
  id: string;
  name: string;
  locked?: boolean;
}

const ROWS: Row[] = [
  { id: "r1", name: "Ada" },
  { id: "r2", name: "Grace", locked: true },
];

function observation(patch: Partial<AgentObservation> = {}): AgentObservation {
  return {
    tableId: "orders",
    viewRevision: 1,
    featureIds: [],
    columns: [],
    source: {
      fullDataset: false,
      grouping: false,
      selectAcrossPages: false,
      exportScope: "page",
      totalCount: "loaded",
    },
    writePolicy: "allow",
    approval: "never",
    commit: "immediate",
    hasPagination: true,
    hasSearch: false,
    hasSort: false,
    hasFilters: false,
    hasExport: false,
    hasEdit: false,
    hasReorder: false,
    page: 1,
    limit: 10,
    search: "",
    pageMax: 50,
    rowAddressScope: "visible",
    ...patch,
  };
}

function tableWith(
  declared: DeclaredTableActions<Row>,
  options: {
    selected?: readonly string[];
    onApprove?: (subject: ApprovalSubject) => Promise<boolean>;
    approval?: AgentObservation["approval"];
  } = {}
) {
  let selected = options.selected;
  const session = createAgentSession({
    observe: () => observation({ approval: options.approval ?? "never" }),
    apply: {},
    ...(options.onApprove ? { onApprove: options.onApprove } : {}),
    capabilities: tableActionCapabilities(declared, {
      actions: () => declared,
      rowFor: (rowKey) => ROWS.find((row) => row.id === rowKey),
      selectedIds: () => selected,
    }),
  });
  return {
    session,
    select: (ids: readonly string[]) => {
      selected = ids;
    },
  };
}

const run = (
  session: ReturnType<typeof createAgentSession>,
  key: string,
  args: unknown
) => session.execute(key, args, session.manifest().viewRevision, `k-${key}`);

describe("row and bulk actions as agent capabilities", () => {
  it("lists each host action under its own key, and none of the built-ins", () => {
    const open = vi.fn();
    const { session } = tableWith({
      row: [
        { key: "open", label: "Open", onClick: open },
        { key: "adapttable:delete-row", label: "Delete row", onClick: vi.fn() },
        { key: "secret", label: "Secret", onClick: vi.fn(), ai: false },
      ],
      bulk: [{ key: "archive", label: "Archive", onClick: vi.fn() }],
    });

    const keys = session.catalog().map((entry) => entry.key);
    expect(keys).toContain("rowAction.open");
    expect(keys).toContain("bulkAction.archive");
    expect(keys).not.toContain("rowAction.secret");
    expect(keys.some((key) => key.includes("delete-row"))).toBe(false);
  });

  it("runs the host's own handler with the row", async () => {
    const open = vi.fn();
    const { session } = tableWith({
      row: [{ key: "open", label: "Open", onClick: open }],
      bulk: [],
    });

    const result = await run(session, "rowAction.open", { rowKey: "r1" });

    expect(result.ok).toBe(true);
    expect(open).toHaveBeenCalledExactlyOnceWith(ROWS[0]);
  });

  it("refuses a row the action is disabled for, without running it", async () => {
    const lock = vi.fn();
    const action: RowAction<Row> = {
      key: "edit",
      label: "Edit",
      onClick: lock,
      disabledReason: (row) => (row.locked ? "This row is locked." : undefined),
    };
    const { session } = tableWith({ row: [action], bulk: [] });

    const result = await run(session, "rowAction.edit", { rowKey: "r2" });

    expect(result.ok).toBe(false);
    expect(lock).not.toHaveBeenCalled();
  });

  it("asks a person before an action with a confirmation", async () => {
    const remove = vi.fn();
    const onApprove = vi.fn(() => Promise.resolve(false));
    const { session } = tableWith(
      {
        row: [
          {
            key: "remove",
            label: "Remove",
            onClick: remove,
            confirm: {
              title: "Remove",
              message: () => "Remove it?",
              confirmLabel: "Remove",
              danger: true,
            },
          },
        ],
        bulk: [],
      },
      { onApprove }
    );

    const result = await run(session, "rowAction.remove", { rowKey: "r1" });

    expect(onApprove).toHaveBeenCalledTimes(1);
    expect(remove).not.toHaveBeenCalled();
    expect(result.ok).toBe(false);
  });

  it("honours an action's own automatic policy on a table that asks", async () => {
    const open = vi.fn();
    const onApprove = vi.fn(() => Promise.resolve(true));
    const { session } = tableWith(
      {
        row: [
          {
            key: "open",
            label: "Open",
            onClick: open,
            ai: { approval: { policy: "automatic" } },
          },
        ],
        bulk: [],
      },
      { onApprove, approval: "writes" }
    );

    await run(session, "rowAction.open", { rowKey: "r1" });

    expect(onApprove).not.toHaveBeenCalled();
    expect(open).toHaveBeenCalledTimes(1);
  });

  it("runs a bulk action on the selection it was told about", async () => {
    const archive = vi.fn();
    const bulk: BulkAction = {
      key: "archive",
      label: "Archive",
      onClick: archive,
    };
    const { session } = tableWith(
      { row: [], bulk: [bulk] },
      { selected: ["r1", "r2"] }
    );

    const result = await run(session, "bulkAction.archive", {
      rowKeys: ["r2", "r1"],
    });

    expect(result.ok).toBe(true);
    expect(archive).toHaveBeenCalledWith(["r1", "r2"], {
      allMatching: false,
      total: 2,
    });
  });

  it("refuses a selection that changed since it was read", async () => {
    const archive = vi.fn();
    const { session, select } = tableWith(
      {
        row: [],
        bulk: [{ key: "archive", label: "Archive", onClick: archive }],
      },
      { selected: ["r1"] }
    );
    select(["r1", "r2"]);

    const result = await run(session, "bulkAction.archive", {
      rowKeys: ["r1"],
    });

    expect(result.ok).toBe(false);
    expect(archive).not.toHaveBeenCalled();
  });

  it("changes its signature with the actions, not with their handlers", () => {
    const one = tableActionSignature({
      row: [{ key: "open", label: "Open", onClick: vi.fn() }],
      bulk: [],
    });
    const sameShape = tableActionSignature({
      row: [{ key: "open", label: "Open", onClick: vi.fn() }],
      bulk: [],
    });
    const renamed = tableActionSignature({
      row: [{ key: "open", label: "View", onClick: vi.fn() }],
      bulk: [],
    });

    expect(sameShape).toBe(one);
    expect(renamed).not.toBe(one);
  });
});
