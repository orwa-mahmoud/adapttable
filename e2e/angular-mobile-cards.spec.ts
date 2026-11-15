import { expect, type Page, test } from "@playwright/test";

import {
  ANGULAR_KITS,
  angularPart,
  checkAngularCheckbox,
  expectAngularSelection,
  selectAngularOption,
} from "./angular-kit";

for (const kit of ANGULAR_KITS) {
  test.describe(kit.key, () => {
    /**
     * Each Angular kit's mobile-cards page: every row a labelled card,
     * and a load-more button in place of the pager.
     */

    const PAGE = `/${kit.key}/mobile-cards/`;

    const part = (page: Page, name: string) => angularPart(kit, page, name);

    test("draws every row as a card with its column labels", async ({
      page,
    }) => {
      await page.goto(PAGE);
      await expect(part(page, "table")).toHaveCount(0);
      await expect(part(page, "card")).toHaveCount(5);
      const rows = part(page, "card")
        .first()
        .locator('[data-adapttable-part="card-row"]');
      await expect(rows.first().locator("strong")).toHaveText("Priya Nair");
      await expect(
        rows.first().locator('[data-adapttable-part="card-label"]')
      ).toHaveCount(0);
      await expect(rows.nth(1)).toHaveText(/Team\s*Platform/);
      await expect(
        page.getByRole("list", { name: "People", exact: true })
      ).toHaveAttribute("data-adapttable-part", "cards");
      await expect(part(page, "cards")).not.toHaveAttribute("role", "table");
    });

    test("activates cards with keyboard navigation and keeps checkbox clicks separate", async ({
      page,
    }) => {
      await page.goto(PAGE);
      const cards = part(page, "card");
      const log = page.locator(".mx-demo [data-demo-log]");
      await expect(log).toHaveText(
        "Activate a person to see the host callback."
      );
      await checkAngularCheckbox(kit, cards.first().getByRole("checkbox"));
      await expect(cards.first()).toHaveAttribute("data-selected", "");
      await expect(log).toHaveText(
        "Activate a person to see the host callback."
      );
      await cards.first().focus();
      await page.keyboard.press("Enter");
      await expect(log).toHaveText("Activated Priya Nair");
      await page.keyboard.press("ArrowDown");
      await expect(cards.nth(1)).toBeFocused();
      await expect(cards.first()).toHaveAttribute("tabindex", "-1");
      await expect(cards.nth(1)).toHaveAttribute("tabindex", "0");
      await expect(cards.nth(1)).toContainText("Jonah Okonkwo");
      await page.keyboard.press("Space");
      await expect(log).toHaveText("Activated Jonah Okonkwo");
      await page.keyboard.press("ArrowUp");
      await expect(cards.first()).toBeFocused();
    });

    test("keeps named card-list semantics and localized controls in RTL", async ({
      page,
    }) => {
      await page.goto(`${PAGE}?locale=ar&dir=rtl`);
      const list = page.getByRole("list", { name: "People", exact: true });
      await expect(list).toHaveAttribute("dir", "rtl");
      await expect(list).not.toHaveAttribute("role", "table");
      await expect(part(page, "card").first()).toContainText("بريا نير");
      const checkbox = part(page, "card").first().getByRole("checkbox");
      await expect(checkbox).toHaveAccessibleName(/.+/);
      await expect(checkbox).not.toHaveAccessibleName("Select row");
      await checkAngularCheckbox(kit, checkbox);
      await expect(part(page, "card").first()).toHaveAttribute(
        "data-selected",
        ""
      );
    });

    test("sorts the cards from the phone sort select", async ({ page }) => {
      await page.goto(PAGE);
      const select = part(page, "sort-select");
      await expect(select).toBeVisible();
      await expectAngularSelection(kit, select, { value: "", label: "—" });
      await selectAngularOption(select, { value: "load", label: "Load" }, 5);
      await expectAngularSelection(kit, select, {
        value: "load",
        label: "Load",
      });
      await expect(part(page, "card").first()).toHaveAttribute(
        "data-row-id",
        "805"
      );
    });

    test("loads the next rows as the list reaches its end", async ({
      page,
    }) => {
      await page.goto(PAGE);
      await page.getByRole("button", { name: "Paged", exact: true }).click();
      await expect(part(page, "pager")).toHaveCount(0);
      await expect(part(page, "card")).toHaveCount(5);
      await part(page, "card").last().scrollIntoViewIfNeeded();
      await page.mouse.wheel(0, 2000);
      await expect.poll(() => part(page, "card").count()).toBeGreaterThan(5);
    });
  });
}
