import { columnPathText } from "@adapttable/core/binding";

/**
 * The text of a primitive value; `null` for anything else — an object has no
 * text a cell or an attribute should show.
 */
export function primitiveText(value: unknown): string | null {
  return columnPathText(value);
}
