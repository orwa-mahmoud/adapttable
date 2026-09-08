import { describe, expect, it, vi } from "vitest";

import type { RowEditingState } from "./rowEditing";
import { resolveRowEditTrigger } from "./rowEditTrigger";

interface Row {
  readonly id: string;
}

const ROW: Row = { id: "a" };

const PENCIL = {
  key: "edit",
  label: "Edit",
  editsRow: true,
} as const;

const TRASH = {
  key: "delete",
  label: "Delete",
  onClick: () => undefined,
} as const;

/** A row-editing state that records what the trigger asked it to do. */
function armed(openRowId?: string) {
  const begin = vi.fn();
  const state = {
    activeRowId: openRowId ?? null,
    isEditing: (rowId: string) => rowId === openRowId,
    drafts: {},
    draftFor: () => "",
    begin,
    setDraft: () => undefined,
    save: () => undefined,
    cancel: () => undefined,
    isDirty: false,
    signature: "",
    openedRow: () => undefined,
    keepLive: () => undefined,
    takeLive: () => undefined,
  } satisfies RowEditingState<Row>;
  return { state, begin };
}

describe("resolveRowEditTrigger", () => {
  it("leaves a list with no row-edit trigger alone", () => {
    const actions = [TRASH];
    const resolved = resolveRowEditTrigger(actions, undefined, ROW, "a");
    expect(resolved.actions).toBe(actions);
    expect(resolved.showBegin).toBe(true);
  });

  it("treats a missing list as an empty one", () => {
    const resolved = resolveRowEditTrigger(undefined, undefined, ROW, "a");
    expect(resolved.actions).toEqual([]);
    expect(resolved.showBegin).toBe(true);
  });

  it("drops the trigger on a table with no row form to open", () => {
    const resolved = resolveRowEditTrigger(
      [PENCIL, TRASH],
      undefined,
      ROW,
      "a"
    );
    expect(resolved.actions.map((action) => action.key)).toEqual(["delete"]);
    // Nothing claimed the built-in control, so it keeps drawing itself.
    expect(resolved.showBegin).toBe(true);
  });

  it("opens this row's form, and stands the built-in control down", () => {
    const { state, begin } = armed();
    const resolved = resolveRowEditTrigger([PENCIL, TRASH], state, ROW, "a");
    expect(resolved.showBegin).toBe(false);
    expect(resolved.actions.map((action) => action.key)).toEqual([
      "edit",
      "delete",
    ]);
    resolved.actions[0]?.onClick?.(ROW);
    expect(begin).toHaveBeenCalledWith(ROW, "a");
  });

  it("steps aside while its own row is open", () => {
    const { state } = armed("a");
    const resolved = resolveRowEditTrigger([PENCIL, TRASH], state, ROW, "a");
    // The open row already shows save and cancel; a second way in would only
    // reopen what is open.
    expect(resolved.actions.map((action) => action.key)).toEqual(["delete"]);
    expect(resolved.showBegin).toBe(false);
  });

  it("keeps the trigger on every row but the open one", () => {
    const { state, begin } = armed("b");
    const resolved = resolveRowEditTrigger([PENCIL], state, ROW, "a");
    expect(resolved.actions).toHaveLength(1);
    resolved.actions[0]?.onClick?.(ROW);
    expect(begin).toHaveBeenCalledWith(ROW, "a");
  });

  it("leaves the trigger's own fields untouched", () => {
    const { state } = armed();
    const pencil = { ...PENCIL, color: "blue", isDisabled: () => true };
    const resolved = resolveRowEditTrigger([pencil], state, ROW, "a");
    expect(resolved.actions[0]?.color).toBe("blue");
    expect(resolved.actions[0]?.isDisabled?.(ROW)).toBe(true);
  });
});
