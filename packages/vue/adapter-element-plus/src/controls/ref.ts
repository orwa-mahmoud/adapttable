import type { ElementRef } from "@adapttable/vue";

/** Attribute bags carry optional callbacks; kit controls resolve their DOM target. */
export function isElementRef(value: unknown): value is ElementRef<Element> {
  return typeof value === "function";
}
