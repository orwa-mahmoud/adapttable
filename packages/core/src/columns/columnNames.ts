import type { ColumnMetadata } from "../columnModel";

/** The declared prose name used when a user rename is reset. */
export function declaredColumnName<TRow>(column: ColumnMetadata<TRow>): string {
  if (typeof column.header === "string") return column.header;
  return column.mobileLabel ?? column.key;
}

/** Apply layout-owned display names without changing stable column keys. */
export function applyColumnNames<TCol extends ColumnMetadata<any>>(
  columns: readonly TCol[],
  names: Readonly<Record<string, string>> | undefined
): TCol[] {
  if (!names || Object.keys(names).length === 0) return [...columns];
  return columns.map((column) => {
    const name = names[column.key]?.trim();
    return !name || column.renameable !== true
      ? column
      : { ...column, header: name, mobileLabel: name };
  });
}
