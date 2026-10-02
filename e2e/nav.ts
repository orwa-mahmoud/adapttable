import { expect, type Page } from "@playwright/test";

/**
 * Driving the demo nav's dropdowns.
 *
 * The bar carries two direct links and one menu, so every kit is two moves
 * away: open Adapters, click the kit. The specs that prove a landing is
 * reachable go through here rather than each spelling the pair out.
 *
 * A kit's own feature pages are not in the bar — they are its landing grid
 * and the rail on every feature page, which `gotoFromFeatureGrid` drives.
 */
export type NavGroup = "Adapters";

/** Open one of the nav's menus, and wait for the trigger to say it is open. */
export async function openNavGroup(page: Page, group: string): Promise<void> {
  const trigger = page
    .locator(".nav")
    .getByRole("button", { name: group, exact: true });
  await trigger.click();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
}

/** Reach a demo page the way a reader does: open its group, click its item. */
export async function gotoFromNav(
  page: Page,
  group: NavGroup,
  label: string
): Promise<void> {
  await openNavGroup(page, group);
  await page.getByRole("menuitem", { name: label, exact: true }).click();
}

/**
 * Reach one of a kit's feature pages the way a reader does now that the bar has
 * no Features menu: from the kit's landing page, through the feature grid.
 *
 * This is the path that made the menu redundant, so it is the one worth
 * exercising — the same links appear again in the rail under every feature page.
 *
 * @param page - The Playwright page.
 * @param kit - The adapter key, e.g. `mantine`.
 * @param label - The feature's label as the grid prints it.
 */
export async function gotoFromFeatureGrid(
  page: Page,
  kit: string,
  label: string
): Promise<void> {
  await page.goto(`/${kit}/`);
  const card = page
    .locator(".mx-grid")
    .getByRole("link", { name: new RegExp(`^${label}\\b`) })
    .first();
  await expect(card).toBeVisible();
  await card.click();
}
