import { expect, test } from "@playwright/test";

import { builtAdapters } from "../apps/showcase/matrix.mjs";

for (const kit of builtAdapters("vue")) {
  test(`${kit.key}: editable values stay readable to assistive technology`, async ({
    page,
  }) => {
    await page.goto(`/vue-main/?kit=${kit.key}`);
    // The Person value reads the name, then the role the kit draws under it.
    const value = page.getByRole("button", { name: /^Ada Lovelace/ });
    await expect(value).toBeVisible();
    await expect(value).toHaveAccessibleDescription("Edit cell");
    await value.press("F2");
    const editor = page.getByRole("textbox", {
      name: "Edit cell",
      exact: true,
    });
    await expect(editor).toHaveValue("Ada Lovelace");
    await editor.press("Escape");
    await expect(value).toBeFocused();
    await page.setViewportSize({ width: 390, height: 844 });
    const heading = page
      .locator('[data-adapttable-part="card-row"]')
      .filter({ has: value });
    await expect(heading).toHaveCSS("display", "block");
    await expect(
      heading.locator('[data-adapttable-part="card-label"]')
    ).toBeHidden();
    const geometry = await heading.evaluate((element) => {
      const row = element.getBoundingClientRect();
      const value = element
        .querySelector('[data-adapttable-part="card-value"]')!
        .getBoundingClientRect();
      return { width: row.width - value.width, offset: value.left - row.left };
    });
    expect(Math.abs(geometry.width)).toBeLessThanOrEqual(2);
    expect(Math.abs(geometry.offset)).toBeLessThanOrEqual(2);
  });
}

for (const kit of [
  "unstyled",
  "aria",
  "angular-cdk",
  "ng-bootstrap",
  "ngx-bootstrap",
  "spartan",
  "taiga-ui",
]) {
  test(`${kit}: Angular editable cells retain a visible keyboard focus indicator`, async ({
    page,
  }) => {
    await page.goto(`/angular-main/?kit=${kit}`);
    const value = page.getByRole("button", { name: /^Ada Lovelace/ });
    await value.press("Escape");
    await expect(value).toBeFocused();
    const outline = await value.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        style: style.outlineStyle,
        width: Number.parseFloat(style.outlineWidth),
      };
    });
    expect(outline.style).not.toBe("none");
    expect(outline.width).toBeGreaterThan(0);
  });
}

test("Vue switches kits and options without navigation or losing committed edits", async ({
  page,
}) => {
  await page.goto("/vue-main/?kit=vue-unstyled");
  const value = page.getByRole("button", { name: /^Ada Lovelace/ });
  await value.press("F2");
  const editor = page.getByRole("textbox", { name: "Edit cell", exact: true });
  await editor.fill("Ada updated");
  await editor.press("Enter");
  const origin = await page.evaluate(() => performance.timeOrigin);
  await page
    .getByRole("button", {
      name: "Element Plus Element blue, crisp form controls",
      exact: true,
    })
    .click();
  await expect(
    page.getByText("npx @adapttable/cli init --kit element-plus", {
      exact: true,
    })
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /^Ada updated/ })
  ).toBeVisible();
  await page.getByRole("radio", { name: "Compact", exact: true }).check();
  await expect(
    page.locator('.mx-demo [data-adapttable-part="root"]')
  ).toHaveAttribute("data-density", "compact");
  expect(await page.evaluate(() => performance.timeOrigin)).toBe(origin);
  await page.goBack();
  await expect(
    page.locator('.mx-demo [data-adapttable-part="root"]')
  ).toHaveAttribute("data-density", "comfortable");
  await expect(
    page.getByRole("button", { name: /^Ada updated/ })
  ).toBeVisible();
});

test("Vue same-document locale changes refresh labels and direction", async ({
  page,
}) => {
  await page.goto("/vue-main/?kit=vue-unstyled");
  await page.getByRole("radio", { name: "العربية", exact: true }).check();
  await expect(
    page.locator('.mx-demo [data-adapttable-part="root"]')
  ).toHaveAttribute("dir", "rtl");
  await expect(page.getByRole("button", { name: /^آدا لوفليس/ })).toBeVisible();
  await page.getByRole("radio", { name: "English", exact: true }).check();
  await expect(
    page.locator('.mx-demo [data-adapttable-part="root"]')
  ).toHaveAttribute("dir", "ltr");
  await expect(
    page.getByRole("button", { name: /^Ada Lovelace/ })
  ).toBeVisible();
});
