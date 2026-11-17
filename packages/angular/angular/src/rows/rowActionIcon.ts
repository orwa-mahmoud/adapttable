/**
 * A row action's icon as an Angular kit draws it.
 *
 * @packageDocumentation
 */
import type { RowAction } from "@adapttable/core";
import { reflectComponentType, TemplateRef, type Type } from "@angular/core";

/**
 * The host's icon for a row action: a template or a standalone component.
 *
 * @public
 */
export type RowActionIcon =
  | { readonly template: TemplateRef<unknown>; readonly component?: never }
  | { readonly component: Type<unknown>; readonly template?: never };

/**
 * The host's icon for a row action, when the host gave it as a template or
 * a component. The kit then draws an icon-only button; the label stays the
 * button's accessible name and tooltip.
 *
 * @param action - The row action.
 * @returns The icon, or `null` for a text button.
 * @public
 */
export function rowActionIcon(
  action: Pick<RowAction<never>, "icon">
): RowActionIcon | null {
  const icon = action.icon;
  if (icon instanceof TemplateRef) return { template: icon };
  if (typeof icon === "function" && reflectComponentType(icon as Type<unknown>))
    return { component: icon as Type<unknown> };
  return null;
}
