import { useState } from "react";

import type { TableSource } from "../source/TableSource";
import type { FilterValue, TableLabels } from "../types";
import { type FilterDef, filterLabel, RANGE_SUFFIXES } from "./filterDefs";
import {
  DATE_OP_LABEL_KEYS,
  DATE_OPS,
  filterOpKey,
  isBetweenFilterOp,
  isListFilterOp,
  isValuelessFilterOp,
  NUMBER_OP_LABEL_KEYS,
  NUMBER_OPS,
  parseTextOp,
  TEXT_OP_LABEL_KEYS,
  TEXT_OPS,
  type TextOp,
} from "./operators";
import { type RangeOp, readRangeWidget, writeRangeFilter } from "./rangeWidget";
import { isRelativeDateToken } from "./relativeDates";

/**
 * Operand shape for a selected range operator.
 *
 * @public
 */
export type RangeOpArity = "none" | "one" | "two" | "list";

/**
 * The slice of the table source the auto-built filter form reads and writes:
 * the extra-filter bag and its single/bulk setters. Every batteries-included
 * adapter renders its own kit controls over this same contract.
 *
 * @public
 */
export type FilterFormSource<TRow> = Pick<
  TableSource<TRow>,
  "extra" | "setExtra" | "setExtras" | "allFilteredRows" | "facets"
>;

/**
 * A scalar filter value as input text ("" when unset; numbers stringify).
 *
 * @public
 */
export function scalarFilterText(value: FilterValue): string {
  return value == null ? "" : String(value);
}

/**
 * A multi-select value as a list — tolerating a scalar from the URL.
 *
 * @public
 */
export function listFilterValues(value: FilterValue): string[] {
  if (Array.isArray(value)) return [...value];
  return value == null || value === "" ? [] : [String(value)];
}

function rangeArity(op: RangeOp | undefined): RangeOpArity {
  if (!op) return "one";
  if (isValuelessFilterOp(op)) return "none";
  if (isListFilterOp(op)) return "list";
  if (isBetweenFilterOp(op)) return "two";
  return "one";
}

function rangeInputType(
  flavour: "number" | "date",
  arity: RangeOpArity,
  op: RangeOp | undefined
): "date" | "number" | "text" {
  if (op === "relative") return "text";
  if (flavour === "date") return "date";
  if (arity === "list") return "text";
  return "number";
}

/**
 * Per-operator label keys for one widget flavour (numbers or dates).
 *
 * @public
 */
export type RangeOpLabelKeys =
  | typeof NUMBER_OP_LABEL_KEYS
  | (typeof DATE_OP_LABEL_KEYS & { readonly eq: "opOn" });

/**
 * Computed state + writers driving an operator-first range field.
 *
 * @public
 */
export interface RangeFieldWidget {
  /** The field's display label. */
  label: string;
  /** Operators offered for this flavour, in display order. */
  ops: readonly RangeOp[];
  /** Per-operator label keys for the current flavour (number vs date). */
  opLabelKeys: RangeOpLabelKeys;
  /** Native input `type` for the bound inputs (`text` for `in` / `notIn`). */
  inputType: "date" | "number" | "text";
  /** Operand shape for the selected operator. */
  arity: RangeOpArity;
  /** The selected operator, or `undefined` until one is chosen. */
  op: RangeOp | undefined;
  /** Set the operator (UI state, re-seeded from the persisted pair). */
  setOp: (op: RangeOp | undefined) => void;
  /** The single / lower bound / list as input text. */
  a: string;
  /** The upper bound as input text (`between` only). */
  b: string;
  /** Persist an operator + bound(s) back to the bag, including `f_<key>Op`. */
  write: (nextOp: RangeOp | undefined, nextA: string, nextB: string) => void;
}

/**
 * The shared, kit-agnostic logic behind an auto-built range filter
 * (`numberRange` / `dateRange`): it seeds the operator from the persisted
 * `Op` token (or infers it from the Min/Max pair), derives the visible
 * bound(s), and writes interactions back so the operator survives the URL.
 *
 * @typeParam TRow - The row type.
 * @param def - The range filter definition.
 * @param source - The filter-bag slice (extra + setters).
 * @returns The {@link RangeFieldWidget} state and writers.
 *
 * @public
 */
