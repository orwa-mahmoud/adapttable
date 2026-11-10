/**
 * Whether a renderer value is a standalone component rather than a template
 * or text.
 */
import type { Type } from "@angular/core";

/**
 * Whether `value` is a compiled Angular component: it carries its definition
 * as `ɵcmp`.
 *
 * @param value - What a host or a registry returned to draw.
 * @returns Whether `value` is a component class.
 */
export function isComponentType(value: unknown): value is Type<unknown> {
  return typeof value === "function" && "ɵcmp" in value;
}
