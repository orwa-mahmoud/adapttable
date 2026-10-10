/** Native matrix pages must perform their advertised operations. */
import { expect, type Locator, type Page, test } from "@playwright/test";

import { builtAdapters, pathOf } from "../apps/showcase/matrix.mjs";

function part(page: Page, name: string): Locator {
  return page.locator(`.mx-demo [data-adapttable-part="${name}"]`);
}

async function toggleCheckbox(checkbox: Locator): Promise<void> {
  await expect(checkbox).toBeAttached();
  const label = checkbox.locator("xpath=ancestor::label").first();
  if (await label.count()) await label.click();
  else await checkbox.click();
}

async function chooseOption(
  page: Page,
  field: Locator,
  value: string,
  label: string
): Promise<void> {
  if (await field.evaluate((element) => element instanceof HTMLSelectElement)) {
    await field.selectOption(value);
  } else {
    const elementSelect = field.locator(
      "xpath=ancestor::*[contains(concat(' ', normalize-space(@class), ' '), ' el-select ')]"
    );
    const vuetifySelect = field.locator(
      "xpath=ancestor::*[contains(concat(' ', normalize-space(@class), ' '), ' v-field ')]"
    );
    if (await elementSelect.count()) await elementSelect.click();
    else if (await vuetifySelect.count()) await vuetifySelect.click();
    else await field.click();
    await page.getByRole("option", { name: label, exact: true }).click();
  }
}

