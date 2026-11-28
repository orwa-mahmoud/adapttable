/** Native selects and Headless UI Listbox triggers share one locator. */
import type { Locator, Page } from "@playwright/test";

/**
 * A kit choice: a combobox, a native select, or a Headless UI Listbox
 * button. Headless UI 1.x exposes `aria-haspopup="listbox"` on a button,
 * not `role="combobox"`, so only buttons that open a listbox match.
 */
export function vueChoice(scope: Page | Locator, name?: string): Locator {
  const listboxTrigger = scope.locator('[aria-haspopup="listbox"]');
  if (name === undefined) return scope.getByRole("combobox").or(listboxTrigger);
  return scope
    .getByRole("combobox", { name, exact: true })
    .or(scope.getByRole("button", { name, exact: true }).and(listboxTrigger));
}
