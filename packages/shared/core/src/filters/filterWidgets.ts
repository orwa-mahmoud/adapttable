/**
 * The auto-built filter form's widgets: operator-first range and text fields
 * and the tri-state boolean field.
 *
 * Kit `RangeField` / `TextFilterField` / `RelativeTokenField` controls look
 * alike because they speak this model. They are not byte-equal pixels — each
 * kit resolves the names to its own controls — so the controls stay kit-native
 * and only the model lives here. A binding keeps one piece of state per
 * widget, the operator a reader picked before typing a value, and hands it in.
 */
import type { FilterValue } from "../contracts/columns";
import type { TableLabels } from "../types";
import { type FilterDef, filterLabel, RANGE_SUFFIXES } from "./filterDefs";
import type { FilterFormSource } from "./filterFormModel";
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
 * Per-operator label keys for one widget flavour (numbers or dates).
 *
 * @public
 */
export type RangeOpLabelKeys =
  | typeof NUMBER_OP_LABEL_KEYS
  | (typeof DATE_OP_LABEL_KEYS & { readonly eq: "opOn" });

/**
 * A scalar filter value as input text (`""` when unset; numbers stringify).
 *
 * @param value - The stored value.
 * @returns The input text.
 *
 * @public
 */
export function scalarFilterText(value: FilterValue): string {
  return value == null ? "" : String(value);
}

/**
 * Resolve a `TableLabels` key to the string a widget shows.
 *
 * @param labels - Fully resolved labels.
 * @param key - The label key.
 * @returns The label, or the key itself when it is not a string label.
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

/** A range def's flavour and the keys its pair and operator persist under. */
function rangeKeys<TRow>(def: FilterDef<TRow>) {
  const flavour: "number" | "date" =
    def.type === "dateRange" ? "date" : "number";
  const suffixes =
    RANGE_SUFFIXES[flavour === "date" ? "dateRange" : "numberRange"];
  return {
    flavour,
    lowKey: def.key + suffixes.start,
    highKey: def.key + suffixes.end,
    opKey: filterOpKey(def.key),
  };
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
 * The operator a range field opens on: the persisted `Op` token, or one
 * inferred from the stored Min/Max pair.
 *
 * @param def - The range filter definition.
 * @param extra - The filter bag.
 * @returns The operator, or `undefined` when nothing is stored.
 *
 * @public
 */
export function initialRangeFilterOp<TRow>(
  def: FilterDef<TRow>,
  extra: FilterFormSource<TRow>["extra"]
): RangeOp | undefined {
  const { flavour, lowKey, highKey, opKey } = rangeKeys(def);
  return readRangeWidget(extra, lowKey, highKey, opKey, def.key, flavour).op;
}

/**
 * An operator-first range field (`numberRange` / `dateRange`): the visible
 * bound(s) derived from the bag, and a writer that keeps the operator in the
 * URL. Switching into `between` from a single comparison copies the value
 * into both bounds; entering `relative` seeds `today` and leaving it drops the
 * token, so a date input never shows one.
 *
 * @param def - The range filter definition.
 * @param source - The filter-bag slice.
 * @param op - The operator the reader has selected.
 * @returns The field's state and writer; the binding adds `setOp`.
 *
 * @public
 */
export function rangeFilterWidget<TRow>(
  def: FilterDef<TRow>,
  source: Pick<FilterFormSource<TRow>, "extra" | "setExtras">,
  op: RangeOp | undefined
): Omit<RangeFieldWidget, "setOp"> {
  const { flavour, lowKey, highKey, opKey } = rangeKeys(def);
  const { a, b } = readRangeWidget(
    source.extra,
    lowKey,
    highKey,
    opKey,
    def.key,
    flavour
  );
  const arity = rangeArity(op);
  return {
    label: filterLabel(def),
    ops: flavour === "date" ? DATE_OPS : NUMBER_OPS,
    opLabelKeys:
      flavour === "date"
        ? { ...DATE_OP_LABEL_KEYS, eq: "opOn" as const }
        : NUMBER_OP_LABEL_KEYS,
    inputType: rangeInputType(flavour, arity, op),
    arity,
    op,
    a,
    b,
    write(nextOp, nextA, nextB) {
      const seededB =
        nextOp === "between" && nextB === "" && nextA !== "" && op !== "between"
          ? nextA
          : nextB;
      let seededA = nextA;
      if (nextOp === "relative" && !isRelativeDateToken(nextA)) {
        seededA = "today";
      } else if (nextOp !== "relative" && isRelativeDateToken(nextA)) {
        seededA = "";
      }
      source.setExtras(
        writeRangeFilter(nextOp, seededA, seededB, lowKey, highKey, def.key)
      );
    },
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
 * A `text` filter: operator-first, persisted as `f_<key>` plus `f_<key>Op`
 * so the comparison survives the URL. A stored operator wins; until one is
 * stored, the operator the reader picked (`localOp`) shows.
 *
 * @param def - The text filter definition.
 * @param source - The filter-bag slice.
 * @param localOp - The operator the reader picked before typing a term.
 * @param setLocalOp - Where a newly picked operator goes.
 * @returns The field's state and writers.
 *
 * @public
 */
export function textFilterWidget<TRow>(
  def: FilterDef<TRow>,
  source: Pick<FilterFormSource<TRow>, "extra" | "setExtras">,
  localOp: TextOp,
  setLocalOp: (op: TextOp) => void
): TextFieldWidget {
  const opKey = filterOpKey(def.key);
  const op =
    source.extra[opKey] == null ? localOp : parseTextOp(source.extra[opKey]);
  const value = scalarFilterText(source.extra[def.key]);
  const write = (nextOp: TextOp, nextValue: string): void => {
    const valueless = isValuelessFilterOp(nextOp);
    setLocalOp(nextOp);
    source.setExtras({
      [def.key]: valueless || nextValue === "" ? undefined : nextValue,
      [opKey]: valueless || nextValue !== "" ? nextOp : undefined,
    });
  };
  return {
    label: filterLabel(def),
    ops: TEXT_OPS,
    opLabelKeys: TEXT_OP_LABEL_KEYS,
    op,
    setOp: (next) => write(next, value),
    value,
    needsValue: !isValuelessFilterOp(op),
    write,
  };
}

/**
 * The operator a text field opens on: the persisted one, else `contains`.
 *
 * @param def - The text filter definition.
 * @param extra - The filter bag.
 * @returns The operator.
 *
 * @public
 */
export function initialTextFilterOp<TRow>(
  def: FilterDef<TRow>,
  extra: FilterFormSource<TRow>["extra"]
): TextOp {
  return parseTextOp(extra[filterOpKey(def.key)]);
}

/**
 * One choice in a tri-state boolean filter (`""` = any).
 *
 * @public
 */
export type BooleanChoice = "" | "true" | "false";

/**
 * Read a boolean filter slot as a tri-state choice.
 *
 * @param value - The stored value.
 * @returns The choice.
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
 * A `boolean` filter: any / true / false, never a checkbox. The token is
 * stored as `f_<key>=true|false`; omitting it is any.
 *
 * @param def - The boolean filter definition.
 * @param source - The filter-bag slice.
 * @returns The field's state and writer.
 *
 * @public
 */
export function booleanFilterWidget<TRow>(
  def: FilterDef<TRow>,
  source: Pick<FilterFormSource<TRow>, "extra" | "setExtra">
): BooleanFieldWidget {
  return {
    label: filterLabel(def),
    choice: parseBooleanChoice(source.extra[def.key]),
    write: (next) => source.setExtra(def.key, next === "" ? undefined : next),
  };
}
