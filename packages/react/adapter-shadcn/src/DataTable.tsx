import {
  DataTable as UnstyledDataTable,
  type DataTableProps,
} from "@adapttable/unstyled";

import { shadcnClassNames } from "./classNames";

/**
 * AdaptTable, pre-styled with **shadcn/ui** design tokens — a fully-styled data
 * table in a single import. A thin wrapper over `@adapttable/unstyled` that
 * applies the {@link shadcnClassNames} preset, so you don't hand-wire the
 * class map.
 *
 * Requires shadcn/ui set up in your app (its CSS variables + Tailwind config).
 * Restyle any part by passing your own `classNames` — they're merged **over**
 * the preset, per part, so `classNames={{ root: "…" }}` only replaces the root.
 *
 * @typeParam TRow - The row type.
 *
 * @public
 */
export function DataTable<TRow>(props: Readonly<DataTableProps<TRow>>) {
  const { classNames, ...rest } = props;
  return (
    <UnstyledDataTable
      {...rest}
      classNames={
        classNames ? { ...shadcnClassNames, ...classNames } : shadcnClassNames
      }
    />
  );
}
