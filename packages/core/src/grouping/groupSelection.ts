import type { HeaderSelectionState } from "../selection/useSelection";

/**
 * Tri-state for a group checkbox over its leaf row ids — same enum as the
 * table header selection state. Leaf ids only; never synthetic group keys.
 *
 * @internal
 */
export function groupSelectionState(
  leafIds: readonly string[],
  selectedIds: ReadonlySet<string>
): HeaderSelectionState {
  if (leafIds.length === 0) return "none";
  let selected = 0;
  for (const id of leafIds) {
    if (selectedIds.has(id)) selected += 1;
  }
  if (selected === 0) return "none";
  if (selected === leafIds.length) return "all";
  return "some";
}

/**
 * Toggle every leaf in the group: if any leaf is unselected, select all;
 * otherwise deselect all (matches typical "select group" checkbox UX).
 */
export function nextGroupSelection(
  leafIds: readonly string[],
  selectedIds: ReadonlySet<string>
): { action: "select" | "deselect"; ids: readonly string[] } {
  const state = groupSelectionState(leafIds, selectedIds);
  if (state === "all") return { action: "deselect", ids: leafIds };
  return { action: "select", ids: leafIds };
}

/**
 * Apply a group checkbox toggle in one pass — returns the next selected-id
 * set (adapters / {@link useSelection.toggleGroupLeaves} commit this).
 */
export function applyGroupLeafSelection(
  leafIds: readonly string[],
  selectedIds: ReadonlySet<string>
): Set<string> {
  const { action, ids } = nextGroupSelection(leafIds, selectedIds);
  const next = new Set(selectedIds);
  for (const id of ids) {
    if (action === "select") next.add(id);
    else next.delete(id);
  }
  return next;
}
