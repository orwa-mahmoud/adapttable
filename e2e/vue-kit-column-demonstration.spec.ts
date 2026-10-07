import { expect, test } from "@playwright/test";

const kits = ["reka-ui", "shadcn-vue"] as const;

for (const kit of kits) {
  for (const theme of ["light", "dark"]) {
    test(`${kit}: ${theme} pinning reveals a scrollable arrangement and keeps sticky cells opaque`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1200, height: 814 });
      await page.goto(`/vue/${kit}/?theme=${theme}`);
      const header = (key: string) =>
        page.locator(
          `[data-adapttable-part="header-cell"][data-column-key="${key}"]`
        );
      const customer = header("customer");
      const scroll = page.locator('[data-adapttable-part="scroll-box"]');
      const menu = page.getByRole("button", { name: "Columns", exact: true });
      await expect(customer).toBeVisible();
      await expect(header("region")).toHaveCount(0);
      await expect(header("owner")).toHaveCount(0);
      expect(
        await scroll.evaluate((el) => el.scrollWidth - el.clientWidth)
      ).toBe(0);
      await menu.click();
      await page
        .getByRole("button", { name: "Pin to start: Customer", exact: true })
        .click();
      await expect(header("region")).toBeVisible();
      await expect(header("owner")).toBeVisible();
      await page
        .getByRole("button", { name: "Unpin: Customer", exact: true })
        .press("Escape");
      await expect(menu).toBeFocused();
      await expect(menu).toHaveAttribute("aria-expanded", "false");
      expect(
        await scroll.evaluate((el) => el.scrollWidth - el.clientWidth)
      ).toBeGreaterThan(100);
      await expect(scroll).toHaveCSS("overflow-x", "auto");
      await scroll.evaluate((el) => {
        el.scrollLeft = el.scrollWidth;
      });
      const edge = await scroll.evaluate(
        (el) => el.getBoundingClientRect().left + el.clientLeft
      );
      expect((await customer.boundingBox())!.x).toBeCloseTo(edge, 0);
      const cell = page
        .locator('[data-adapttable-part="row"]')
        .first()
        .locator('[data-column-key="customer"]');
      expect((await cell.boundingBox())!.x).toBeCloseTo(edge, 0);
      expect(
        await cell.evaluate((el) => getComputedStyle(el).backgroundColor)
      ).not.toBe("rgba(0, 0, 0, 0)");
      const key = `kit-${kit}-orders.colPin`;
      await expect
        .poll(() => new URL(page.url()).searchParams.get(key))
        .toBe("customer:start");
      await expect(
        page.getByRole("link", {
          name: kit === "reka-ui" ? "Reka UI" : "shadcn-vue",
          exact: true,
        })
      ).toHaveAttribute("href", /colPin=customer%3Astart/);
      await page.reload();
      await expect(customer).toHaveAttribute("data-pinned", "start");
      await expect(header("region")).toBeVisible();
      await menu.click();
      await page
        .getByRole("button", { name: "Hide column: Region", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Unpin: Customer", exact: true })
        .press("Escape");
      await page.reload();
      await expect(header("region")).toHaveCount(0);
      await expect(customer).toHaveAttribute("data-pinned", "start");
    });
  }
}
