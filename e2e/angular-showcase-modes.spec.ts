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
  test(`${kit.key}: pinned summaries render complete derived fields and keep the options drawer open`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    await page.goto(`/angular-all-options/?kit=${kit.key}`);
    await page
      .getByRole("button", { name: "Configure options", exact: true })
      .click();
    const panel = page.getByRole("dialog", {
      name: "Feature Lab controls",
      exact: true,
    });
    const summary = panel.getByRole("checkbox", {
      name: "Pinned summary rows",
      exact: true,
    });
    await summary.check();
    await expect(summary).toBeChecked();
    await expect(panel).toBeVisible();
    const row = page.locator('[data-adapttable-part="pinned-summary-bottom"]');
    await expect(row).toContainText("Portfolio total");
    await expect(row).not.toContainText("NaN");
    await expect(row).not.toContainText("Invalid Date");
    await summary.uncheck();
    await expect(row).toHaveCount(0);
    await expect(panel).toBeVisible();
    expect(errors).toEqual([]);
  });

  test(`${kit.key}: clean batch mode can change while pending batch edits stay protected`, async ({
    page,
  }) => {
    await page.goto(`/angular-all-options/?kit=${kit.key}&editing-mode=batch`);
    const batchFields = page.locator(
      '[data-adapttable-part="batch-edit-cell"] [data-adapttable-part="edit-cell-editor"]'
    );
    await expect(batchFields.first()).toBeVisible();
    await expect(
      page.locator('[data-adapttable-part="batch-edit-bar"]')
    ).toHaveCount(0);
    await page
      .getByRole("button", { name: "Configure options", exact: true })
      .click();
    const mode = page.getByRole("combobox", {
      name: "Editing mode",
      exact: true,
    });
    await mode.selectOption("off");
    await expect(mode).toHaveValue("off");
    await expect(batchFields).toHaveCount(0);
    await expect(page.getByRole("alertdialog")).toHaveCount(0);
    await mode.selectOption("batch");
    await page.getByRole("button", { name: "Done", exact: true }).click();
    await batchFields.first().fill("Draft name");
    await expect(
      page.locator('[data-adapttable-part="batch-edit-bar"]')
    ).toBeVisible();
    const next = ANGULAR_KITS.find((candidate) => candidate.key !== kit.key)!;
    await page.getByRole("radio", { name: next.label, exact: true }).click();
    await expect(
      page.getByRole("alertdialog", { name: "Finish editing before switching" })
    ).toBeVisible();
    expect(new URL(page.url()).searchParams.get("kit")).toBe(kit.key);
    await page
      .getByRole("button", { name: "Return to editing", exact: true })
      .click();
    await expect(batchFields.first()).toHaveValue("Draft name");
    await page.locator('[data-adapttable-part="batch-edit-cancel"]').click();
    await expect(batchFields.first()).toHaveValue("Ada Lovelace");
    await page.getByRole("radio", { name: next.label, exact: true }).check();
    await expect(page.locator(`[data-adapter="${next.key}"]`)).toBeVisible();
    await expect(page.getByRole("alertdialog")).toHaveCount(0);
  });

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
      const themeToggle = page.getByRole("button", {
        name: "Toggle dark mode",
        exact: true,
      });
      if (theme === "dark") await themeToggle.click();
      await expect(themeToggle).toHaveAttribute(
        "aria-pressed",
        String(theme === "dark")
      );
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
    const themeToggle = page.getByRole("button", {
      name: "Toggle dark mode",
      exact: true,
    });
    await themeToggle.click();
    await expect(themeToggle).toHaveAttribute("aria-pressed", "false");
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

