import { expect, test } from "@playwright/test";

import {
  buildAngularBrowserConsumer,
  serveAngularBrowserConsumer,
} from "../scripts/build-angular-browser-consumer.mjs";

/**
 * A packed Angular table, rendered in a real browser.
 *
 * The page is built from the packed tarballs and served on its own port, so
 * it never depends on the showcase. PR CI selects it with
 * `--project=angular-consumer` after the packages it packs are built.
 * It drives the table the way a user would: the rows render, a column sorts
 * when its header is activated, and a group collapses when its header is.
 */
test.describe("packed Angular consumer", () => {
  let served: Awaited<ReturnType<typeof serveAngularBrowserConsumer>>;

  test.beforeAll(async () => {
    served = await serveAngularBrowserConsumer(
      await buildAngularBrowserConsumer()
    );
  });

  test.afterAll(async () => {
    await served.close();
  });

  test("renders rows, sorts a column and collapses a group", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const response = await page.goto(served.url);
    expect(response?.status()).toBe(200);

    const table = page.locator("adapt-data-table");
    await expect(table).toBeVisible();
    await expect(table).toContainText("Ada");
    await expect(table).toContainText("Grace");

    const nameSort = table.locator("[aria-label='Sort by: Name']");
    await nameSort.click();
    await expect(
      nameSort.locator("xpath=ancestor::*[@aria-sort][1]")
    ).toHaveAttribute("aria-sort", /ascending|descending/);

    const group = table
      .locator("[data-adapttable-part='group-toggle']")
      .first();
    await expect(group).toBeVisible();
    const expanded = await group.getAttribute("aria-expanded");
    await group.click();
    await expect(group).toHaveAttribute(
      "aria-expanded",
      expanded === "true" ? "false" : "true"
    );
    expect(errors).toEqual([]);
  });
});