export function useRangeFilterWidget<TRow>(
  def: FilterDef<TRow>,
  source: FilterFormSource<TRow>
): RangeFieldWidget {
  const { extra, setExtras } = source;
  const label = filterLabel(def);
  const flavour = def.type === "dateRange" ? "date" : "number";
  const suffixes =
    RANGE_SUFFIXES[flavour === "date" ? "dateRange" : "numberRange"];
  const lowKey = def.key + suffixes.start;
  const highKey = def.key + suffixes.end;
  const opKey = filterOpKey(def.key);
  const ops: readonly RangeOp[] = flavour === "date" ? DATE_OPS : NUMBER_OPS;
  const opLabelKeys =
    flavour === "date"
      ? { ...DATE_OP_LABEL_KEYS, eq: "opOn" as const }
      : NUMBER_OP_LABEL_KEYS;
  const [op, setOp] = useState<RangeOp | undefined>(
    () => readRangeWidget(extra, lowKey, highKey, opKey, def.key, flavour).op
  );
  const derived = readRangeWidget(
    extra,
    lowKey,
    highKey,
    opKey,
    def.key,
    flavour
  );
  const a = derived.a;
  const b = derived.b;
  const arity = rangeArity(op);
  const inputType = rangeInputType(flavour, arity, op);
  const write = (nextOp: RangeOp | undefined, nextA: string, nextB: string) => {
    // Switching into `between` from a single-value comparison copies the
    // current value into both bounds so the pair is never half-empty.
    const seededB =
      nextOp === "between" && nextB === "" && nextA !== "" && op !== "between"
        ? nextA
        : nextB;
    // Relative stores a token, never a calendar day. Entering the op seeds
    // `today`; leaving it drops a leftover token so a date input stays empty.
    let seededA = nextA;
    if (nextOp === "relative" && !isRelativeDateToken(nextA)) {
      seededA = "today";
    } else if (nextOp !== "relative" && isRelativeDateToken(nextA)) {
      seededA = "";
    }
    setExtras(
      writeRangeFilter(nextOp, seededA, seededB, lowKey, highKey, def.key)
    );
  };
  return {
    label,
    ops,
    opLabelKeys,
    inputType,
    arity,
    op,
    setOp,
    a,
    b,
    write,
  };
}

/**
 * Computed state + writers driving an operator-first text field.
 *
 * @public
 */
export interface TextFieldWidget {
  /** The field's display label. */
  label: string;
  /** Operators offered for text filters. */
  ops: readonly TextOp[];
  /** Per-operator `TableLabels` keys. */
  opLabelKeys: typeof TEXT_OP_LABEL_KEYS;
  /** The selected operator (defaults to `contains`). */
  op: TextOp;
  /** Set the operator and persist it. */
  setOp: (op: TextOp) => void;
  /** The comparison term (unused for `empty` / `notEmpty`). */
  value: string;
  /** Whether the operator needs a value input. */
  needsValue: boolean;
  /** Persist the operator + term (clears the term for valueless ops). */
  write: (nextOp: TextOp, nextValue: string) => void;
}

/**
 * Kit-agnostic logic for a `text` filter: operator-first, persisted as
 * `f_<key>` plus `f_<key>Op` so the comparison survives the URL.
 *
 * @typeParam TRow - The row type.
 * @param def - The text filter definition.
 * @param source - The filter-bag slice (extra + setters).
 * @returns The {@link TextFieldWidget} state and writers.
 *
 * @public
 */
export function useTextFilterWidget<TRow>(
  def: FilterDef<TRow>,
  source: FilterFormSource<TRow>
): TextFieldWidget {
  const { extra, setExtras } = source;
  const label = filterLabel(def);
  const opKey = filterOpKey(def.key);
  const storedOp = parseTextOp(extra[opKey]);
  const [localOp, setLocalOp] = useState<TextOp>(storedOp);
  const op = extra[opKey] != null ? storedOp : localOp;
  const value = scalarFilterText(extra[def.key]);
  const needsValue = !isValuelessFilterOp(op);
  const write = (nextOp: TextOp, nextValue: string) => {
    const valueless = isValuelessFilterOp(nextOp);
    setLocalOp(nextOp);
    setExtras({
      [def.key]: valueless || nextValue === "" ? undefined : nextValue,
      [opKey]: valueless || nextValue !== "" ? nextOp : undefined,
    });
  };
  const setOp = (next: TextOp) => write(next, value);
  return {
    label,
    ops: TEXT_OPS,
    opLabelKeys: TEXT_OP_LABEL_KEYS,
    op,
    setOp,
    value,
    needsValue,
    write,
  };
}

/**
 * Resolve a `TableLabels` key to the string the widget should show.
 *
 * @public
 */
export function filterOpLabel(
  labels: Required<TableLabels>,
  key: keyof TableLabels
): string {
  const value = labels[key];
  return typeof value === "string" ? value : String(key);
}

export type { DateOp, NumberOp, TextOp } from "./operators";

/**
 * One choice in a tri-state boolean filter (`""` = any).
 *
 * @public
 */
export type BooleanChoice = "" | "true" | "false";

/**
 * Read a boolean filter slot as a tri-state choice.
 *
 * @public
 */
export function parseBooleanChoice(value: FilterValue): BooleanChoice {
  if (value === "true" || value === 1) return "true";
  if (value === "false" || value === 0) return "false";
  return "";
}

/**
 * Computed state + writer driving a tri-state boolean field.
 *
 * @public
 */
export interface BooleanFieldWidget {
  /** The field's display label. */
  label: string;
  /** Selected choice (`""` means any / don't care). */
  choice: BooleanChoice;
  /** Persist the choice (`""` clears the key). */
  write: (next: BooleanChoice) => void;
}

/**
 * Kit-agnostic logic for a `boolean` filter: any / true / false, never a
 * checkbox. The token is stored as `f_<key>=true|false`; omitting it is any.
 *
 * @public
 */
export function useBooleanFilterWidget<TRow>(
  def: FilterDef<TRow>,
  source: FilterFormSource<TRow>
): BooleanFieldWidget {
  const { extra, setExtra } = source;
  return {
    label: filterLabel(def),
    choice: parseBooleanChoice(extra[def.key]),
    write: (next) => setExtra(def.key, next === "" ? undefined : next),
  };
}