for (const kit of builtAdapters("vue")) {
  for (const width of [1440, 390]) {
    test(`${kit.key}/filtering: ${width}px every layout applies, clears and restores focus`, async ({
      page,
    }, info) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`/vue/${pathOf(kit)}/filtering/?locale=en`);
      for (const layout of ["popover", "drawer", "header"]) {
        await page.getByLabel("Filter layout").selectOption(layout);
        const trigger = part(page, "filters-button");
        await expect(trigger).toBeVisible();
        await page.evaluate(() => document.fonts.ready.then(() => undefined));
        await trigger.evaluate((element) =>
          window.scrollBy({
            top: element.getBoundingClientRect().top - 300,
            behavior: "instant",
          })
        );
        await trigger.focus();
        await trigger.press("Enter");
        const surface = page.locator(
          '[data-adapttable-part="filters-popover"], [data-adapttable-part="filters-panel"]'
        );
        await expect(surface).toBeVisible();
        await info.attach(`${layout}-initial-geometry`, {
          body: JSON.stringify({
            surface: await surface.boundingBox(),
            trigger: await trigger.boundingBox(),
            width,
            height: 900,
          }),
          contentType: "application/json",
        });
        await expect
          .poll(async () => {
            const box = await surface.boundingBox();
            return (
              box !== null &&
              box.x >= 0 &&
              box.x + box.width <= width + 1 &&
              box.y >= 0 &&
              box.y + box.height <= 901
            );
          })
          .toBe(true);
        await surface
          .getByRole("textbox", { name: "Person", exact: true })
          .fill("Ada Lovelace");
        const rows = part(page, width === 390 ? "card" : "row");
        await expect(rows).toHaveCount(1);
        await expect(rows).toContainText("Ada Lovelace");
        await surface.locator('[data-adapttable-part="filters-done"]').click();
        await expect(surface).toBeHidden();
        await expect(trigger).toBeFocused();
        await expect
          .poll(() => new URL(page.url()).searchParams.get("flt.f_name"))
          .toBe("Ada Lovelace");
        await page.reload();
        await expect(rows).toHaveCount(1);
        await page.evaluate(() => document.fonts.ready.then(() => undefined));
        await trigger.evaluate((element) =>
          window.scrollBy({
            top: element.getBoundingClientRect().top - 300,
            behavior: "instant",
          })
        );
        await trigger.click();
        await expect(
          surface.getByRole("textbox", { name: "Person", exact: true })
        ).toHaveValue("Ada Lovelace");
        const screenshot = info.outputPath(
          `${kit.key}-filtering-${width}-${layout}.png`
        );
        await page.screenshot({ path: screenshot, animations: "disabled" });
        await info.attach(layout, {
          path: screenshot,
          contentType: "image/png",
        });
        await surface
          .getByRole("button", { name: "Clear all", exact: true })
          .click();
        await expect(rows).toHaveCount(25);
        await page.keyboard.press("Escape");
        await expect(surface).toBeHidden();
        await expect(trigger).toBeFocused();
      }
    });
  }
  for (const width of [1440, 390]) {
    test(`${kit.key}/formulas: ${width}px calculations survive reload and expose errors`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`/vue/${pathOf(kit)}/formulas/?locale=en`);
      const rows = part(page, width === 390 ? "card" : "row");
      const values = rows
        .first()
        .locator(
          `[data-adapttable-part="${width === 390 ? "card-value" : "cell"}"]`
        );
      await page.getByTestId("formula-name").fill("Power");
      await page.getByTestId("formula-text").fill("=POWER(2, 3)");
      await page.getByTestId("formula-add").click();
      await expect(values.last()).toHaveText("8");
      await expect
        .poll(() => new URL(page.url()).searchParams.get("fx.formula"))
        .toContain("Power");
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
      await expect(page.getByTestId("formula-columns")).toContainText(
        "Broken: =budget / 0"
      );
      await expect(
        values.locator("xpath=self::*[@data-column-key='Broken']")
      ).toHaveText("#DIV/0!");
    });

    test(`${kit.key}/realtime: ${width}px patches retain selection and row identity`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`/vue/${pathOf(kit)}/realtime/?locale=en&live=off`);
      const rows = part(page, width === 390 ? "card" : "row");
      const ada = rows.filter({ hasText: "Ada Lovelace" });
      await expect(ada).toContainText("$25,300");
      const selected = ada.getByRole("checkbox");
      await toggleCheckbox(selected);
      await expect(selected).toBeChecked();
      await page
        .getByRole("button", { name: "Apply next update", exact: true })
        .click();
      await expect(ada).toContainText("$26,300");
      await expect(selected).toBeChecked();
      await expect(page.getByTestId("patch-feed")).toHaveText(
        "Ada Lovelace: $25,300 → $26,300"
      );
      await expect(rows).toHaveCount(10);
      await page
        .getByRole("button", { name: "Resume updates", exact: true })
        .click();
      await expect(
        page.getByRole("button", { name: "Pause updates", exact: true })
      ).toHaveAttribute("aria-pressed", "true");
      await page
        .getByRole("button", { name: "Pause updates", exact: true })
        .click();
      await expect(
        page.getByRole("button", { name: "Resume updates", exact: true })
      ).toHaveAttribute("aria-pressed", "false");
    });

    test(`${kit.key}/selection: ${width}px bulk actions receive the selected ids`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`/vue/${pathOf(kit)}/selection/?locale=en`);
      const rows = part(page, width === 390 ? "card" : "row");
      const first = rows.first().getByRole("checkbox");
      await toggleCheckbox(first);
      await expect(first).toBeChecked();
      await page.getByRole("button", { name: "Export", exact: true }).click();
      await expect(page.locator("[data-demo-log]")).toHaveText("Export: 1");
      await expect(first).not.toBeChecked();
      await toggleCheckbox(first);
      await expect(first).toBeChecked();
      await page.getByRole("button", { name: "Archive", exact: true }).click();
      await expect(page.locator("[data-demo-log]")).toHaveText("Archive: 1");
      await expect(first).not.toBeChecked();
      await expect(
        page.getByRole("button", { name: "Archive", exact: true })
      ).toHaveCount(0);
    });
  }

  test(`${kit.key}/columns: native menu hides and restores a column with keyboard dismissal`, async ({
    page,
  }) => {
    await page.goto(`/vue/${pathOf(kit)}/columns/?locale=en`);
    const email = page
      .getByRole("columnheader")
      .and(page.locator('.mx-demo [data-column-key="email"]'));
    await expect(email).toHaveCount(1);
    const trigger = part(page, "column-menu-button");
    await trigger.click();
    await page
      .getByRole("button", { name: "Hide column: Email", exact: true })
      .click();
    await expect(email).toHaveCount(0);
    await page
      .getByRole("button", { name: "Show column: Email", exact: true })
      .click();
    await expect(email).toHaveCount(1);
    await page.keyboard.press("Escape");
    await expect(trigger).toBeFocused();
  });

  test(`${kit.key}/aggregation: filtering recalculates totals and preserves the pinned portfolio`, async ({
    page,
  }) => {
    await page.goto(`/vue/${pathOf(kit)}/aggregation/?locale=en`);
    const pinned = part(page, "pinned-summary-top");
    await expect(pinned).toContainText("Portfolio total");
    const portfolio = await pinned.textContent();
    await page.locator(".mx-demo").getByRole("searchbox").fill("Ada Lovelace");
    await expect(
      page.locator('.mx-demo [data-adapttable-part="row"][data-row-id]')
    ).toHaveCount(1);
    await expect(part(page, "summary-cell").last()).toHaveText("$25,300");
    await expect(part(page, "group-footer-row")).toContainText("25,300");
    await expect(pinned).toHaveText(portfolio!);
    await expect(pinned.getByRole("checkbox")).toHaveCount(0);
  });

  test(`${kit.key}/pivot: native configuration and folding survive reload`, async ({
    page,
  }) => {
    await page.goto(`/vue/${pathOf(kit)}/pivot/?locale=en`);
    const rows = page.locator(
      '.mx-demo [data-adapttable-part="row"][data-row-id] [data-adapttable-part="pivot-row-header"]'
    );
    await expect(rows).toHaveCount(5);
    const zone = page.locator('.mx-demo [data-zone="rows"]');
    await chooseOption(
      page,
      zone.getByRole("combobox", { name: "Add field", exact: true }),
      "role",
      "Role"
    );
    await expect(page.getByTestId("pivot-fold")).toHaveCount(5);
    const count = await rows.count();
    expect(count).toBeGreaterThan(5);
    const fold = page.getByTestId("pivot-fold").first();
    const caption = (await fold.textContent())!.replace(/[▶◀▼]/g, "").trim();
    await fold.click();
    await expect(fold).toHaveAttribute("aria-expanded", "false");
    await expect.poll(() => rows.count()).toBeLessThan(count);
    await expect
      .poll(() => new URL(page.url()).searchParams.get("pivot.pivot"))
      .toContain(";hide:");
    await page.reload();
    await expect(zone).toContainText("Role");
    await expect(
      page.getByTestId("pivot-fold").filter({ hasText: caption })
    ).toHaveAttribute("aria-expanded", "false");
    await zone
      .getByRole("button", { name: "Remove field: Role", exact: true })
      .click();
    await expect(rows).toHaveCount(5);
  });

  test(`${kit.key}/accessibility: keyboard movement and column selection announce real changes`, async ({
    page,
  }) => {
    await page.goto(`/vue/${pathOf(kit)}/accessibility/?locale=en`);
    await expect(part(page, "table")).toHaveAttribute("role", "grid");
    const cells = part(page, "row")
      .first()
      .locator('[data-adapttable-part="cell"]');
    await cells.first().focus();
    await page.keyboard.press("ArrowRight");
    await expect(cells.nth(1)).toBeFocused();
    await expect(part(page, "grid-announcer")).toContainText("Team");
    await expect(page.getByTestId("announcements")).toContainText("Team");
    await page.keyboard.press("End");
    await expect(cells.last()).toBeFocused();
    await page.keyboard.press("Home");
    await expect(cells.first()).toBeFocused();
    const select = part(page, "column-select").first().getByRole("checkbox");
    await toggleCheckbox(select);
    await expect(select).toBeChecked();
    await expect(page.locator(".mx-demo [data-cell-selected]")).toHaveCount(10);
  });
}
