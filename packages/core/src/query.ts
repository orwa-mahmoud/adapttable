/**
 * The query model, without React — `@adapttable/core/query`.
 *
 * Everything the table puts in a URL has to be read back somewhere, and that
 * somewhere is not always a browser. A shared link arrives at a Next.js route
 * handler, a Remix loader, an Express endpoint — processes that have no DOM,
 * often no React, and no business loading a table engine to decode a query
 * string.
 *
 * So the parts of the model that are pure — the AND/OR filter-tree encoding,
 * the pivot encoding, the formula-column encoding, and the types that describe
 * them — are exported here as well, from an entry that imports nothing. No
 * hooks, no components, no `"use client"` boundary: this file is the one place
 * in the package a backend can import and stay a backend.
 *
 * Every name here is also exported from `@adapttable/core`,
 * `@adapttable/core/pivot` or `@adapttable/core/formula`, from the same source
 * module. This entry is a narrower door onto the same room, not a second copy
 * of it — the encoding a server reads is byte-for-byte the encoding the table
 * wrote.
 *
 * Reading a formula column here yields its TEXT. Nothing in this entry parses
 * or evaluates one, which is what makes it safe to decode a link somebody else
 * sent.
 *
 * ```ts
 * import { parseFilterTree, isFilterGroup } from "@adapttable/core/query";
 *
 * const tree = parseFilterTree(new URL(request.url).searchParams.get("ft"));
 * ```
 *
 * For a parser that also validates against an allowlist of columns, use
 * `@adapttable/server` — it is built on this entry.
 *
 * @packageDocumentation
 */
export type { AggregateName, Aggregator } from "./aggregate/aggregate";
export {
  FILTER_TREE_PARAM,
  FILTER_TREE_VERSION,
  isActiveFilterTree,
  parseFilterTree,
  serializeFilterTree,
} from "./filters/filterTreeCodec";
export type { FormulaValue } from "./formula/evaluate";
export type { FormulaColumnSpec } from "./formula/formulaColumn";
export {
  deserializeFormulaColumns,
  serializeFormulaColumns,
} from "./formula/formulaUrlCodec";
export type { PivotConfig, PivotMeasure } from "./pivot/pivotModel";
export {
  deserializePivot,
  deserializePivotState,
  type PivotUrlState,
  serializePivot,
  serializePivotState,
} from "./pivot/pivotUrlCodec";
export type { SortLevel } from "./sort/compare";
export {
  isFilterGroup,
  type QueryCondition,
  type QueryFilterGroup,
} from "./source/queryContract";
export type { SortDirection } from "./types";

/**
 * The member types the signatures above hand back.
 *
 * A subpath that exports `ColumnDef` but not `ColumnHeaderContext` hands
 * a consumer a type whose parts they cannot name. These are already
 * public on `@adapttable/core`; this is the same declaration, reachable
 * from the entry that returns it.
 */
export type { FormulaErrorCode } from "./formula/evaluate";
export type { SortableValue } from "./types";

/**
 * The member types the signatures above hand back.
 *
 * A subpath that exports `ColumnDef` but not `ColumnHeaderContext` hands
 * a consumer a type whose parts they cannot name. These are already
 * public on `@adapttable/core`; this is the same declaration, reachable
 * from the entry that returns it.
 */
