import { expect, type Page, test } from "@playwright/test";

import { ANGULAR_KITS, angularPart } from "./angular-kit";

for (const kit of ANGULAR_KITS) {
  test.describe(kit.key, () => {
    /**
     * Each Angular kit's column-groups page: a group row over the
     * columns, and three groups that each collapse their own way.
     */

    const PAGE = `/${kit.key}/column-groups/`;

    const demo = (page: Page) => page.locator(".mx-demo");
    const part = (page: Page, name: string) => angularPart(kit, page, name);
    const leafHeaders = (page: Page) =>
      part(page, "header-cell").evaluateAll((cells) =>
        cells.map((cell) => cell.textContent?.trim() ?? "")
      );
    const toggle = (page: Page, group: string) =>
      demo(page).getByRole("button", {
        name: new RegExp(`column group: ${group}$`),
      });

    test("spans each group's caption over its columns", async ({ page }) => {
      await page.goto(PAGE);
      await expect(part(page, "header-group-cell")).toHaveText([
        /Assignment/,
        /Delivery/,
        /Workload/,
      ]);
      await expect(
        part(page, "header-group-cell").filter({ hasText: "Assignment" })
      ).toHaveAttribute("colspan", "2");
      await expect(toggle(page, "Assignment")).toHaveAttribute(
        "aria-expanded",
        "true"
      );
    });

    test("keeps Team when Assignment collapses, and opens it again", async ({
      page,
    }) => {
      await page.goto(PAGE);
      const before = await leafHeaders(page);
      expect(before).toContain("Status");
      await toggle(page, "Assignment").click();
      await expect(toggle(page, "Assignment")).toHaveAttribute(
        "aria-expanded",
        "false"
      );
      const after = await leafHeaders(page);
      expect(after).toContain("Team");
      expect(after).not.toContain("Status");
      await toggle(page, "Assignment").click();
      await expect.poll(() => leafHeaders(page)).toEqual(before);
    });

    test("draws Delivery's budget in one cell when it collapses", async ({
      page,
    }) => {
      await page.goto(PAGE);
      await toggle(page, "Delivery").click();
      const firstRow = part(page, "row").first();
      await expect(firstRow).toContainText(/\$[\d,]+ budget/);
      expect(await leafHeaders(page)).not.toContain("Budget");
    });

    test("folds Workload to a narrow stub", async ({ page }) => {
      await page.goto(PAGE);
      const cellsBefore = await part(page, "row")
        .first()
        .locator('[data-adapttable-part="cell"]')
        .count();
      await toggle(page, "Workload").click();
      await expect(toggle(page, "Workload")).toHaveAttribute(
        "aria-expanded",
        "false"
      );
      const cells = part(page, "row")
        .first()
        .locator('[data-adapttable-part="cell"]');
      await expect(cells).toHaveCount(cellsBefore);
      const stub = cells.last();
      await expect(stub).toHaveText("");
      expect((await stub.boundingBox())!.width).toBeLessThan(60);
    });
  });
}
