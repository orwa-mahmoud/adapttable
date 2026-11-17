import {
  type BooleanFieldWidget,
  type FilterDef,
  type RangeFieldWidget,
  type RangeOp,
  type TextFieldWidget,
  type TextOp,
} from "@adapttable/core";
import {
  booleanFilterWidget,
  type FilterFormSource,
  initialRangeFilterOp,
  initialTextFilterOp,
  rangeFilterWidget,
  textFilterWidget,
} from "@adapttable/core/binding";
import { useEffect, useState } from "react";

export type {
  BooleanChoice,
  BooleanFieldWidget,
  DateOp,
  NumberOp,
  RangeFieldWidget,
  RangeOpArity,
  RangeOpLabelKeys,
  TextFieldWidget,
  TextOp,
} from "@adapttable/core";
export {
  filterOpLabel,
  listFilterValues,
  parseBooleanChoice,
  scalarFilterText,
} from "@adapttable/core";
export type {
  FilterFormSource,
  FiltersFormSlotProps,
} from "@adapttable/core/binding";

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
  const storedOp = initialRangeFilterOp(def, source.extra);
  const stored = rangeFilterWidget(def, source, storedOp);
  const [op, setOp] = useState<RangeOp | undefined>(storedOp);
  // A mounted filter also receives URL, Saved View and AI changes. Re-seed
  // from its own persisted values without erasing an unfinished operator
  // choice when an unrelated filter changes or the host merely rerenders.
  useEffect(() => {
    setOp(storedOp);
  }, [def.key, def.type, storedOp, stored.a, stored.b]);
  return { ...rangeFilterWidget(def, source, op), setOp };
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
  const [localOp, setLocalOp] = useState<TextOp>(() =>
    initialTextFilterOp(def, source.extra)
  );
  return textFilterWidget(def, source, localOp, setLocalOp);
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
  return booleanFilterWidget(def, source);
}
