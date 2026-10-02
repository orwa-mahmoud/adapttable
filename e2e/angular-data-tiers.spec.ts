import { expect, type Page, test } from "@playwright/test";

import { ANGULAR_KITS, angularPart } from "./angular-kit";

for (const kit of ANGULAR_KITS) {
  test.describe(kit.key, () => {
    /**
     * Each Angular kit's data tiers in a browser: a server that answers
     * each slice, an Angular Query infinite query, and view state kept in the
     * URL across a reload.
     */

    const part = (page: Page, name: string) => angularPart(kit, page, name);

    /** The first cell's text in every rendered row. */
    const names = (page: Page) =>
      part(page, "row").evaluateAll((rows) =>
        rows.map(
          (row) =>
            row
              .querySelector('[data-adapttable-part="cell"]')
              ?.textContent?.trim() ?? ""
        )
      );

    test.describe("server tier", () => {
      const PAGE = `/${kit.key}/scale/?tier=server`;

      test("reports the server's total and fetches later slices as the reader scrolls", async ({
        page,
      }) => {
        await page.goto(PAGE);
        await expect(part(page, "row").first()).toHaveAttribute(
          "data-row-id",
          "1"
        );
        await expect(part(page, "table")).toHaveAttribute(
          "aria-rowcount",
          "40000"
        );
        expect(await part(page, "row").count()).toBeLessThan(80);

        // Past the first slice of five hundred: the table asks for the next one.
        await part(page, "scroll-box").evaluate((box) => {
          box.scrollTop = box.scrollHeight;
        });
        await expect
          .poll(
            async () =>
              Number(
                await part(page, "row").last().getAttribute("data-row-id")
              ),
            { timeout: 10_000 }
          )
          .toBeGreaterThan(500);
        // Only the slices fetched are in the list: the bottom is the second
        // slice's end, not the forty-thousandth row.
        expect(
          Number(await part(page, "row").last().getAttribute("data-row-id"))
        ).toBeLessThanOrEqual(1000);
        expect(await part(page, "row").count()).toBeLessThan(80);
      });
    });

    test.describe("query tier", () => {
      const PAGE = `/${kit.key}/scale/?tier=query`;

      test("replaces the source in place and restores each source's own query", async ({
        page,
      }) => {
        await page.goto(PAGE);
        await expect(part(page, "row")).toHaveCount(10);
        await part(page, "page-next").click();
        await expect(part(page, "row").first()).toHaveAttribute(
          "data-row-id",
          "11"
        );
        const queryPage = await names(page);
        const table = await part(page, "table").elementHandle();
        expect(table).not.toBeNull();
        const alternate = page.getByRole("button", {
          name: "Use alternate data",
          exact: true,
        });
        await alternate.click();
        await expect(alternate).toHaveAttribute("aria-pressed", "true");
        await expect(part(page, "row")).toHaveCount(2);
        await expect(part(page, "row").first()).toContainText(
          "Alternate Ada Lovelace"
        );
        await part(page, "search").fill("Alternate Ada");
        await expect(part(page, "row")).toHaveCount(1);
        expect(await table.evaluate((element) => element.isConnected)).toBe(
          true
        );

        await alternate.click();
        await expect(part(page, "row")).toHaveCount(10);
        await expect(part(page, "row").first()).toHaveAttribute(
          "data-row-id",
          "11"
        );
        expect(await names(page)).toEqual(queryPage);
        await expect(part(page, "search")).toHaveValue("");

        await alternate.click();
        await expect(part(page, "search")).toHaveValue("Alternate Ada");
        await expect(part(page, "row")).toHaveCount(1);
        await expect(part(page, "row").first()).toContainText(
          "Alternate Ada Lovelace"
        );
        expect(await table.evaluate((element) => element.isConnected)).toBe(
          true
        );
      });

      test("pages, sorts and searches through the infinite query", async ({
        page,
      }) => {
        await page.goto(PAGE);
        await expect(part(page, "row")).toHaveCount(10);
        await expect(part(page, "footer")).toContainText("of 30");
        const firstPage = await names(page);

        await part(page, "page-next").click();
        await expect(part(page, "row").first()).toHaveAttribute(
          "data-row-id",
          "11"
        );
        expect(await names(page)).not.toEqual(firstPage);

        await part(page, "sort-button").first().click();
        await expect
          .poll(async () => {
            const shown = await names(page);
            return (
              shown.length > 0 &&
              shown.join() ===
                [...shown].sort((a, b) => a.localeCompare(b)).join()
            );
          })
          .toBe(true);

        await part(page, "search").fill("Grace");
        await expect(part(page, "row")).toHaveCount(1);
        await expect(part(page, "row").first()).toContainText("Grace Hopper");
      });
    });

    test.describe("URL state", () => {
      const PAGE = `/${kit.key}/filtering/`;

      test("keeps search, sort and page in the URL and restores them on reload", async ({
        page,
      }) => {
        await page.goto(PAGE);
        await expect(part(page, "row")).toHaveCount(25);

        // A new sort starts over at page one, so it comes first.
        const person = part(page, "header-cell").first();
        await angularPart(kit, page, "sort-button", person).click();
        await angularPart(kit, page, "sort-button", person).click();
        await expect(person).toHaveAttribute("aria-sort", "descending");

        await part(page, "page-next").click();
        await expect(part(page, "row")).toHaveCount(5);
        await expect(page).toHaveURL(/flt\.page=2/);

        await page.reload();
        await expect(part(page, "header-cell").first()).toHaveAttribute(
          "aria-sort",
          "descending"
        );
        await expect(part(page, "row")).toHaveCount(5);

        await part(page, "search").fill("Grace");
        await expect(part(page, "row")).toHaveCount(1);
        await page.reload();
        await expect(part(page, "search")).toHaveValue("Grace");
        await expect(part(page, "row")).toHaveCount(1);
        await expect(part(page, "row").first()).toContainText("Grace Hopper");
      });
    });
  });
}
