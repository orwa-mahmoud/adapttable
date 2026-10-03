/** Main/lab are actual Angular modes, with stateful same-document kit changes. */
import { expect, type Page, test, type TestInfo } from "@playwright/test";

import { ANGULAR_KITS, angularPart } from "./angular-kit";

/** Keep production browser views with the report for visual review. */
async function attachView(page: Page, testInfo: TestInfo, name: string) {
  if (testInfo.project.name !== "chromium") return;
  await testInfo.attach(name, {
    body: await page.screenshot({ fullPage: true, animations: "disabled" }),
    contentType: "image/png",
  });
}

for (const kit of ANGULAR_KITS) {
  test(`${kit.key}: an invalid edit survives a blocked kit transition`, async ({
    page,
  }) => {
    await page.goto(`/angular-main/?kit=${kit.key}&editing=on`);
    const cell = page
      .locator('[data-adapttable-part="row"]')
      .first()
      .locator('[data-adapttable-part="cell"]')
      .first();
    await cell.dblclick();
    const editor = page.locator('[data-adapttable-part="edit-cell-editor"]');
    await editor.fill("");
    const next = ANGULAR_KITS.find((candidate) => candidate.key !== kit.key)!;
    await page.getByRole("radio", { name: next.label, exact: true }).click();
    await expect(
      page.getByRole("alertdialog", { name: "Finish editing before switching" })
    ).toBeVisible();
    expect(new URL(page.url()).searchParams.get("kit")).toBe(kit.key);
    await expect(page.locator(`[data-adapter="${kit.key}"]`)).toBeVisible();
    await page
      .getByRole("button", { name: "Return to editing", exact: true })
      .click();
    await expect(editor).toHaveValue("");
    await editor.press("Escape");
    await expect(editor).toHaveCount(0);
    await expect(cell).toContainText("Ada Lovelace");
    await page.getByRole("radio", { name: next.label, exact: true }).check();
    await expect(page.locator(`[data-adapter="${next.key}"]`)).toBeVisible();
    await expect(cell).toContainText("Ada Lovelace");
  });
  test(`${kit.key}: compact and full-options modes mount the real table`, async ({
    page,
  }, testInfo) => {
    for (const mode of ["angular-main", "angular-all-options"]) {
      await page.goto(`/${mode}/?kit=${kit.key}`);
      await expect(page.locator(`[data-adapter="${kit.key}"]`)).toBeVisible();
      await expect(
        page.locator('[data-adapttable-part="row"]').first()
      ).toBeVisible();
      await expect(
        page.getByRole("radio", { name: kit.label, exact: true })
      ).toBeChecked();
      await expect(
        page.getByRole("combobox", { name: "Framework", exact: true })
      ).toHaveValue("angular");
      await attachView(page, testInfo, `${kit.key}-${mode}`);
      if (mode === "angular-all-options") {
        await page
          .getByRole("button", { name: "Configure options", exact: true })
          .click();
        await expect(
          page.getByRole("dialog", { name: "Feature Lab controls" })
        ).toBeVisible();
        await attachView(page, testInfo, `${kit.key}-feature-lab-controls`);
        await page.keyboard.press("Escape");
        await expect(
          page.getByRole("dialog", { name: "Feature Lab controls" })
        ).not.toBeVisible();
        await page
          .getByRole("button", { name: "Configure options", exact: true })
          .click();
        await page.getByRole("button", { name: "Done", exact: true }).click();
        await expect(
          page.getByRole("dialog", { name: "Feature Lab controls" })
        ).not.toBeVisible();
      }
    }
  });
}

test("live kit switching preserves filtered rows without replacing the document", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await page.goto("/angular-main/?kit=unstyled");
  const search = page.locator('[data-adapttable-part="search"]');
  await search.fill("Ada");
  await expect(page.locator('[data-adapttable-part="row"]')).toHaveCount(1);
  await page.evaluate(() =>
    Reflect.set(window, "__angularDocumentMarker", "same document")
  );
  for (const kit of ANGULAR_KITS) {
    await page.getByRole("radio", { name: kit.label, exact: true }).check();
    await expect(page.locator(`[data-adapter="${kit.key}"]`)).toBeVisible();
    await expect(search).toHaveValue("Ada");
    await expect(page.locator('[data-adapttable-part="row"]')).toHaveCount(1);
    expect(
      await page.evaluate(() => Reflect.get(window, "__angularDocumentMarker"))
    ).toBe("same document");
  }
});

test("lab dataset changes retain the document, modal, and browser history", async ({
  page,
}) => {
  const dataset = page.getByRole("combobox", {
    name: "Dataset",
    exact: true,
    // Forward restores the entry where Escape closed the options dialog.
    includeHidden: true,
  });
  await page.goto("/angular-all-options/?kit=unstyled");
  await page.evaluate(() =>
    Reflect.set(window, "__angularDocumentMarker", "same document")
  );
  await page
    .getByRole("button", { name: "Configure options", exact: true })
    .click();
  await expect(dataset).toBeVisible();
  await dataset.selectOption("empty");
  await expect(
    page.getByRole("dialog", { name: "Feature Lab controls" })
  ).toBeVisible();
  await expect(page.locator('[data-adapttable-part="row"]')).toHaveCount(0);
  await dataset.selectOption("people");
  await expect(
    page.locator('[data-adapttable-part="row"]').first()
  ).toBeVisible();
  expect(
    await page.evaluate(() => Reflect.get(window, "__angularDocumentMarker"))
  ).toBe("same document");
  await page.keyboard.press("Escape");
  await page.goBack();
  await expect(dataset).toHaveValue("empty");
  await expect(page.locator('[data-adapttable-part="row"]')).toHaveCount(0);
  await page.goForward();
  await expect(dataset).toHaveValue("people");
  await expect(
    page.locator('[data-adapttable-part="row"]').first()
  ).toBeVisible();
  expect(
    await page.evaluate(() => Reflect.get(window, "__angularDocumentMarker"))
  ).toBe("same document");
});

test("Material typography keeps a sans-serif fallback in tables and native portals", async ({
  page,
}) => {
  for (const mode of ["angular-main", "angular-all-options"]) {
    await page.goto(`/${mode}/?kit=material`);
    const surface = page.locator('[data-adapter="material"]');
    const material = { key: "material" };
    const filters = angularPart(material, page, "filters-button", surface);
    for (const theme of ["light", "dark"]) {
      if (theme === "dark")
        await page
          .getByRole("button", { name: "Dark mode", exact: true })
          .click();
      for (const control of [
        surface.locator("tbody td").first(),
        surface.locator('[data-adapttable-part="search"]'),
        filters,
        angularPart(material, page, "page-next", surface),
      ]) {
        await expect(control).toHaveCSS("font-family", /sans-serif/);
      }
      await filters.click();
      const popup = angularPart(material, page, "filters-popover");
      await expect(popup).toBeVisible();
      await expect(
        popup.locator("input.mat-mdc-input-element").first()
      ).toHaveCSS("font-family", /sans-serif/);
      await page.keyboard.press("Escape");
      await expect(popup).toBeHidden();
    }
    await page.getByRole("button", { name: "Light mode", exact: true }).click();
    await page.getByRole("radio", { name: "Unstyled", exact: true }).check();
    await page
      .getByRole("radio", { name: "Angular Material", exact: true })
      .check();
    await expect(surface.locator("tbody td").first()).toHaveCSS(
      "font-family",
      /sans-serif/
    );
  }
});