for (const kit of ANGULAR_KITS) {
  test(`${kit.key}: phone modes and the full lab drawer remain usable`, async ({
    page,
  }, testInfo) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(() => {
      localStorage.setItem("adapttable-demo-theme", "light");
    });
    const next = ANGULAR_KITS.find((candidate) => candidate.key !== kit.key)!;
    for (const mode of ["angular-main", "angular-all-options"]) {
      await page.goto(`/${mode}/?kit=${kit.key}`);
      const surface = page.locator(`[data-adapter="${kit.key}"]`);
      await expect(surface).toBeVisible();
      // The shared 768px breakpoint automatically renders cards at 390px.
      const cards = surface.locator('[data-adapttable-part="card"]');
      await expect(cards).toHaveCount(10);
      await expect(surface.locator('[data-adapttable-part="row"]')).toHaveCount(
        0
      );
      await expect(cards.first()).toBeVisible();
      await expect(
        cards.first().locator('[data-adapttable-part="card-value"]').first()
      ).toHaveText("Ada Lovelace");
      await expect(
        cards.first().locator('[data-adapttable-part="card-label"]')
      ).toHaveText(["Team", "Status", "Timeline", "Budget", "Load"]);
      // Table scrolling is allowed; the document itself must fit the phone.
      await expect
        .poll(() =>
          page.evaluate(
            () =>
              document.documentElement.scrollWidth -
              document.documentElement.clientWidth
          )
        )
        .toBeLessThanOrEqual(1);
      const framework = page.getByRole("combobox", {
        name: "Framework",
        exact: true,
      });
      await framework.scrollIntoViewIfNeeded();
      await expect(framework).toBeInViewport();
      await expect(framework).toBeEnabled();
      await expect(framework).toHaveValue("angular");
      await expect(framework.locator("option")).toHaveText([
        "React",
        "Angular",
      ]);
      await framework.focus();
      await expect(framework).toBeFocused();
      await framework.press("Tab");
      await expect(
        page.getByRole("button", { name: "Toggle dark mode", exact: true })
      ).toBeFocused();
      // Exercise a real provider change through the phone's kit controls.
      await page.getByRole("radio", { name: next.label, exact: true }).check();
      await expect(page.locator(`[data-adapter="${next.key}"]`)).toBeVisible();
      await page.getByRole("radio", { name: kit.label, exact: true }).check();
      await expect(surface).toBeVisible();
      await expect(
        page.getByRole("radio", { name: kit.label, exact: true })
      ).toBeChecked();
      await expect(cards).toHaveCount(10);
      await expect(
        cards.first().locator('[data-adapttable-part="card-value"]').first()
      ).toHaveText("Ada Lovelace");
      await attachView(page, testInfo, `${kit.key}-${mode}-phone`);
      if (mode !== "angular-all-options") continue;

      const configure = page.getByRole("button", {
        name: "Configure options",
        exact: true,
      });
      const dialog = page.getByRole("dialog", { name: "Feature Lab controls" });
      await configure.click();
      await expect(dialog).toBeVisible();
      await expect
        .poll(() =>
          dialog.evaluate(
            (element) => element.scrollWidth - element.clientWidth
          )
        )
        .toBeLessThanOrEqual(1);
      await attachView(page, testInfo, `${kit.key}-phone-lab-controls-top`);
      const finalControl = dialog.getByRole("checkbox", {
        name: "Mobile cards",
        exact: true,
      });
      await expect(finalControl).toBeEnabled();
      const scrollExtent = await dialog.evaluate(
        (element) => element.scrollHeight - element.clientHeight
      );
      expect(scrollExtent).toBeGreaterThan(0);
      await dialog.hover();
      await page.mouse.wheel(0, scrollExtent);
      await expect
        .poll(() =>
          dialog.evaluate(
            (element) =>
              element.scrollHeight - element.clientHeight - element.scrollTop
          )
        )
        .toBeLessThanOrEqual(1);
      await expect(finalControl).toBeVisible();
      await expect(finalControl).toBeInViewport({ ratio: 1 });
      await finalControl.focus();
      await expect(finalControl).toBeFocused();
      await attachView(page, testInfo, `${kit.key}-phone-lab-controls-bottom`);
      // Done is in the header; clicking it scrolls back only after bottom evidence.
      await dialog.getByRole("button", { name: "Done", exact: true }).click();
      await expect(dialog).toBeHidden();
      await configure.click();
      await expect(dialog).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(dialog).toBeHidden();
      await expect(surface).toBeVisible();
    }
  });
}
