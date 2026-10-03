import { expect, type Page, test } from "@playwright/test";

import {
  builtAdapters,
  featuresOf,
  fillTemplate,
  headFor,
  landingHead,
} from "../apps/showcase/matrix.mjs";
import { demoRoute, siteUrl } from "../scripts/site.mjs";
import {
  angularPart,
  checkAngularCheckbox,
  selectAngularOption,
} from "./angular-kit";

/**
 * Every Angular kit's pages: each boots the Angular entry, mounts the real
 * kit, reads as a page without JavaScript, and links its siblings.
 */

const KITS = builtAdapters("angular");

/** Console errors a page logs while it loads. */
function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

test("the showcase serves native and NG-ZORRO Angular kits", () => {
  expect(KITS.length).toBeGreaterThan(0);
  expect(KITS.map((kit) => kit.key)).toEqual(
    expect.arrayContaining(["unstyled", "ng-zorro"])
  );
});

for (const kit of KITS) {
  const pages = [
    { dir: kit.key, heading: fillTemplate("AdaptTable for {kit}", kit) },
    ...featuresOf(kit).map((feature) => ({
      dir: `${kit.key}/${feature.slug}`,
      heading: fillTemplate(headFor(feature, kit).h1, kit),
    })),
  ];

  test(`${kit.key}: the landing renders its own kit's table and controls`, async ({
    page,
  }) => {
    await page.goto(`/${kit.key}/`);
    const root = page.locator('.mx-demo [data-adapttable-part="root"]');
    await expect(root).toBeVisible();
    await expect(root.locator('[data-adapttable-part="row"]')).toHaveCount(10);
    await expect(
      root.locator('[data-adapttable-part="row"]').first()
    ).toContainText("Ada Lovelace");
    if (kit.key === "ng-zorro") {
      await expect(
        root.locator('nz-table table[data-adapttable-part="table"]')
      ).toBeVisible();
      await expect(
        root.locator('input[nz-input][data-adapttable-part="search"]')
      ).toBeVisible();
      await expect(root.locator("nz-pagination")).toBeVisible();
      const trigger = angularPart(kit, page, "filters-button", root);
      await expect(trigger).toHaveClass(/ant-btn/);
      await expect(root.locator("select")).toHaveCount(0);
      await trigger.click();
      const filters = angularPart(kit, page, "filters-popover");
      await expect(
        filters.getByRole("combobox", { name: "Core team", exact: true })
      ).toHaveClass(/ant-select-selection-search-input/);
      await expect(
        filters.getByRole("checkbox", { name: "Core", exact: true })
      ).toHaveClass(/ant-checkbox-input/);
      await expect(filters.locator("select")).toHaveCount(0);
      await page.keyboard.press("Escape");
      await expect(filters).toHaveCount(0);
      await expect(trigger).toBeFocused();
    } else {
      await expect(
        root.locator(
          "nz-table, nz-pagination, button[nz-button], input[nz-input]"
        )
      ).toHaveCount(0);
      await expect(
        root.locator('table[data-adapttable-part="table"]')
      ).toBeVisible();
      await expect(
        root.locator('input[data-adapttable-part="search"]')
      ).toBeVisible();
    }
  });

  for (const { dir, heading } of pages) {
    test(`${dir}: mounts the kit's table with no errors`, async ({ page }) => {
      const errors = collectErrors(page);
      await page.goto(`/${dir}/`);
      await expect(page.locator("adapt-showcase-matrix-page")).toBeVisible();
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(heading);
      await expect(
        page.locator('.mx-demo [data-adapttable-part="root"]').first()
      ).toBeVisible();
      await expect(page.locator(".mx-seam")).toContainText(kit.pkg);
      expect(errors).toEqual([]);
    });
  }

  test(`${kit.key}: every page stays within the width of a phone`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    for (const { dir } of pages) {
      await page.goto(`/${dir}/`);
      await expect(page.locator(".mx-seam")).toBeVisible();
      const overflow = await page.evaluate(
        () =>
          document.scrollingElement!.scrollWidth -
          document.scrollingElement!.clientWidth
      );
      expect(overflow, dir).toBeLessThanOrEqual(0);
    }
  });

  test(`${kit.key}: reads as a page without JavaScript, and stays out of the index`, async ({
    browser,
  }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto(`/${kit.key}/`, { waitUntil: "domcontentloaded" });
    await expect(page).toHaveTitle(fillTemplate(landingHead(kit).title, kit));
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      siteUrl(demoRoute(kit.key, kit.framework))
    );
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      kit.indexable === false
        ? "noindex, follow"
        : "index, follow, max-image-preview:large"
    );
    await expect(page.locator("main")).toContainText(kit.install);
    await context.close();
  });

  test(`${kit.key}: the landing grid and each page's rail link every feature page`, async ({
    page,
  }) => {
    await page.goto(`/${kit.key}/`);
    const cards = page.locator(".mx-grid .mx-card");
    await expect(cards).toHaveCount(featuresOf(kit).length);
    const first = featuresOf(kit)[0]!;
    await cards.first().click();
    await expect(page).toHaveURL(new RegExp(`/${kit.key}/${first.slug}/$`));
    const rail = page.locator(".mx-rail a");
    await expect(rail).toHaveCount(featuresOf(kit).length);
    await expect(rail.first()).toHaveAttribute("aria-current", "page");
  });

  test(`${kit.key}: the theme toggle darkens the page and survives a reload`, async ({
    page,
  }) => {
    await page.goto(`/${kit.key}/`);
    await page.evaluate(() => localStorage.removeItem("adapttable-demo-theme"));
    await page.reload();
    const html = page.locator("html");
    await expect(html).toHaveAttribute("data-theme", "light");
    await page.getByRole("button", { name: "Toggle dark mode" }).click();
    await expect(html).toHaveAttribute("data-theme", "dark");
    await page.reload();
    await expect(html).toHaveAttribute("data-theme", "dark");
  });
}

