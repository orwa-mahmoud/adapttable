import { expect, test } from "@playwright/test";

const part = (name: string) => `[data-adapttable-part="${name}"]`;

test("opens the genuine column manager, focuses search and retains trigger semantics on close", async ({
  page,
}, testInfo) => {
  await page.goto("/columns");
  const trigger = page.locator(part("column-menu-button"));
  await trigger.click();
  const panel = page.locator(part("column-menu-panel"));
  const search = panel.locator(`${part("column-menu-search")} input`);
  await expect(panel).toHaveClass(/v-card/);
  await expect(search).toBeFocused();
  await expect(trigger).toHaveAttribute(
    "aria-controls",
    (await panel.getAttribute("id")) ?? ""
  );
  await search.fill("Name");
  await expect(panel.locator(part("column-menu-item"))).toHaveCount(1);
  await page.screenshot({
    path: testInfo.outputPath("vuetify-columns-search.png"),
    fullPage: true,
  });
  await search.press("Escape");
  await expect(panel).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await trigger.press("Enter");
  await expect(
    page.locator(`${part("column-menu-search")} input`)
  ).toBeFocused();
});

test("uses real visibility and pin controls without moving host rows", async ({
  page,
}) => {
  await page.goto("/columns");
  await page.locator(part("column-menu-button")).click();
  const panel = page.locator(part("column-menu-panel"));
  const row = panel.locator(part("column-menu-item")).filter({
    has: page.locator(part("column-menu-label"), { hasText: /^Team$/ }),
  });
  await row.locator(part("column-menu-visibility")).click();
  await expect(page.locator('thead [data-column-key="team"]')).toHaveCount(0);
  await row.locator(part("column-menu-visibility")).click();
  await expect(page.locator('thead [data-column-key="team"]')).toHaveCount(1);
  await row.locator(part("column-menu-pin")).click();
  await expect(row).toHaveAttribute("data-pinned", /start|end/);
  await expect
    .poll(() =>
      page
        .locator("tbody [data-row-id]")
        .evaluateAll((rows) =>
          rows.map((row) => row.getAttribute("data-row-id"))
        )
    )
    .toEqual(["beta", "alpha", "gamma"]);
});

test("renames a header through the actual input and exposes validation", async ({
  page,
}) => {
  await page.goto("/columns");
  const header = page.locator('thead [data-column-key="name"]');
  await header.locator(part("header-rename-button")).click();
  const input = header.locator(`${part("header-rename-input")} input`);
  await expect(input).toBeFocused();
  await input.fill("");
  await input.press("Enter");
  await expect(input).toHaveAttribute("aria-invalid", "true");
  await expect(header.getByRole("alert")).toBeVisible();
  await input.fill("Person");
  await input.press("Enter");
  await expect(header).toContainText("Person");
  await expect(header.locator(part("header-rename-input"))).toHaveCount(0);
});

test("positions the menu inside a narrow dark RTL workspace", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/columns");
  await page.getByRole("button", { name: "Dark theme", exact: true }).click();
  await page
    .getByRole("button", { name: "Right to left", exact: true })
    .click();
  const trigger = page.locator(part("column-menu-button"));
  await trigger.click();
  const panel = page.locator(part("column-menu-panel"));
  await expect(panel).toBeVisible();
  await expect(panel).toHaveAttribute("dir", "rtl");
  await expect(panel).toHaveClass(/v-theme--dark/);
  const box = await panel.boundingBox();
  if (!box) throw new Error("Missing menu geometry");
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(390);
  await page.screenshot({
    path: testInfo.outputPath("vuetify-columns-dark-rtl-mobile.png"),
    fullPage: true,
  });
  await page.getByRole("heading", { name: "People workspace" }).click();
  await expect(panel).toHaveCount(0);
});
