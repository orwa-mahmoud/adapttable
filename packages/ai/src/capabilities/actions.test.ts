import type { BulkAction, RowAction } from "@adapttable/core";
import { describe, expect, it, vi } from "vitest";

import { createAgentSession } from "../session";
import type {
  AgentCapabilityContext,
  AgentCapabilityDefinition,
  AgentObservation,
  ApprovalSubject,
} from "../types";
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
    approval?: NonNullable<AgentObservation["approval"]>;
    live?: () => DeclaredTableActions<Row> | undefined;
  } = {}
) {
  let selected = options.selected;
  const session = createAgentSession({
    observe: () => observation({ approval: options.approval ?? "never" }),
    apply: {},
    ...(options.onApprove ? { onApprove: options.onApprove } : {}),
    capabilities: tableActionCapabilities(declared, {
      actions: options.live ?? (() => declared),
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
  args: unknown,
  idempotencyKey = `k-${key}`
) =>
  session.execute(key, args, session.manifest().viewRevision, idempotencyKey);

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
    expect((result.result as { approval: string }).approval).toBe("rejected");
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

  it("asks a person before a plain action on a table whose policy is writes", async () => {
    const open = vi.fn();
    const onApprove = vi.fn(() => Promise.resolve(false));
    const { session } = tableWith(
      { row: [{ key: "open", label: "Open", onClick: open }], bulk: [] },
      { onApprove, approval: "writes" }
    );

    const result = await run(session, "rowAction.open", { rowKey: "r1" });

    expect(onApprove).toHaveBeenCalledTimes(1);
    expect(open).not.toHaveBeenCalled();
    expect((result.result as { approval: string }).approval).toBe("rejected");
  });

  it("runs a plain action without asking on a table whose policy is never", async () => {
    const open = vi.fn();
    const onApprove = vi.fn(() => Promise.resolve(false));
    const { session } = tableWith(
      { row: [{ key: "open", label: "Open", onClick: open }], bulk: [] },
      { onApprove, approval: "never" }
    );

    const result = await run(session, "rowAction.open", { rowKey: "r1" });

    expect(result.ok).toBe(true);
    expect(onApprove).not.toHaveBeenCalled();
    expect(open).toHaveBeenCalledExactlyOnceWith(ROWS[0]);
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

  it("refuses a missing row key, an unknown row, and a row the action hides or disables", async () => {
    const edit = vi.fn();
    const { session } = tableWith({
      row: [
        {
          key: "edit",
          label: "Edit",
          onClick: edit,
          isHidden: (row) => row.id === "r2",
        },
        {
          key: "rename",
          label: "Rename",
          onClick: edit,
          isDisabled: (row) => row.locked === true,
        },
      ],
      bulk: [],
    });

    const empty = await run(session, "rowAction.edit", { rowKey: "" }, "k-1");
    const unknown = await run(
      session,
      "rowAction.edit",
      { rowKey: "r9" },
      "k-2"
    );
    const hidden = await run(
      session,
      "rowAction.edit",
      { rowKey: "r2" },
      "k-3"
    );
    const disabled = await run(session, "rowAction.rename", { rowKey: "r2" });

    expect(empty.ok).toBe(false);
    expect(empty.error?.message).toContain("rowKey is required");
    expect(unknown.error?.message).toContain('no row "r9" is on the table');
    expect(hidden.error?.message).toContain(
      '"Edit" does not apply to row "r2"'
    );
    expect(disabled.error?.message).toContain(
      '"Rename" is disabled for row "r2"'
    );
    expect(edit).not.toHaveBeenCalled();
  });

  it("stops offering an action the table no longer declares", async () => {
    const open = vi.fn();
    let current: DeclaredTableActions<Row> | undefined = {
      row: [{ key: "open", label: "Open", onClick: open }],
      bulk: [],
    };
    const { session } = tableWith(current, { live: () => current });
    current = undefined;

    const result = await run(session, "rowAction.open", { rowKey: "r1" });

    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe("not-wired");
    expect(open).not.toHaveBeenCalled();
  });

  it("does not wire a row action with nothing to run", async () => {
    const { session } = tableWith({
      row: [{ key: "noop", label: "No-op" }],
      bulk: [],
    });

    const result = await run(session, "rowAction.noop", { rowKey: "r1" });

    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe("not-wired");
  });

  it("refuses a bulk action when the table has no selection", async () => {
    const archive = vi.fn();
    const { session } = tableWith({
      row: [],
      bulk: [{ key: "archive", label: "Archive", onClick: archive }],
    });

    const result = await run(session, "bulkAction.archive", { rowKeys: [] });

    expect(result.ok).toBe(false);
    expect(result.error?.message).toContain("nothing is selected");
    expect(archive).not.toHaveBeenCalled();
  });

  it("refuses a bulk action its own disabledReason rules out", async () => {
    const archive = vi.fn();
    const { session } = tableWith(
      {
        row: [],
        bulk: [
          {
            key: "archive",
            label: "Archive",
            onClick: archive,
            disabledReason: (ids) =>
              ids.includes("r2") ? "Grace is locked." : undefined,
          },
        ],
      },
      { selected: ["r1", "r2"] }
    );

    const result = await run(session, "bulkAction.archive", {
      rowKeys: ["r1", "r2"],
    });

    expect(result.ok).toBe(false);
    expect(result.error?.message).toContain("Grace is locked.");
    expect(archive).not.toHaveBeenCalled();
  });

  it("asks a person before a bulk action with a confirmation, and offers it as a write", async () => {
    const archive = vi.fn();
    const onApprove = vi.fn(() => Promise.resolve(false));
    const { session } = tableWith(
      {
        row: [],
        bulk: [
          {
            key: "archive",
            label: "Archive",
            onClick: archive,
            confirm: {
              title: "Archive",
              message: () => "Archive them?",
              confirmLabel: "Archive",
            },
          },
        ],
      },
      { selected: ["r1"], onApprove }
    );

    const entry = session
      .catalog()
      .find((item) => item.key === "bulkAction.archive");
    const result = await run(session, "bulkAction.archive", {
      rowKeys: ["r1"],
    });

    expect(entry?.kind).toBe("write");
    expect(onApprove).toHaveBeenCalledTimes(1);
    expect(archive).not.toHaveBeenCalled();
    expect((result.result as { approval: string }).approval).toBe("rejected");
  });

  it("offers nothing for a table without actions, and one capability per key", () => {
    const source = {
      actions: () => undefined,
      rowFor: () => undefined,
      selectedIds: () => undefined,
    };
    const definitions = tableActionCapabilities<Row>(
      {
        row: [
          { key: "mark done", label: "Mark done", onClick: vi.fn() },
          { key: "mark_done", label: "Mark done too", onClick: vi.fn() },
        ],
        bulk: [],
      },
      source
    );

    expect(tableActionCapabilities<Row>(undefined, source)).toEqual([]);
    expect(definitions.map((definition) => definition.key)).toEqual([
      "rowAction.mark_done",
    ]);
    expect(definitions[0]?.summary).toContain('"Mark done"');
  });

  it("changes its signature with confirmation, and is empty without actions", () => {
    const plain = tableActionSignature({
      row: [{ key: "remove", label: "Remove", onClick: vi.fn() }],
      bulk: [],
    });
    const confirmed = tableActionSignature({
      row: [
        {
          key: "remove",
          label: "Remove",
          onClick: vi.fn(),
          confirm: {
            title: "Remove",
            message: () => "Remove it?",
            confirmLabel: "Remove",
            danger: true,
          },
        },
      ],
      bulk: [],
    });

    expect(tableActionSignature(undefined)).toBe("");
    expect(confirmed).not.toBe(plain);
    expect(JSON.parse(confirmed)).toMatchObject({
      row: [{ key: "remove", confirm: true, ai: null }],
    });
  });
});

describe("an action capability run on its own", () => {
  const context = (): AgentCapabilityContext => ({
    observation: observation(),
    apply: {},
    observe: () => observation(),
    throwIfCancelled: () => undefined,
  });

  function definitionsOver(
    declared: DeclaredTableActions<Row>,
    live: () => DeclaredTableActions<Row> | undefined
  ): AgentCapabilityDefinition[] {
    return tableActionCapabilities(declared, {
      actions: live,
      rowFor: (rowKey) => ROWS.find((row) => row.id === rowKey),
      selectedIds: () => ["r1"],
    });
  }

  it("refuses to plan an action the table has since withdrawn or opted out", () => {
    const declared: DeclaredTableActions<Row> = {
      row: [{ key: "open", label: "Open", onClick: vi.fn() }],
      bulk: [{ key: "archive", label: "Archive", onClick: vi.fn() }],
    };
    const [row, bulk] = definitionsOver(declared, () => ({
      row: [{ key: "open", label: "Open", onClick: vi.fn(), ai: false }],
      bulk: [],
    }));

    expect(row?.isEnabled?.(observation())).toBe(false);
    expect(bulk?.isEnabled?.(observation())).toBe(false);
    expect(() => row?.plan?.(context(), { rowKey: "r1" })).toThrow(
      'the "Open" action is no longer offered'
    );
    expect(() => bulk?.plan?.(context(), { rowKeys: ["r1"] })).toThrow(
      'the "Archive" action is no longer offered'
    );
  });

  it("refuses arguments that do not name a row or a selection", () => {
    const declared: DeclaredTableActions<Row> = {
      row: [{ key: "open", label: "Open", onClick: vi.fn() }],
      bulk: [{ key: "archive", label: "Archive", onClick: vi.fn() }],
    };
    const [row, bulk] = definitionsOver(declared, () => declared);

    expect(() => row?.plan?.(context(), undefined)).toThrow(
      "rowKey is required"
    );
    expect(() => bulk?.plan?.(context(), { rowKeys: "r1" })).toThrow(
      "rowKeys must list the selected row keys"
    );
    expect(() => bulk?.plan?.(context(), { rowKeys: ["r1", 2] })).toThrow(
      "rowKeys must list the selected row keys"
    );
    expect(bulk?.plan?.(context(), { rowKeys: ["r1"] })).toEqual({
      proposals: [{ rowKey: "r1", column: "Archive" }],
    });
  });

  it("refuses to plan a row action whose handler has gone", () => {
    const declared: DeclaredTableActions<Row> = {
      row: [{ key: "open", label: "Open", onClick: vi.fn() }],
      bulk: [],
    };
    const [row] = definitionsOver(declared, () => ({
      row: [{ key: "open", label: "Open" }],
      bulk: [],
    }));

    expect(() => row?.plan?.(context(), { rowKey: "r1" })).toThrow(
      '"Open" has nothing to run'
    );
  });
});