/** Every newly reached destination proves the operation its page names. */
for (const kit of KITS) {
  const part = (page: Page, name: string) => angularPart(kit, page, name);

  test(`${kit.key}/columns: hides and restores a column through the real menu`, async ({
    page,
  }) => {
    await page.goto(`/${kit.key}/columns/`);
    const emailHeader = page
      .getByRole("columnheader")
      .and(page.locator('.mx-demo [data-column-key="email"]'));
    await expect(emailHeader).toHaveCount(1);
    await part(page, "column-menu-button").click();
    await page
      .getByRole("button", { name: "Hide column: Email", exact: true })
      .click();
    await expect(emailHeader).toHaveCount(0);
    await page
      .getByRole("button", { name: "Show column: Email", exact: true })
      .click();
    await expect(emailHeader).toHaveCount(1);
    await page.keyboard.press("Escape");
    await expect(part(page, "column-menu-button")).toBeFocused();
  });

  test(`${kit.key}/aggregation: filtering recomputes group and footer totals without filtering the pinned total`, async ({
    page,
  }) => {
    await page.goto(`/${kit.key}/aggregation/`);
    const pinned = page.locator(
      '.mx-demo [data-adapttable-part="pinned-summary-top"]'
    );
    await expect(pinned).toContainText("Portfolio total");
    const portfolio = await pinned.textContent();
    await part(page, "search").fill("Ada Lovelace");
    await expect(part(page, "row")).toHaveCount(1);
    await expect(part(page, "summary-cell").last()).toHaveText("$25,300");
    await expect(part(page, "group-footer-row")).toContainText("25,300");
    await expect(pinned).toHaveText(portfolio!);
    await expect(pinned.getByRole("checkbox")).toHaveCount(0);
  });

  test(`${kit.key}/pivot: adding a row dimension changes real pivot rows and survives reload`, async ({
    page,
  }) => {
    await page.goto(`/${kit.key}/pivot/`);
    const rowHeaders = part(page, "pivot-row-header");
    await expect(rowHeaders).toHaveCount(5);
    await selectAngularOption(
      page.locator('[data-pivot-zone="rows"]').getByRole("combobox"),
      { value: "role", label: "Role" }
    );
    await expect(page.getByTestId("pivot-fold")).toHaveCount(5);
    expect(await rowHeaders.count()).toBeGreaterThan(5);
    const fold = page.getByTestId("pivot-fold").first();
    const caption = (await fold.textContent())!.replace(/[▶◀▼]/g, "").trim();
    const count = await rowHeaders.count();
    await fold.click();
    await expect(fold).toHaveAttribute("aria-expanded", "false");
    await expect.poll(() => rowHeaders.count()).toBeLessThan(count);
    await expect
      .poll(() => new URL(page.url()).searchParams.get("pivot.pivot"))
      .toContain(";hide:");
    await page.reload();
    await expect(page.locator('[data-pivot-zone="rows"]')).toContainText(
      "Role"
    );
    await expect(
      page.getByTestId("pivot-fold").filter({ hasText: caption })
    ).toHaveAttribute("aria-expanded", "false");
  });

  test(`${kit.key}/accessibility: arrow focus, a column selection and its announcement are observable`, async ({
    page,
  }) => {
    await page.goto(`/${kit.key}/accessibility/`);
    await expect(part(page, "table")).toHaveAttribute("role", "grid");
    const firstRow = part(page, "row").first();
    const cells = firstRow.locator('[data-adapttable-part="cell"]');
    await cells.first().focus();
    await page.keyboard.press("ArrowRight");
    await expect(cells.nth(1)).toBeFocused();
    await expect(part(page, "grid-announcer")).toContainText("Team");
    await expect(page.getByTestId("announcements")).toContainText("Team");
    const select = part(page, "column-select").first().getByRole("checkbox");
    await checkAngularCheckbox(kit, select);
    await expect(select).toBeChecked();
    await expect(page.locator(".mx-demo [data-cell-selected]")).toHaveCount(10);
  });

  for (const width of [1280, 390]) {
    test(`${kit.key}/formulas: computes an added expression and keeps it in the URL at ${String(width)}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`/${kit.key}/formulas/`);
      await page.getByTestId("formula-name").fill("Power");
      await page.getByTestId("formula-text").fill("=POWER(2, 3)");
      await page.getByTestId("formula-add").click();
      const rows = part(page, width === 390 ? "card" : "row");
      const values = rows
        .first()
        .locator(
          `[data-adapttable-part="${width === 390 ? "card-value" : "cell"}"]`
        );
      await expect(values.last()).toHaveText("8");
      await expect
        .poll(() => new URL(page.url()).searchParams.get("fx.formula"))
        .not.toBeNull();
      await page.reload();
      await expect(values.last()).toHaveText("8");
      await page
        .getByRole("button", { name: "Remove Power", exact: true })
        .click();
      await expect(page.getByTestId("formula-columns")).not.toContainText(
        "Power:"
      );
      await page.getByTestId("formula-name").fill("Broken");
      await page.getByTestId("formula-text").fill("=budget / 0");
      await page.getByTestId("formula-add").click();
      await expect(values.last()).toHaveText("#DIV/0!");
    });

    test(`${kit.key}/realtime: a row patch changes its budget without losing selection at ${String(width)}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`/${kit.key}/realtime/?live=off`);
      const rows = part(page, width === 390 ? "card" : "row");
      const ada = rows.filter({ hasText: "Ada Lovelace" });
      await expect(ada).toContainText("$25,300");
      await checkAngularCheckbox(kit, ada.getByRole("checkbox"));
      await page
        .getByRole("button", { name: "Apply next update", exact: true })
        .click();
      await expect(ada).toContainText("$26,300");
      await expect(ada.getByRole("checkbox")).toBeChecked();
      await expect(page.getByTestId("patch-feed")).toHaveText(
        "Ada Lovelace: $25,300 → $26,300"
      );
      await expect(rows).toHaveCount(10);
    });
  }
}
