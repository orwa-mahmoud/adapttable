/**
 * The grouped or tree-shaped view, as an export can write it.
 *
 * Scopes still decide which *data* rows leave the table. This layer then
 * puts those rows back into the structure the reader can see — group
 * headers, outline depth, footers — so a spreadsheet is not a denormalised
 * dump of a grouped table.
 */
import type { GroupedFlatEntry } from "../grouping/groupRows";
import type { TreeEntry } from "../tree/treeRows";
import type { ExportViewEntry } from "./exportWriter";

/**
 * A value a file can carry. JSX is a cell on screen, not a cell in a
 * spreadsheet — skip it rather than write "[object Object]".
 */
export function exportableValue(value: unknown): unknown {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? undefined : value;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }
  if (typeof value === "boolean" || typeof value === "string") return value;
  return undefined;
}

/** Drop anything a file cannot type, keeping the keys that remain. */
export function exportableRecord(
  cells: Readonly<Partial<Record<string, unknown>>> | undefined
): Partial<Record<string, unknown>> | undefined {
  if (!cells) return undefined;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(cells)) {
    const next = exportableValue(value);
    if (next !== undefined) out[key] = next;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

/** Whether the next visible child of this group is a nested group. */
function nextIsNestedGroup<TRow>(
  entries: readonly GroupedFlatEntry<TRow>[],
  index: number,
  level: number
): boolean {
  for (let j = index + 1; j < entries.length; j++) {
    const next = entries[j];
    if (!next) return false;
    if (next.kind === "group") return next.level > level;
    if (next.kind === "groupFooter") return false;
  }
  return false;
}

/** Rows, "load more", and extras hidden because their leaves were dumped. */
function skipHiddenLeaf<TRow>(
  entry: GroupedFlatEntry<TRow>,
  skipUntilLevel: number | undefined
): boolean {
  if (skipUntilLevel === undefined) return false;
  if (entry.kind === "group" || entry.kind === "groupFooter") {
    return entry.level > skipUntilLevel;
  }
  return true;
}

function appendLeaves<TRow>(
  out: ExportViewEntry<TRow>[],
  rows: readonly TRow[],
  level: number
): void {
  for (const row of rows) {
    out.push({ role: "data", row, level });
  }
}

/** The header row a group contributes, with whatever totals it carries. */
function groupHeaderEntry<TRow>(
  entry: Extract<GroupedFlatEntry<TRow>, { kind: "group" }>
): ExportViewEntry<TRow> {
  return {
    role: "group",
    label: entry.label,
    level: entry.level,
    labelKey: entry.groupBy,
    values: exportableRecord(entry.aggregateCells),
  };
}

/** The total row a group footer contributes. */
function groupFooterEntry<TRow>(
  entry: Extract<GroupedFlatEntry<TRow>, { kind: "groupFooter" }>,
  groupTotal?: (label: string) => string
): ExportViewEntry<TRow> {
  return {
    role: "aggregate",
    label: groupTotal ? groupTotal(entry.label) : entry.label,
    level: entry.level,
    labelKey: entry.groupBy,
    values: exportableRecord(entry.aggregateCells),
  };
}

/**
 * Flatten grouping entries into export view rows.
 *
 * Headers and footers keep their outline level. Leaves sit one level
 * deeper than the group they belong to, which is what Excel's outline
 * expects. "Load more" and extra rows are render chrome and stay out.
 *
 * @typeParam TRow - The row type.
 * @param entries - The grouping model's flat list.
 * @param groupTotal - Optional caption for a footer (`"Core total"`).
 * @param includeHiddenLeaves - When true, a collapsed or paged group
 *   contributes every leaf it holds, not only the ones on screen.
 *
 * @internal
 */
export function viewFromGroupedEntries<TRow>(
  entries: readonly GroupedFlatEntry<TRow>[],
  groupTotal?: (label: string) => string,
  includeHiddenLeaves = false
): ExportViewEntry<TRow>[] {
  const out: ExportViewEntry<TRow>[] = [];
  let dataLevel = 1;
  let skipUntilLevel: number | undefined;
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    if (!entry || skipHiddenLeaf(entry, skipUntilLevel)) continue;
    if (entry.kind === "group" || entry.kind === "groupFooter") {
      skipUntilLevel = undefined;
    }
    if (entry.kind === "group") {
      dataLevel = entry.level + 1;
      out.push(groupHeaderEntry(entry));
      if (includeHiddenLeaves && !nextIsNestedGroup(entries, i, entry.level)) {
        appendLeaves(out, entry.leafRows, dataLevel);
        skipUntilLevel = entry.level;
      }
      continue;
    }
    if (entry.kind === "groupFooter") {
      out.push(groupFooterEntry(entry, groupTotal));
      continue;
    }
    if (entry.kind === "row") {
      out.push({ role: "data", row: entry.row, level: dataLevel });
    }
  }
  return out;
}

