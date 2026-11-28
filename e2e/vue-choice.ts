/** Native selects and Headless UI Listbox triggers share one locator. */
import type { Locator, Page } from "@playwright/test";

/**
 * A kit choice: a combobox, a native select, or a Headless UI Listbox
 * button. Headless UI 1.x exposes `aria-haspopup="listbox"` on a button,
 * not `role="combobox"`.
 */
export function vueChoice(scope: Page | Locator, name?: string): Locator {
  const combobox =
    name === undefined
      ? scope.getByRole("combobox")
      : scope.getByRole("combobox", { name, exact: true });
  const listbox =
    name === undefined
      ? scope.locator('[aria-haspopup="listbox"]')
      : scope.getByRole("button", { name, exact: true });
  return combobox.or(listbox);
}
