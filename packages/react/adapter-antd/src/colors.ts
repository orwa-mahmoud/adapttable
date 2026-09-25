/**
 * antd buttons express "destructive" as a boolean `danger` rather than a
 * color token, so map the common destructive color names a caller might set
 * on a {@link RowAction} / {@link BulkAction} (`"danger"`, `"red"`,
 * `"error"`) to that flag. Other color tokens have no antd Button equivalent
 * and are left to the default.
 *
 * @param color - The action's `color` field.
 * @returns Whether the action should render as danger.
 */
export function isDangerColor(color: string | undefined): boolean {
  return color === "danger" || color === "red" || color === "error";
}