/**
 * A tree is already a list of data rows with a depth. The outline is that
 * depth; there are no extra header rows to invent.
 *
 * @typeParam TRow - The row type.
 * @param entries - The flattened tree, in render order.
 *
 * @internal
 */
export function viewFromTreeEntries<TRow>(
  entries: readonly TreeEntry<TRow>[]
): ExportViewEntry<TRow>[] {
  return entries.map((entry) => ({
    role: "data" as const,
    row: entry.row,
    level: entry.level,
  }));
}

function isStructure(entry: ExportViewEntry<unknown>): boolean {
  return entry.role === "group" || entry.role === "aggregate";
}

/** A group stays if any later leaf before the next peer is kept. */
function markKeptGroups(
  view: readonly ExportViewEntry<unknown>[],
  keep: boolean[]
): void {
  for (let i = 0; i < view.length; i++) {
    const entry = view[i];
    if (entry?.role !== "group") continue;
    for (let j = i + 1; j < view.length; j++) {
      const next = view[j];
      if (!next || (isStructure(next) && next.level <= entry.level)) break;
      if (keep[j]) {
        keep[i] = true;
        break;
      }
    }
  }
}

/** Index of the group this footer closes, or -1. */
function footerGroupIndex(
  view: readonly ExportViewEntry<unknown>[],
  footerAt: number,
  level: number
): number {
  for (let j = footerAt - 1; j >= 0; j--) {
    const prev = view[j];
    if (!prev) return -1;
    if (prev.role === "group" && prev.level === level) return j;
    if (isStructure(prev) && prev.level < level) return -1;
  }
  return -1;
}

/** A footer stays with the group it closes. */
function markKeptFooters(
  view: readonly ExportViewEntry<unknown>[],
  keep: boolean[]
): void {
  for (let i = 0; i < view.length; i++) {
    const entry = view[i];
    if (entry?.role !== "aggregate") continue;
    const groupAt = footerGroupIndex(view, i, entry.level);
    if (groupAt >= 0) keep[i] = Boolean(keep[groupAt]);
  }
}

/**
 * Keep the structure that still has a reason to exist after a scope
 * dropped some leaves: a group header stays if any of its remaining
 * descendants stayed; a footer stays with its header.
 *
 * @typeParam TRow - The row type.
 * @param view - The full grouped or tree view.
 * @param scopedIds - Row ids the scope resolved to.
 * @param getRowId - How a row's id is derived.
 *
 * @internal
 */
export function filterExportView<TRow>(
  view: readonly ExportViewEntry<TRow>[],
  scopedIds: ReadonlySet<string>,
  getRowId: (row: TRow) => string
): ExportViewEntry<TRow>[] {
  const keep = view.map(
    (entry) => entry.role === "data" && scopedIds.has(getRowId(entry.row))
  );
  markKeptGroups(view, keep);
  markKeptFooters(view, keep);
  return view.filter((_, index) => keep[index]);
}

/**
 * Pick the view the current chrome is showing. A tree outranks grouping —
 * the same rule the table uses when both are armed.
 *
 * @typeParam TRow - The row type.
 *
 * @internal
 */
export function exportViewFromChrome<TRow>(options: {
  grouping?: { entries: readonly GroupedFlatEntry<TRow>[] };
  tree?: {
    entries: readonly TreeEntry<TRow>[];
    allEntries?: readonly TreeEntry<TRow>[];
  };
  groupTotal?: (label: string) => string;
  /** Folded or paged-away leaves, for `scope: "all"` / `"selected"`. */
  includeHiddenLeaves?: boolean;
}): ExportViewEntry<TRow>[] | undefined {
  if (options.tree) {
    // A scope that unfolds reads the whole hierarchy; the rendered entries
    // stop at every collapsed node and would drop those subtrees entirely.
    const entries =
      options.includeHiddenLeaves && options.tree.allEntries
        ? options.tree.allEntries
        : options.tree.entries;
    return viewFromTreeEntries(entries);
  }
  if (options.grouping) {
    return viewFromGroupedEntries(
      options.grouping.entries,
      options.groupTotal,
      options.includeHiddenLeaves
    );
  }
  return undefined;
}

/**
 * `summaryRow` as file values — JSX cells drop out.
 *
 * @internal
 */
export function summaryExportValues(
  cells: Readonly<Partial<Record<string, unknown>>> | undefined
): Partial<Record<string, unknown>> | undefined {
  return exportableRecord(cells);
}
