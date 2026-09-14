/**
 * What each built-in capability actually changed, read off what it returned.
 *
 * A receipt's status says whether an action landed; this says what it landed
 * ON, so a card reads "Filter applied — Team is Platform" rather than "done"
 * three times in a row. Two rules keep it honest:
 *
 * - It is built from the session's own answer, never from the model's reply.
 *   The view setters report the sort, query, filter bag and grouping that
 *   actually landed after normalization, which is not always what the call
 *   asked for — three filter argument shapes reduce to one bag — and the
 *   reader is owed the one the table is holding.
 * - It carries no sentences. Column labels and formatted values go out
 *   structurally and the surface joins them with a word in the reader's
 *   language, because "is" and "set to" are not this package's to write.
 */
import type {
  AssistantReceiptSubject,
  AssistantReceiptTerm,
} from "./assistantReceipts";
import type { AgentColumn, ExecuteResult } from "./types";

/** A column's label, falling back to the id a host never labelled. */
function labelOf(columns: readonly AgentColumn[], id: string): string {
  return columns.find((column) => column.id === id)?.label ?? id;
}

/**
 * A filter value as something a reader recognises.
 *
 * Primitives and lists of them cover a host's filter bag; anything else is a
 * shape only that host understands, and a term with no value shows the column
 * alone rather than `[object Object]`.
 */
function readable(value: unknown): string | undefined {
  if (typeof value === "string") return value === "" ? undefined : value;
  if (typeof value === "number")
    return Number.isFinite(value) ? String(value) : undefined;
  if (typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    const parts = value
      .map(readable)
      .filter((part): part is string => Boolean(part));
    return parts.length > 0 ? parts.join(", ") : undefined;
  }
  return undefined;
}

function termsFromBag(
  bag: Record<string, unknown>,
  columns: readonly AgentColumn[]
): readonly AssistantReceiptTerm[] {
  return Object.entries(bag).map(([id, value]) => {
    const readableValue = readable(value);
    return readableValue === undefined
      ? { column: labelOf(columns, id) }
      : { column: labelOf(columns, id), value: readableValue };
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function filterSubject(
  payload: Record<string, unknown>,
  columns: readonly AgentColumn[]
): AssistantReceiptSubject {
  const bag = isRecord(payload.filters) ? payload.filters : {};
  const terms = termsFromBag(bag, columns);
  if (terms.length === 0) return { kind: "filter", cleared: true };
  return { kind: "filter", terms };
}

function sortSubject(
  payload: Record<string, unknown>,
  columns: readonly AgentColumn[]
): AssistantReceiptSubject {
  const sort = payload.sort;
  if (!isRecord(sort) || typeof sort.key !== "string") {
    return { kind: "sort", cleared: true };
  }
  return {
    kind: "sort",
    terms: [{ column: labelOf(columns, sort.key) }],
    direction: sort.dir === "desc" ? "desc" : "asc",
  };
}

function searchSubject(
  payload: Record<string, unknown>
): AssistantReceiptSubject {
  const query = typeof payload.query === "string" ? payload.query : "";
  if (query === "") return { kind: "search", cleared: true };
  return { kind: "search", terms: [{ value: query }] };
}

function groupSubject(
  payload: Record<string, unknown>,
  columns: readonly AgentColumn[]
): AssistantReceiptSubject {
  const groupBy = payload.groupBy;
  if (typeof groupBy !== "string" || groupBy === "") {
    return { kind: "group", cleared: true };
  }
  return { kind: "group", terms: [{ column: labelOf(columns, groupBy) }] };
}

function pinSubject(
  args: Record<string, unknown>,
  columns: readonly AgentColumn[]
): AssistantReceiptSubject {
  const key = typeof args.key === "string" ? args.key : undefined;
  if (key === undefined) return { kind: "pin" };
  const side = args.side;
  // A null side unpins, which is the opposite change and reads as one.
  if (side === null) {
    return {
      kind: "pin",
      cleared: true,
      terms: [{ column: labelOf(columns, key) }],
    };
  }
  return { kind: "pin", terms: [{ column: labelOf(columns, key) }] };
}

/**
 * The cells an edit put a value in.
 *
 * Taken from the arguments because the write result reports row keys and
 * outcomes rather than values. The row key stays out of it: a key is
 * plumbing, and the column and the value are what the reader recognises.
 */
function editSubject(
  args: Record<string, unknown>,
  columns: readonly AgentColumn[]
): AssistantReceiptSubject {
  const edits = Array.isArray(args.edits) ? args.edits : [];
  const terms = edits
    .filter(isRecord)
    .filter(
      (edit): edit is Record<string, unknown> => typeof edit.column === "string"
    )
    .map((edit) => {
      const column = labelOf(columns, edit.column as string);
      const value = readable(edit.value);
      return value === undefined ? { column } : { column, value };
    });
  return terms.length > 0 ? { kind: "edit", terms } : { kind: "edit" };
}

/** Every built-in key, as the kind a card is drawn from. */
const KIND_FOR: Readonly<Record<string, string>> = {
  "view.setFilters": "filter",
  "view.setSort": "sort",
  "view.setSearch": "search",
  "view.setGroupBy": "group",
  "view.setPage": "page",
  "view.setAggregations": "aggregate",
  "view.setSelection": "select",
  "view.pinColumn": "pin",
  "view.pinRow": "pin",
  "view.describe": "read",
  "columns.describe": "read",
  "rows.read": "read",
  "rows.resolve": "read",
  "export.run": "export",
  "edit.cells": "edit",
  "rows.add": "add",
  "rows.delete": "delete",
  "rows.reorder": "reorder",
};

/** The kind alone, for an action whose landed detail is not available. */
function kindOnly(key: string): AssistantReceiptSubject | undefined {
  const kind = KIND_FOR[key];
  return kind === undefined ? undefined : { kind };
}

/**
 * Describe one action for its receipt.
 *
 * An action that did not run is described by its kind alone. A refused
 * `view.setSort` returns no sort, and reading that absence as "the sort was
 * cleared" would tell the reader the table moved when it did not.
 *
 * @param key - The capability that ran.
 * @param args - The arguments it ran with.
 * @param result - What the session returned for it.
 * @param columns - The table's columns, for their labels.
 * @returns What to show on the card, or `undefined` for a capability this
 * package has nothing truthful to add about — a host capability, whose own
 * runner is the only thing that knows what it did.
 *
 * @public
 */
export function subjectFor(
  key: string,
  args: unknown,
  result: ExecuteResult,
  columns: readonly AgentColumn[] = []
): AssistantReceiptSubject | undefined {
  if (!result.ok) return kindOnly(key);
  const body = isRecord(args) ? args : {};
  const payload = isRecord(result.result) ? result.result : {};
  switch (key) {
    case "view.setFilters":
      return filterSubject(payload, columns);
    case "view.setSort":
      return sortSubject(payload, columns);
    case "view.setSearch":
      return searchSubject(payload);
    case "view.setGroupBy":
      return groupSubject(payload, columns);
    case "view.pinColumn":
      return pinSubject(body, columns);
    case "edit.cells":
      return editSubject(body, columns);
    default:
      return kindOnly(key);
  }
}
