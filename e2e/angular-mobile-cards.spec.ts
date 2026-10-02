import { expect, type Page, test } from "@playwright/test";

/**
 * The Angular unstyled kit's mobile-cards page: every row a labelled card,
 * and a load-more button in place of the pager.
 */

const PAGE = "/unstyled/mobile-cards/";

const part = (page: Page, name: string) =>
  page.locator(`.mx-demo [data-adapttable-part="${name}"]`);

test("draws every row as a card with its column labels", async ({ page }) => {
  await page.goto(PAGE);
  await expect(part(page, "table")).toHaveCount(0);
  await expect(part(page, "card")).toHaveCount(8);
  const rows = part(page, "card")
    .first()
    .locator('[data-adapttable-part="card-row"]');
  await expect(rows.first()).toHaveText("Ada Lovelace");
  await expect(rows.nth(1)).toHaveText(/Team\s*Core/);
  await expect(
    page.getByRole("list", { name: "People", exact: true })
  ).toHaveAttribute("data-adapttable-part", "cards");
  await expect(part(page, "cards")).not.toHaveAttribute("role", "table");
});

test("activates cards with keyboard navigation and keeps checkbox clicks separate", async ({
  page,
}) => {
  await page.goto(PAGE);
  const cards = part(page, "card");
  const log = page.locator(".mx-demo [data-demo-log]");
  await expect(log).toHaveText("Activate a person to see the host callback.");
  await cards.first().getByRole("checkbox").check();
  await expect(cards.first()).toHaveAttribute("data-selected", "");
  await expect(log).toHaveText("Activate a person to see the host callback.");
  await cards.first().focus();
  await page.keyboard.press("Enter");
  await expect(log).toHaveText("Activated Ada Lovelace");
  await page.keyboard.press("ArrowDown");
  await expect(cards.nth(1)).toBeFocused();
  await expect(cards.first()).toHaveAttribute("tabindex", "-1");
  await expect(cards.nth(1)).toHaveAttribute("tabindex", "0");
  await page.keyboard.press("Space");
  await expect(log).toHaveText("Activated Grace Hopper");
  await page.keyboard.press("ArrowUp");
  await expect(cards.first()).toBeFocused();
});

test("keeps named card-list semantics and localized controls in RTL", async ({
  page,
}) => {
  await page.goto(`${PAGE}?locale=ar&dir=rtl`);
  const list = page.getByRole("list", { name: "People", exact: true });
  await expect(list).toHaveAttribute("dir", "rtl");
  await expect(list).not.toHaveAttribute("role", "table");
  await expect(part(page, "card").first()).toContainText("آدا لوفليس");
  const checkbox = part(page, "card").first().getByRole("checkbox");
  await expect(checkbox).toHaveAccessibleName(/.+/);
  await expect(checkbox).not.toHaveAccessibleName("Select row");
  await checkbox.check();
  await expect(part(page, "card").first()).toHaveAttribute("data-selected", "");
});

test("sorts the cards from the phone sort select", async ({ page }) => {
  await page.goto(PAGE);
  const select = part(page, "sort-select");
  await expect(select).toBeVisible();
  await expect(select.locator("option")).toHaveCount(6);
  await expect(select).toHaveValue("");
  await select.selectOption("load");
  await expect(select).toHaveValue("load");
});

test("loads the next rows as the list reaches its end", async ({ page }) => {
  await page.goto(PAGE);
  await expect(part(page, "pager")).toHaveCount(0);
  await expect(part(page, "card")).toHaveCount(8);
  await part(page, "card").last().scrollIntoViewIfNeeded();
  await page.mouse.wheel(0, 2000);
  await expect.poll(() => part(page, "card").count()).toBeGreaterThan(8);
});
