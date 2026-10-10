import { expect, type Page, test } from "@playwright/test";

import { ANGULAR_KITS, angularPart } from "./angular-kit";

const columnKeys = (page: Page) =>
  page
    .locator("th[data-column-key]")
    .evaluateAll((headers) =>
      headers.map((header) => header.getAttribute("data-column-key"))
    );

for (const kit of ANGULAR_KITS) {
  test(`${kit.key}: the live demo exposes working column visibility, pinning and keyboard order`, async ({
    page,
  }) => {
    await page.goto(`/angular-main/?kit=${kit.key}`);
    const columns = angularPart(kit, page, "column-menu-button");
    await expect(columns).toBeVisible();
    await columns.click();
    const panel = angularPart(kit, page, "column-menu-panel");
    await expect(panel).toBeVisible();
    const status = page.locator('th[data-column-key="status"]');
    await page
      .getByRole("button", { name: "Hide column: Status", exact: true })
      .click();
    await expect(status).toHaveCount(0);
    await page
      .getByRole("button", { name: "Show column: Status", exact: true })
      .click();
    await expect(status).toHaveCount(1);
    await page
      .getByRole("button", { name: "Pin to start: Status", exact: true })
      .click();
    await expect(status).toHaveAttribute("data-pinned", "start");
    await page
      .getByRole("button", { name: "Column actions: Status", exact: true })
      .click();
    await page.getByRole("button", { name: "Pin to end", exact: true }).click();
    await expect(status).toHaveAttribute("data-pinned", "end");
    await page
      .getByRole("button", { name: "Unpin: Status", exact: true })
      .click();
    await expect(status).not.toHaveAttribute("data-pinned");
    const grip = panel.getByRole("button", {
      name: "Move to start / Move to end: Status",
      exact: true,
    });
    const order = () => columnKeys(page);
    const before = await order();
    await grip.press("ArrowUp");
    await expect.poll(order).not.toEqual(before);
    await grip.press("ArrowDown");
    await expect.poll(order).toEqual(before);
    await page.keyboard.press("Escape");
    await expect(panel).toBeHidden();
    await expect(columns).toBeFocused();
  });

  test(`${kit.key}: a filter drawer overlays the page without adding a table row or changing its geometry`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`/angular-main/?kit=${kit.key}`);
    await page
      .getByRole("combobox", { name: "Filters", exact: true })
      .selectOption("drawer");
    const table = page.locator('[data-adapttable-part="table"]');
    await expect(table).toBeVisible();
    const before = await table.boundingBox();
    const rows = page.locator('[data-adapttable-part="row"]');
    const count = await rows.count();
    const trigger = angularPart(kit, page, "filters-button");
    await trigger.click();
    const panel = angularPart(kit, page, "filters-panel");
    await expect(panel).toBeVisible();
    const after = await table.boundingBox();
    expect(Math.abs(after!.x - before!.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(after!.y - before!.y)).toBeLessThanOrEqual(1);
    expect(Math.abs(after!.width - before!.width)).toBeLessThanOrEqual(1);
    expect(Math.abs(after!.height - before!.height)).toBeLessThanOrEqual(1);
    await expect(rows).toHaveCount(count);
    const done = panel.getByRole("button", { name: "Done", exact: true });
    await expect(done).toBeVisible();
    expect(
      (await done.boundingBox())!.y + (await done.boundingBox())!.height
    ).toBeLessThanOrEqual(900);
    await page.keyboard.press("Escape");
    await expect(panel).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test(`${kit.key}: each header filter stays associated with its clicked column`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto(`/angular-main/?kit=${kit.key}`);
    await page
      .getByRole("combobox", { name: "Filters", exact: true })
      .selectOption("header");
    const triggers = page.locator(
      '[data-adapttable-part="filter-header-trigger"]'
    );
    await expect
      .poll(() => columnKeys(page))
      .toEqual(["person", "status", "timeline", "budget", "load"]);
    await expect(triggers).toHaveCount(5);
    const columns = angularPart(kit, page, "column-menu-button");
    await columns.click();
    const menu = angularPart(kit, page, "column-menu-panel");
    await expect(menu).toBeVisible();
    await menu
      .getByRole("button", { name: "Show column: Team", exact: true })
      .click();
    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();
    await expect(columns).toBeFocused();
    await expect
      .poll(() => columnKeys(page))
      .toEqual(["person", "team", "status", "timeline", "budget", "load"]);
    await expect(triggers).toHaveCount(6);
    for (let index = 0; index < 6; index++) {
      const trigger = triggers.nth(index).locator("button, summary").first();
      const anchor = await trigger.boundingBox();
      const scrollWidth = await page
        .locator('[data-adapttable-part="scroll-box"]')
        .evaluate((box) => box.scrollWidth);
      await trigger.click();
      const panel = page.locator('[data-adapttable-part="filter-header-cell"]');
      await expect(panel).toBeVisible();
      await expect
        .poll(async () => (await panel.boundingBox())!.x)
        .toBeGreaterThanOrEqual(anchor!.x - 24);
      const box = (await panel.boundingBox())!;
      expect(box.x).toBeLessThanOrEqual(anchor!.x + anchor!.width + 24);
      expect(box.x + box.width).toBeLessThanOrEqual(1920 - 8);
      await expect
        .poll(async () => (await panel.boundingBox())!.y)
        .toBeGreaterThanOrEqual(anchor!.y + anchor!.height - 2);
      expect(
        await page
          .locator('[data-adapttable-part="scroll-box"]')
          .evaluate((box) => box.scrollWidth)
      ).toBeLessThanOrEqual(scrollWidth + 1);
      await page.keyboard.press("Escape");
      await expect(panel).toBeHidden();
      await expect(trigger).toBeFocused();
    }
  });
}

for (const key of ["unstyled", "aria", "angular-cdk", "spartan", "taiga-ui"]) {
  for (const locale of ["en", "ar"]) {
    test(`${key} ${locale}: the search icon remains inside its input and vertically centered`, async ({
      page,
    }) => {
      await page.goto(`/angular-main/?kit=${key}&locale=${locale}`);
      const field = page.locator('[data-adapttable-part="search-field"]');
      const input = field.getByRole("searchbox");
      await expect(input).toBeVisible();
      const icon = await field
        .locator('[data-adapttable-part="search-icon"] svg')
        .boundingBox();
      const control = await input.boundingBox();
      expect(icon!.x).toBeGreaterThan(control!.x);
      expect(icon!.x + icon!.width).toBeLessThan(control!.x + control!.width);
      expect(
        Math.abs(icon!.y + icon!.height / 2 - control!.y - control!.height / 2)
      ).toBeLessThanOrEqual(2);
      expect(
        await input.evaluate((element) =>
          Number.parseFloat(getComputedStyle(element).paddingInlineStart)
        )
      ).toBeGreaterThanOrEqual(36);
      await input.fill("Ada");
      await expect(page.locator('[data-adapttable-part="row"]')).toHaveCount(1);
      await expect(page.locator('[data-adapttable-part="row"]')).toContainText(
        locale === "ar" ? "آدا لوفليس" : "Ada Lovelace"
      );
    });
  }
}
