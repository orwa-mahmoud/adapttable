import "./nuxt-saved-reorder.spec";

import { expect, test } from "@playwright/test";

const route = "/vue/nuxt-ui/workspace/";
const part = (name: string) => `[data-adapttable-part="${name}"]`;

test("Nuxt command palette searches, dispatches once and restores keyboard focus", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(route);
  const trigger = page.locator(part("command-palette-button"));
  await trigger.focus();
  await trigger.press("Enter");
  const palette = page.locator(part("command-palette"));
  const input = palette.getByRole("combobox", { name: "Search commands" });
  await expect(palette).toHaveAttribute("role", "dialog");
  await expect(input).toBeFocused();
  await expect(
    palette.getByRole("option", { name: "Disabled command" })
  ).toBeDisabled();
  await input.fill("missing command");
  await expect(palette.locator(part("command-empty"))).toHaveText(
    "No matching command"
  );
  await input.fill("Run report");
  await input.press("Enter");
  await expect(palette).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await expect(page.locator('[data-test="events"]')).toHaveText("command");
  await trigger.press("Enter");
  await input.press("Escape");
  await expect(palette).toHaveCount(0);
  await expect(trigger).toBeFocused();
  expect(errors).toEqual([]);
});

test("Nuxt context menu has exact semantic targets and shared keyboard navigation", async ({
  page,
}) => {
  await page.goto(route);
  const grip = page
    .locator('tr[data-row-id="a"]')
    .locator(part("row-reorder-handle"));
  await grip.focus();
  await grip.press("Shift+F10");
  const menu = page.getByRole("menu", { name: "Table actions" });
  await expect(menu).toHaveAttribute("data-adapttable-part", "context-menu");
  await expect(
    menu.getByRole("menuitem", { name: "Disabled action" })
  ).toBeDisabled();
  await expect(
    menu.locator(part("context-menu-separator")).first()
  ).toHaveAttribute("role", "separator");
  await menu.press("End");
  const action = menu.getByRole("menuitem", { name: "Custom action" });
  await expect(action).toBeFocused();
  await action.press("Enter");
  await expect(menu).toHaveCount(0);
  await expect(page.locator('[data-test="events"]')).toHaveText("context");
  await grip.focus();
  await grip.press("Shift+F10");
  await menu.press("Escape");
  await expect(menu).toHaveCount(0);
  await expect(grip).toBeFocused();
});

test("Nuxt context actions honor RTL and dispatch header sorting", async ({
  page,
}) => {
  await page.goto(route);
  await page.locator('[data-test="rtl"]').click();
  const header = page.locator('th[data-column-key="name"]');
  await header.click({ button: "right" });
  const menu = page.getByRole("menu", { name: "Table actions" });
  await expect(menu).toHaveAttribute("dir", "rtl");
  await menu
    .getByRole("menuitem", { name: "Sort ascending", exact: true })
    .click();
  await expect(menu).toHaveCount(0);
  await expect(header).toHaveAttribute("aria-sort", "ascending");
});

test("Nuxt controlled panel tabs follow RTL and stack beneath mobile cards", async ({
  page,
}) => {
  await page.goto(route);
  await page.locator('[data-test="rtl"]').click();
  const panel = page.locator(part("side-panel"));
  await panel.getByRole("tab", { name: "First", exact: true }).focus();
  await page.keyboard.press("ArrowLeft");
  await expect(
    panel.getByRole("tab", { name: "Second", exact: true })
  ).toBeFocused();
  await expect(panel.locator(part("side-panel-body"))).toHaveText(
    "Second panel"
  );
  await panel.locator(part("side-panel-close")).click();
  await expect(panel).toHaveCount(0);
  await page.locator('[data-test="panel"]').click();
  await expect(panel.locator(part("side-panel-body"))).toHaveText(
    "First panel"
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('[data-test="mobile"]').click();
  await expect(page.locator(part("cards"))).toBeVisible();
  await expect(page.locator(part("table-region"))).toHaveCSS(
    "flex-direction",
    "column"
  );
  await expect(panel).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth
    )
  ).toBeLessThanOrEqual(1);
});

test("Nuxt cached table retires open command overlays and resumes closed", async ({
  page,
}) => {
  await page.goto(route);
  await page.locator(part("command-palette-button")).click();
  const input = page.getByRole("combobox", { name: "Search commands" });
  await input.fill("Pause table");
  await input.press("Enter");
  await expect(page.locator(part("root"))).toHaveCount(0);
  await expect(page.locator(part("command-palette"))).toHaveCount(0);
  await expect(page.locator('[data-test="events"]')).toHaveText("paused");
  await page.locator('[data-test="visibility"]').click();
  await expect(page.locator(part("root"))).toBeVisible();
  await expect(page.locator(part("command-palette-button"))).toHaveAttribute(
    "aria-expanded",
    "false"
  );
  await expect(page.locator(part("command-palette"))).toHaveCount(0);
});
