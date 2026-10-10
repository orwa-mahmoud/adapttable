import { expect, test } from "@playwright/test";

const fixture =
  process.env.SHADCN_PARITY_FIXTURE_URL ?? "/vue/shadcn-vue/feature-parity/";
const part = (name: string) => `[data-adapttable-part="${name}"]`;

for (const direction of ["ltr", "rtl"] as const) {
  test(`${direction}: grouping, saved views, row menu, keyboard moves and commands use real controls`, async ({
    page,
  }) => {
    await page.goto(fixture);
    if (direction === "rtl") await page.locator("#direction-toggle").click();
    const grip = page.locator(part("row-reorder-handle")).first();
    await grip.focus();
    await page.keyboard.press("Space");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Space");
    await expect(page.locator("#host-result")).toHaveText("Moved Ada");
    await page.locator(part("row-actions-trigger")).first().click();
    await page.getByRole("menuitem", { name: "Inspect" }).click();
    await expect(page.locator("#host-result")).toHaveText("Inspect Bea");
    await page.locator(part("grouping-add")).selectOption("team");
    await expect(page.locator(part("group-row"))).toHaveCount(2);
    await page.locator(part("grouping-aggregation-option")).first().click();
    await expect(
      page.locator(part("grouping-aggregation-operation"))
    ).toBeVisible();
    await expect(page.locator(part("grouping-chip-handle"))).toHaveAttribute(
      "data-slot",
      "button"
    );
    const views = page.locator(part("views-button"));
    await views.click();
    await page.locator(part("views-input")).fill(`Grouped ${direction}`);
    await page.locator(part("views-save")).click();
    await expect(
      page
        .locator(part("views-item"))
        .filter({ hasText: `Grouped ${direction}` })
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(views).toBeFocused();
    const commands = page.locator(part("command-palette-button"));
    await commands.click();
    await page.locator(part("command-input")).fill("Show report");
    await page.keyboard.press("Enter");
    await expect(page.locator("#host-result")).toHaveText("Report requested");
    await expect(commands).toBeFocused();
    await page
      .locator('.parity-pivot [data-zone="rows"] select')
      .selectOption("team");
    await expect(
      page.locator('.parity-pivot [data-zone="rows"]')
    ).toContainText("Team");
  });
}

test("375px RTL mobile cards retain moves and grouping without horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(fixture);
  await page.locator("#direction-toggle").click();
  await page.locator("#mobile-toggle").click();
  await expect(page.locator("article[data-slot=card]")).toHaveCount(3);
  const down = page.locator(part("row-reorder-down")).first();
  await down.click();
  await expect(page.locator("#host-result")).toHaveText("Moved Ada");
  await page.locator(part("grouping-add")).selectOption("team");
  await expect(page.locator(part("grouping-panel"))).toHaveAttribute(
    "data-mobile",
    ""
  );
  await expect(page.locator(part("grouping-chip-handle"))).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth
    )
  ).toBe(true);
});
