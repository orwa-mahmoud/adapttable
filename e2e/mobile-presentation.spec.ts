import { expect, test } from "@playwright/test";

import { builtAdapters, pathOf } from "../apps/showcase/matrix.mjs";

for (const framework of ["react", "angular", "vue"] as const) {
  for (const kit of builtAdapters(framework)) {
    test(`${framework}/${kit.key}: cards and horizontal tables preserve the mobile choice`, async ({
      page,
    }, info) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(
        `${framework === "vue" ? "/vue" : ""}/${pathOf(kit)}/mobile-cards/?locale=en&theme=light`
      );
      const root = page.locator(".mx-demo");
      const cards = root.locator('[data-adapttable-part="card"]');
      const table = root.locator('[data-adapttable-part="table"]').first();
      await expect(cards.first()).toBeVisible();
      await expect(cards.first()).toContainText(/Platform|Core/);
      await expect(cards.first()).toContainText(
        /Planned|PLANNED|Active|ACTIVE/
      );
      expect(
        await cards
          .first()
          .locator('[data-adapttable-part="card-row"]')
          .evaluateAll((fields) =>
            fields
              .filter((field) => field.scrollWidth > field.clientWidth + 1)
              .map((field) => field.textContent)
          )
      ).toEqual([]);
      const actions = cards
        .first()
        .locator('[data-adapttable-part="row-edit-begin"]');
      await expect(actions.first()).toBeVisible();
      expect(
        await actions.evaluateAll((buttons) =>
          buttons.every((button) => {
            const rect = button.getBoundingClientRect();
            return rect.width >= 44 && rect.height >= 44;
          })
        )
      ).toBe(true);
      await cards
        .first()
        .screenshot({ path: info.outputPath("card-light.png") });
      expect(
        await page.evaluate(
          () =>
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth
        )
      ).toBeLessThanOrEqual(1);

      await cards
        .first()
        .locator('[data-adapttable-part="row-edit-begin"]')
        .click();
      await expect(
        cards.first().locator('[data-adapttable-part="row-edit-save"]')
      ).toBeVisible();
      await cards
        .first()
        .locator('[data-adapttable-part="row-edit-cancel"]')
        .click();
      await expect(
        cards.first().locator('[data-adapttable-part="row-edit-begin"]')
      ).toBeVisible();

      await page
        .getByRole("button", { name: "Automatic", exact: true })
        .click();
      await expect(cards.first()).toBeVisible();
      await page.setViewportSize({ width: 1280, height: 900 });
      await expect(table).toBeVisible();
      await expect(cards).toHaveCount(0);
      await page.setViewportSize({ width: 390, height: 844 });
      await expect(cards.first()).toBeVisible();

      await page
        .getByRole("button", { name: "Scrollable table", exact: true })
        .click();
      await expect(table).toBeVisible();
      await expect(cards).toHaveCount(0);
      const scroll = root
        .locator(
          kit.key === "antd"
            ? ".ant-table-body, .ant-table-content"
            : '[data-adapttable-part="scroll-box"]'
        )
        .first();
      await expect(scroll).toBeVisible();
      await expect
        .poll(() => scroll.evaluate((el) => el.scrollWidth - el.clientWidth))
        .toBeGreaterThan(0);
      await scroll.hover();
      await page.mouse.wheel(400, 0);
      await expect
        .poll(() => scroll.evaluate((el) => el.scrollLeft))
        .toBeGreaterThan(0);
      expect(
        await page.evaluate(
          () =>
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth
        )
      ).toBeLessThanOrEqual(1);

      await page
        .getByRole("button", { name: "Phone cards", exact: true })
        .click();
      await expect(cards.first()).toBeVisible();
      await expect(table).not.toBeVisible();
      await page.goto(
        `${framework === "vue" ? "/vue" : ""}/${pathOf(kit)}/mobile-cards/?locale=ar&dir=rtl&theme=dark`
      );
      await expect(cards.first()).toBeVisible();
      await cards
        .first()
        .screenshot({ path: info.outputPath("card-dark-rtl.png") });
      expect(
        await page.evaluate(
          () =>
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth
        )
      ).toBeLessThanOrEqual(1);
    });
  }
}
