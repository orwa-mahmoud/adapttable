import { expect, test } from "@playwright/test";

import { builtAdapters, pathOf } from "../apps/showcase/matrix.mjs";
import { expectMatchingRows } from "./table-total";

for (const kit of builtAdapters("vue")) {
  test(`${kit.key}: active filters are wrapping chips with usable removal controls`, async ({
    page,
  }) => {
    await page.goto(`/vue/${pathOf(kit)}/filtering/?locale=en&flt.f_name=Ada`);
    const chips = page.locator('.mx-demo [data-adapttable-part="chips"]');
    await expect(chips).toContainText("Ada");
    await expect(chips).toHaveCSS("list-style-type", "none");
    await expect(chips).toHaveCSS("display", "flex");
    const remove = chips.getByRole("button", { name: /Remove filter/ }).first();
    await expect(remove).toBeVisible();
    const desktop = await remove.boundingBox();
    expect(desktop!.width).toBeGreaterThanOrEqual(24);
    expect(desktop!.height).toBeGreaterThanOrEqual(24);
    await page.setViewportSize({ width: 390, height: 844 });
    await expect
      .poll(async () => (await remove.boundingBox())!.height)
      .toBeGreaterThanOrEqual(44);
    expect(
      await chips.evaluate((e) => e.scrollWidth - e.clientWidth)
    ).toBeLessThanOrEqual(1);
    await remove.click();
    await expect(chips).toHaveCount(0);
    await expectMatchingRows(page.locator(".mx-demo"), 30);

    const longValue = "customer-implementation-review-".repeat(6);
    await page.goto(
      `/vue/${pathOf(kit)}/filtering/?locale=en&flt.f_name=${longValue}`
    );
    await expect(chips).toContainText(longValue);
    expect(
      await chips.evaluate(
        (element) => element.scrollWidth - element.clientWidth
      )
    ).toBeLessThanOrEqual(1);
    await chips.getByRole("button", { name: "Clear all", exact: true }).click();
    await expect(chips).toHaveCount(0);
  });
}
