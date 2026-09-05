/**
 * Default searchable-text projector: flatten a row's own values.
 *
 * @public
 */
export function engineSearchText<TRow>(row: TRow): string {
  if (row && typeof row === "object") {
    return Object.values(row)
      .map((value) => {
        if (value == null) return "";
        if (typeof value === "object") return JSON.stringify(value);
        return String(value as string | number | boolean);
      })
      .join(" ");
  }
  return String(row ?? "");
}
