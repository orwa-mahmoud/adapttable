/**
 * A table's own row and bulk actions, offered to an agent as governed
 * capabilities.
 *
 * Each action the host composed becomes one capability, keyed
 * `rowAction.<key>` or `bulkAction.<key>`, with the action's label as its
 * summary. They are writes — `destructive` when the action's confirmation is
 * marked `danger` — so the session's write policy, commit mode and approval
 * all apply before the host's own handler runs. An action with a `confirm`
 * block asks a person unless its `ai.approval.policy` says otherwise, and
 * `ai: false` keeps an action away from the agent entirely.
 *
 * Execution is the host's `onClick`, exactly as a click would run it. The
 * table still never changes the data itself.
 */
import type {
  ActionAiOptions,
  BulkAction,
  BulkActionContext,
  RowAction,
} from "@adapttable/core";

import type { AgentCapabilityDefinition, AgentCapabilityKind } from "../types";

/**
 * The actions a table declares, as the binding last saw them.
 *
 * @public
 */
export interface DeclaredTableActions<TRow = unknown> {
  /** Per-row actions, as the host composed them. */
  readonly row: readonly RowAction<TRow>[];
  /** Bulk actions over the selection. */
  readonly bulk: readonly BulkAction[];
}

/**
 * The live table an action capability reads when it runs.
 *
 * Every accessor is called at plan and execute time, never at registration, so
 * a handler always runs against the table as it is now.
 *
 * @public
 */
export interface TableActionSource<TRow = unknown> {
  /** The actions the table declares right now. */
  readonly actions: () => DeclaredTableActions<TRow> | undefined;
  /** The row behind a row key, among the rows the table holds. */
  readonly rowFor: (rowKey: string) => TRow | undefined;
  /** The current selection, or `undefined` when the table has none. */
  readonly selectedIds: () => readonly string[] | undefined;
}

/** The capability key an action is offered under. */
function capabilityKeyOf(scope: "rowAction" | "bulkAction", key: string) {
  return `${scope}.${key.replaceAll(/[^A-Za-z0-9_-]/g, "_")}`;
}

/** Actions the agent may see: host-declared, and not opted out. */
/** An action the agent may be offered: never one marked `ai: false`. */
type Offered<T> = Omit<T, "ai"> & { readonly ai?: ActionAiOptions };

function offered<
  T extends { readonly key: string; readonly ai?: ActionAiOptions | false },
>(actions: readonly T[]): Offered<T>[] {
  // `adapttable:` keys are the table's own controls (add, duplicate, delete,
  // pin), which carry their own capabilities.
  return actions.filter(
    (action): action is T & Offered<T> =>
      action.ai !== false && !action.key.startsWith("adapttable:")
  );
}

function kindOf(
  confirm: { readonly danger?: boolean } | undefined
): AgentCapabilityKind {
  return confirm?.danger === true ? "destructive" : "write";
}

/**
 * The action's own approval word, with a confirmation meaning "ask a person"
 * unless the action says otherwise.
 */
function approvalOf(
  own: ActionAiOptions | undefined,
  confirm: unknown
): ActionAiOptions | undefined {
  if (!confirm || own?.approval?.policy !== undefined) return own;
  return { ...own, approval: { ...own?.approval, policy: "required" } };
}

const ROW_INPUT = {
  type: "object",
  additionalProperties: false,
  properties: {
    rowKey: {
      type: "string",
      description: "The row to run the action on, as rows.read reports it.",
    },
  },
  required: ["rowKey"],
} as const;

const BULK_INPUT = {
  type: "object",
  additionalProperties: false,
  properties: {
    rowKeys: {
      type: "array",
      items: { type: "string" },
      description:
        "The current selection, exactly — the keys passed to view.setSelection. A selection that has changed is refused.",
    },
  },
  required: ["rowKeys"],
} as const;

const RAN_OUTPUT = {
  type: "object",
  additionalProperties: false,
  properties: { ran: { type: "boolean" } },
  required: ["ran"],
} as const;

function rowKeyOf(args: unknown): string {
  const key = (args as { rowKey?: unknown } | undefined)?.rowKey;
  if (typeof key !== "string" || key === "") {
    throw new Error("rowKey is required");
  }
  return key;
}

function rowKeysOf(args: unknown): readonly string[] {
  const keys: unknown = (args as { rowKeys?: unknown } | undefined)?.rowKeys;
  if (
    !Array.isArray(keys) ||
    !keys.every((key): key is string => typeof key === "string")
  ) {
    throw new Error("rowKeys must list the selected row keys");
  }
  return keys;
}

