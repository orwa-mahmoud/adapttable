import { expect, test } from "@playwright/test";

const part = (name: string) => `[data-adapttable-part="${name}"]`;

test("filters through a genuine anchored card and removes the active chip", async ({
  page,
}, testInfo) => {
  await page.goto("/filters");
  const trigger = page.locator(part("filters-button"));
  await trigger.click();
  const panel = page.locator(part("filters-popover"));
  await expect(panel).toBeVisible();
  await expect(panel).toHaveClass(/v-card/);
  await expect(page.locator(part("filters-backdrop"))).toHaveCount(0);
  await panel.locator(`${part("filter-input")} input`).fill("Alpha");
  await expect(page.locator("tbody [data-row-id]")).toHaveCount(1);
  await expect(page.locator('tbody [data-row-id="alpha"]')).toBeVisible();
  await panel.locator(`${part("filter-input")} input`).press("Escape");
  await expect(trigger).toBeFocused();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await page.locator(part("chip-remove")).first().click();
  await expect(page.locator("tbody [data-row-id]")).toHaveCount(3);
  await trigger.click();
  await page.screenshot({
    path: testInfo.outputPath("vuetify-filter-popover.png"),
    fullPage: true,
  });
});

test("keeps nested select keyboard dismissal inside the header filter", async ({
  page,
}) => {
  await page.goto("/filters");
  const trigger = page
    .locator('[data-column-key="name"] ' + part("filter-header-trigger"))
    .first();
  await trigger.focus();
  await trigger.press("Enter");
  const panel = page.locator(part("filters-popover"));
  const operator = panel.locator(
    `${part("filter-operator")} input:not([type=hidden])`
  );
  await operator.press("Enter");
  await expect(page.getByRole("listbox")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(panel).toBeVisible();
  await operator.press("Escape");
  await expect(panel).not.toBeVisible();
  await expect(trigger).toBeFocused();
});

test("preserves a drawer after a panel-to-backdrop gesture and traps Tab", async ({
  page,
}) => {
  await page.goto("/filters-drawer");
  const trigger = page.locator(part("filters-button"));
  await trigger.click();
  const panel = page.locator(part("filters-panel"));
  const backdrop = page.locator(part("filters-backdrop"));
  await expect(panel).toBeVisible();
  await expect(backdrop).toBeVisible();
  const panelBox = await panel.boundingBox();
  const backdropBox = await backdrop.boundingBox();
  if (!panelBox || !backdropBox)
    throw new Error("Missing drawer gesture geometry");
  await page.mouse.move(panelBox.x + 15, panelBox.y + 15);
  await page.mouse.down();
  await page.mouse.move(backdropBox.x + 10, backdropBox.y + 10);
  await page.mouse.up();
  await expect(panel).toBeVisible();
  const done = panel.locator(part("filters-done"));
  await done.focus();
  await done.press("Tab");
  await expect
    .poll(() =>
      panel.evaluate((element) => element.contains(document.activeElement))
    )
    .toBe(true);
  await backdrop.click({ position: { x: 10, y: 10 } });
  await expect(panel).not.toBeVisible();
  await expect(trigger).toBeFocused();
});

test("paints the real drawer in dark RTL and narrow mobile layouts", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/filters-drawer");
  await page.getByRole("button", { name: "Dark theme", exact: true }).click();
  await page
    .getByRole("button", { name: "Right to left", exact: true })
    .click();
  await page.locator(part("filters-button")).click();
  const panel = page.locator(part("filters-panel"));
  await expect(panel).toBeVisible();
  await expect(panel).toHaveAttribute("dir", "rtl");
  await expect(panel).toHaveClass(/v-theme--dark/);
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth
      )
    )
    .toBe(true);
  await page.screenshot({
    path: testInfo.outputPath("vuetify-filter-drawer-dark-rtl-mobile.png"),
    fullPage: true,
  });
  await panel.locator(part("filters-close")).click();
  await expect(panel).not.toBeVisible();
});
