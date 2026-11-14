import { expect, type Page, test } from "@playwright/test";

import { ANGULAR_KITS, angularPart } from "./angular-kit";

for (const kit of ANGULAR_KITS) {
  test.describe(kit.key, () => {
    /**
     * Each Angular kit's row-reordering page: a grip that lifts, moves
     * and drops from the keyboard, announcements, a confirm before the move,
     * and the host writing it.
     */

    const PAGE = `/${kit.key}/row-reordering/`;

    const part = (page: Page, name: string) => angularPart(kit, page, name);

    /** The person in each of the first rows, in order. */
    const people = (page: Page, count: number) =>
      part(page, "row").evaluateAll(
        (rows, n) =>
          rows
            .slice(0, n)
            .map(
              (row) =>
                [...row.querySelectorAll('[data-adapttable-part="cell"]')]
                  .map((cell) => cell.textContent?.trim() ?? "")
                  .find((text) => /^[A-Z][a-z]+ /.test(text)) ?? ""
            ),
        count
      );

    test("lifts a row with Space, moves it with the arrows and drops it", async ({
      page,
    }) => {
      await page.goto(PAGE);
      await expect
        .poll(() => people(page, 3))
        .toEqual(["Ada Lovelace", "Alan Turing", "Grace Hopper"]);
      const grip = part(page, "row-reorder-handle").first();
      await grip.focus();
      await page.keyboard.press("Space");
      await expect(
        page.locator(".mx-demo [aria-live]").filter({ hasText: "lifted" })
      ).toHaveText("Row 1 lifted");
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("Space");
      // A pointer drop asks first; confirm when the kit shows the menu.
      const confirmation = page.locator(
        '[data-adapttable-part="row-move-confirmation"]:visible'
      );
      if ((await confirmation.count()) > 0) {
        await confirmation.getByRole("button", { name: "Move" }).click();
      }

      await expect
        .poll(() => people(page, 3))
        .toEqual(["Alan Turing", "Grace Hopper", "Ada Lovelace"]);
      await expect(
        page.locator(".mx-demo [aria-live]").filter({ hasText: "moved" })
      ).toHaveText("Row moved from 1 to 3");
    });

    test("cancels a lift on Escape without asking the host to write", async ({
      page,
    }) => {
      await page.goto(PAGE);
      const grip = part(page, "row-reorder-handle").first();
      await grip.focus();
      await page.keyboard.press("Space");
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("Escape");
      await expect(part(page, "row").first()).toContainText("Ada Lovelace");
      await expect
        .poll(() => people(page, 2))
        .toEqual(["Ada Lovelace", "Alan Turing"]);
    });
  });
}