function rowCapability<TRow>(
  declared: Offered<RowAction<TRow>>,
  source: TableActionSource<TRow>
): AgentCapabilityDefinition {
  const live = (): RowAction<TRow> | undefined =>
    source.actions()?.row.find((action) => action.key === declared.key);
  /** The row and the action, or why the action cannot run on it. */
  const target = (args: unknown): { row: TRow; action: RowAction<TRow> } => {
    const action = live();
    if (!action || action.ai === false) {
      throw new Error(`the "${declared.label}" action is no longer offered`);
    }
    const rowKey = rowKeyOf(args);
    const row = source.rowFor(rowKey);
    if (row === undefined) {
      throw new Error(`no row "${rowKey}" is on the table`);
    }
    if (action.isHidden?.(row) === true) {
      throw new Error(`"${action.label}" does not apply to row "${rowKey}"`);
    }
    const reason = action.disabledReason?.(row);
    if (reason) throw new Error(reason);
    if (action.isDisabled?.(row) === true) {
      throw new Error(`"${action.label}" is disabled for row "${rowKey}"`);
    }
    if (!action.onClick) {
      throw new Error(`"${action.label}" has nothing to run`);
    }
    return { row, action };
  };
  const ai = approvalOf(declared.ai, declared.confirm);
  return {
    key: capabilityKeyOf("rowAction", declared.key),
    summary: `Run the "${declared.label}" row action on one row.`,
    kind: kindOf(declared.confirm),
    guide: {
      guide: `Runs the table's "${declared.label}" action on one row, exactly as clicking it would. The host decides what the action does; nothing else changes. Refused when the action is hidden or disabled for that row.`,
      input: ROW_INPUT,
      output: RAN_OUTPUT,
    },
    ...(ai ? { ai } : {}),
    isEnabled: () => {
      const action = live();
      return action !== undefined && action.ai !== false && !!action.onClick;
    },
    plan: (_context, args) => {
      const rowKey = rowKeyOf(args);
      target(args);
      return { proposals: [{ rowKey, column: declared.label }] };
    },
    execute: (_context, args) => {
      const { row, action } = target(args);
      action.onClick?.(row);
      return { ran: true };
    },
  };
}

function bulkCapability<TRow>(
  declared: Offered<BulkAction>,
  source: TableActionSource<TRow>
): AgentCapabilityDefinition {
  const live = (): BulkAction | undefined =>
    source.actions()?.bulk.find((action) => action.key === declared.key);
  /** The selection and the action, or why the action cannot run now. */
  const target = (args: unknown): { ids: string[]; action: BulkAction } => {
    const action = live();
    if (!action || action.ai === false) {
      throw new Error(`the "${declared.label}" action is no longer offered`);
    }
    const asked = rowKeysOf(args);
    const selected = source.selectedIds() ?? [];
    const same =
      asked.length === selected.length &&
      asked.every((key) => selected.includes(key));
    if (!same) {
      throw new Error(
        "the selection has changed since it was read; read it again before running the action"
      );
    }
    if (selected.length === 0) throw new Error("nothing is selected");
    const ids = [...selected];
    const reason = action.disabledReason?.(ids);
    if (reason) throw new Error(reason);
    return { ids, action };
  };
  const ai = approvalOf(declared.ai, declared.confirm);
  return {
    key: capabilityKeyOf("bulkAction", declared.key),
    summary: `Run the "${declared.label}" bulk action on the selected rows.`,
    kind: kindOf(declared.confirm),
    guide: {
      guide: `Runs the table's "${declared.label}" bulk action on the current selection: the host's own handler receives the selected row keys. Select the rows with view.setSelection first and pass the same keys; a selection that has changed since is refused.`,
      input: BULK_INPUT,
      output: RAN_OUTPUT,
    },
    ...(ai ? { ai } : {}),
    isEnabled: () => {
      const action = live();
      return action !== undefined && action.ai !== false;
    },
    plan: (_context, args) => {
      const { ids } = target(args);
      return {
        proposals: ids.map((rowKey) => ({ rowKey, column: declared.label })),
      };
    },
    execute: async (_context, args) => {
      const { ids, action } = target(args);
      const context: BulkActionContext = {
        allMatching: false,
        total: ids.length,
      };
      await action.onClick(ids, context);
      return { ran: true };
    },
  };
}

/**
 * One governed capability per row action and bulk action a table declares.
 *
 * Pass the result to `createAgentSession({ capabilities })`. The definitions
 * read `source` whenever they run, so the table they act on is the live one;
 * rebuild them when {@link tableActionSignature} changes, because the set of
 * capabilities is fixed when a session is built.
 *
 * @public
 */
export function tableActionCapabilities<TRow>(
  declared: DeclaredTableActions<TRow> | undefined,
  source: TableActionSource<TRow>
): AgentCapabilityDefinition[] {
  if (!declared) return [];
  const seen = new Set<string>();
  const once = (definition: AgentCapabilityDefinition) => {
    if (seen.has(definition.key)) return false;
    seen.add(definition.key);
    return true;
  };
  return [
    ...offered(declared.row)
      .map((action) => rowCapability(action, source))
      .filter(once),
    ...offered(declared.bulk)
      .map((action) => bulkCapability(action, source))
      .filter(once),
  ];
}

/**
 * What about a table's actions changes the capabilities offered — keys,
 * labels, confirmation and approval, never handler identity.
 *
 * @public
 */
export function tableActionSignature(
  declared: DeclaredTableActions | undefined
): string {
  if (!declared) return "";
  const describe = (action: {
    readonly key: string;
    readonly label: string;
    readonly confirm?: { readonly danger?: boolean };
    readonly ai?: ActionAiOptions | false;
  }) => ({
    key: action.key,
    label: action.label,
    confirm: action.confirm ? action.confirm.danger === true : null,
    ai: action.ai ?? null,
  });
  return JSON.stringify({
    row: offered(declared.row).map(describe),
    bulk: offered(declared.bulk).map(describe),
  });
}
