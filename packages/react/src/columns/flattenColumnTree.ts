import {
  type ColumnGroupRecord,
  type ColumnInput as CoreColumnInput,
} from "@adapttable/core";
import { flattenColumnTree as coreFlattenColumnTree } from "@adapttable/core/binding";

import type { ColumnDef, ColumnInput } from "../columnDef";

/**
 * Flatten a React column tree. Leaves preserve their {@link ColumnDef} type.
 *
 * @public
 */
export function flattenReactColumnTree<TRow>(
  columns: readonly ColumnInput<TRow>[]
): {
  readonly leaves: ColumnDef<TRow>[];
  readonly groups: ReadonlyMap<string, ColumnGroupRecord<TRow>>;
} {
  const result = coreFlattenColumnTree(
    columns as readonly CoreColumnInput<TRow>[]
  );
  return {
    leaves: result.leaves as ColumnDef<TRow>[],
    groups: result.groups,
  };
}
