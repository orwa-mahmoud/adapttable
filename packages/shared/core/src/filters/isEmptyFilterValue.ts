import type { FilterValue } from "../contracts/columns";

/** Whether an extra value counts as no value. */
export function isEmptyFilterValue(value: FilterValue): boolean {
  if (value == null || value === "") return true;
  return Array.isArray(value) && value.length === 0;
}
