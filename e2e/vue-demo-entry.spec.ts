/** Shared Vue entry modes use every native kit and reset queries on navigation. */
import { expect, test } from "@playwright/test";

import { builtAdapters, pathOf } from "../apps/showcase/matrix.mjs";
import { getLabels } from "../packages/shared/i18n/src";

for (const kit of builtAdapters("vue")) {
  test(`${kit.key}: the frontend bulk action updates the host-owned rows`, async ({
    page,
  }) => {
    await page.goto(`/vue-main/?kit=${kit.key}&selection=on&editing=off`);
    const row = page
      .locator('.mx-demo [data-adapttable-part="row"][data-row-id]')
      .first();
    await expect(row).toContainText("Ada Lovelace");
    const checkbox = row.getByRole("checkbox");
    if (kit.key === "element-plus")
      await row
        .locator("label")
        .filter({ has: page.getByRole("checkbox") })
        .click();
    else await checkbox.check();
    await expect(checkbox).toBeChecked();
    await page.getByRole("button", { name: "Archive", exact: true }).click();
    await expect(row.getByText("Archived", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("status").filter({ hasText: /^Archive: / })
    ).toHaveText(`Archive: ${(await row.getAttribute("data-row-id")) ?? ""}`);
  });
  for (const mode of ["vue-main", "vue-all-options"]) {
    for (const variant of [
      { width: 1440, height: 1000, locale: "en", theme: "light" },
      { width: 390, height: 844, locale: "ar", theme: "dark" },
    ]) {
      test(`${kit.key}: ${mode} at ${variant.width}px ${variant.locale} has readable native controls`, async ({
        page,
      }, info) => {
        const errors: string[] = [];
        page.on("pageerror", (error) => errors.push(error.message));
        await page.setViewportSize(variant);
        await page.addInitScript(
          (theme) => localStorage.setItem("adapttable-demo-theme", theme),
          variant.theme
        );
        await page.goto(
          `/${mode}/?kit=${kit.key}&locale=${variant.locale}&editing=off`
        );
        const root = page
          .locator('.mx-demo [data-adapttable-part="root"]')
          .first();
        await expect(root).toBeVisible();
        await expect(root).toHaveAttribute(
          "dir",
          variant.locale === "ar" ? "rtl" : "ltr"
        );
        await expect(page.locator("html")).toHaveAttribute(
          "data-theme",
          variant.theme
        );
        await expect(
          root
            .locator(
              '[data-adapttable-part="row"][data-row-id], [data-adapttable-part="card"]'
            )
            .first()
        ).toBeVisible();
        expect(
          await page.evaluate(
            () =>
              document.documentElement.scrollWidth -
              document.documentElement.clientWidth
          )
        ).toBeLessThanOrEqual(1);
        const labels = getLabels(variant.locale);
        const filters = root.getByRole("button", {
          name: labels.filters,
          exact: true,
        });
        await filters.click();
        await expect(filters).toHaveAttribute("aria-expanded", "true");
        const done = page.getByRole("button", {
          name: labels.filtersDone,
          exact: true,
        });
        await expect(done).toBeInViewport();
        await page.screenshot({
          path: info.outputPath(
            `${kit.key}-${mode}-${variant.width}-filters.png`
          ),
        });
        await page.keyboard.press("Escape");
        await expect(filters).toHaveAttribute("aria-expanded", "false");
        await expect(filters).toBeFocused();
        expect(errors).toEqual([]);
      });
    }
  }
  test(`${kit.key}: live search, lab options and feature links retain the kit and reset table queries`, async ({
    page,
  }) => {
    await page.goto(`/vue-main/?kit=${kit.key}&editing=off&theme=dark`);
    const search = page.locator(
      '.mx-demo input[data-adapttable-part="search"], .mx-demo [data-adapttable-part="search"] input'
    );
    await search.fill("Ada");
    await expect
      .poll(() => new URL(page.url()).searchParams.get("vue-live.q"))
      .toBe("Ada");
    await page.getByRole("link", { name: "Feature Lab", exact: true }).click();
    await expect
      .poll(() => new URL(page.url()).pathname)
      .toBe("/vue-all-options/");
    expect(Object.fromEntries(new URL(page.url()).searchParams)).toEqual({
      kit: kit.key,
      theme: "dark",
    });
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Every option. Your combination."
    );
    await expect(
      page.locator(
        '.mx-demo input[data-adapttable-part="search"], .mx-demo [data-adapttable-part="search"] input'
      )
    ).toHaveValue("");
    await page.getByRole("button", { name: "Configure options" }).click();
    const options = page.getByRole("dialog", { name: "Feature Lab controls" });
    await options
      .getByRole("checkbox", { name: "Summary row", exact: true })
      .check();
    await options
      .getByRole("checkbox", { name: "Row actions", exact: true })
      .check();
    await expect(options).toBeVisible();
    await options.getByRole("button", { name: "Apply options" }).click();
    await expect(
      page.locator('[data-adapttable-part="summary-row"]')
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Inspect", exact: true }).first()
    ).toBeVisible();
    await page
      .getByRole("navigation", { name: "Vue feature examples" })
      .getByRole("link", { name: "Columns", exact: true })
      .click();
    await expect
      .poll(() => new URL(page.url()).pathname)
      .toBe(`/vue/${pathOf(kit)}/columns/`);
    expect(Object.fromEntries(new URL(page.url()).searchParams)).toEqual({
      theme: "dark",
    });
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  });
}
