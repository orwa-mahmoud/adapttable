import { expect, type Locator, type Page, test } from "@playwright/test";

import {
  adapterByKey,
  builtAdapters,
  featureBySlug,
  fillTemplate,
} from "../apps/showcase/matrix.mjs";

import { gotoFromFeatureGrid } from "./nav";

/**
 * The grouping page across every kit.
 *
 * Group headers, their counts and the collapse toggle are chrome each adapter
 * renders with its own controls, so a kit that draws none of it fails silently
 * — the table still shows rows, just ungrouped.
 */
/**
 * The adapters whose own pages are built. Each feature page fixes its
 * kit, so the loop is over URLs rather than over clicks on a switcher
 * the page no longer needs — and it widens to the whole grid as the
 * remaining adapters' pages arrive.
 */
const KIT = builtAdapters()[0]!.key;
const ADAPTER = adapterByKey(KIT)!;
const FEATURE = featureBySlug("grouping")!;
const copy = (text: string) => fillTemplate(text, ADAPTER);
const KITS = builtAdapters().map((adapter) => adapter.key);

async function choose(
  page: Page,
  control: Locator,
  optionLabel: string
): Promise<void> {
  if ((await control.evaluate((element) => element.tagName)) === "SELECT") {
    await control.selectOption({ label: optionLabel });
    return;
  }
  await control.click();
  const option = page
    .getByRole("option", { name: optionLabel, exact: true })
    .filter({ visible: true })
    .first();
  try {
    await option.click({ timeout: 2500 });
  } catch {
    await page.keyboard.type(optionLabel);
    await page.keyboard.press("Enter");
  }
}

test("is reachable from the kit's feature grid", async ({ page }) => {
  await gotoFromFeatureGrid(page, "mantine", "Grouping");
  await expect(page).toHaveURL(/\/grouping\/$/);
});

test("answers the search phrase without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(`/${KIT}/grouping/`, { waitUntil: "domcontentloaded" });

  await expect(page).toHaveTitle(copy(FEATURE.title));
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    "content",
    copy(FEATURE.description)
  );
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    copy(FEATURE.h1)
  );
  await expect(page.locator("main")).toContainText(
    copy(FEATURE.intro[0]!).replaceAll("`", "").slice(0, 60)
  );
  await expect(page.locator("main")).toContainText("aggregation page");
  await context.close();
});

for (const kit of KITS) {
  test(`${kit}: groups rows under headers that collapse`, async ({ page }) => {
    await page.goto(`/${kit}/grouping/`);
    const root = page.locator(`[data-adapter="${kit}"]`);
    await expect(root.first()).toBeVisible();

    const headers = root.locator('[data-adapttable-part="group-label"]');
    await expect(headers.first()).toBeVisible();
    const before = await root.locator("tbody tr:visible").count();

    // Collapsing a group has to remove its rows, in every kit.
    await root.locator('[data-adapttable-part="group-toggle"]').first().click();
    await expect
      .poll(async () => root.locator("tbody tr:visible").count())
      .toBeLessThan(before);
  });

  test(`${kit}: grouping panel keeps drag, keyboard, mobile, and RTL paths equal`, async ({
    page,
  }) => {
    await page.goto(`/${kit}/grouping/`);
    const root = page.locator(`[data-adapter="${kit}"]`);
    const panel = root.locator('[data-adapttable-part="grouping-panel"]');
    await expect(panel).toBeVisible();

    const handles = panel.locator(
      '[data-adapttable-part="grouping-chip-handle"]'
    );
    await expect(handles).toHaveCount(2);
    await handles.first().focus();
    await handles.first().press("ArrowRight");
    await expect
      .poll(() => new URL(page.url()).searchParams.get("grp.groupBy"))
      .toBe("status,team");

    const personHeader = root
      .locator("thead th")
      .filter({ hasText: "Person" })
      .first();
    const firstDropZone = panel
      .locator('[data-adapttable-part="grouping-drop-zone"]')
      .first();
    if (kit === "base-ui") {
      const transfer = await page.evaluateHandle(() => new DataTransfer());
      await personHeader.dispatchEvent("dragstart", {
        dataTransfer: transfer,
      });
      await firstDropZone.dispatchEvent("dragenter", {
        dataTransfer: transfer,
      });
      await firstDropZone.dispatchEvent("dragover", {
        dataTransfer: transfer,
      });
      await firstDropZone.dispatchEvent("drop", { dataTransfer: transfer });
      await personHeader.dispatchEvent("dragend", { dataTransfer: transfer });
    } else {
      await personHeader.dragTo(firstDropZone);
    }
    await expect
      .poll(() => new URL(page.url()).searchParams.get("grp.groupBy"))
      .toBe("person,status,team");

    await root.locator('[data-adapttable-part="column-menu-button"]').click();
    const search = page
      .locator('[data-adapttable-part="column-menu-search"]')
      .locator("input")
      .or(page.locator('[data-adapttable-part="column-menu-search"]'))
      .first();
    await search.fill("Budget");
    const columnActions = page
      .locator('[data-adapttable-part="column-menu-more"]')
      .first();
    await columnActions.focus();
    await columnActions.press("Enter");
    await expect(
      page.getByText("Group by Budget", { exact: true })
    ).toBeVisible();
    const menuAggregation = page
      .getByRole("combobox", { name: "Group aggregation" })
      .last();
    await expect(menuAggregation).toBeVisible();
    if (kit === "antd") {
      await menuAggregation.click();
      await menuAggregation.press("ArrowDown");
      await menuAggregation.press("Enter");
    } else {
      await choose(page, menuAggregation, "Sum");
    }
    await expect
      .poll(() => new URL(page.url()).searchParams.get("grp.groupAgg"))
      .toContain("budget:sum");
    await page.keyboard.press("Escape");
    await page.keyboard.press("Escape");
    await page.keyboard.press("Escape");

    const mobileToggle = page.getByRole("button", { name: "Mobile selects" });
    await mobileToggle.focus();
    await mobileToggle.press("Enter");
    await expect(
      panel.locator('[data-adapttable-part="grouping-drop-zone"]')
    ).toHaveCount(0);
    await expect(
      panel.getByRole("combobox", { name: "Add grouping column" })
    ).toBeVisible();

    const desktopToggle = page.getByRole("button", {
      name: "Drag + keyboard",
    });
    await desktopToggle.focus();
    await desktopToggle.press("Enter");
    const rtlToggle = page.getByRole("button", { name: "RTL", exact: true });
    await rtlToggle.focus();
    await rtlToggle.press("Enter");
    await expect(panel).toHaveAttribute("dir", "rtl");
    const rtlFirst = handles.first();
    const firstLabel = await rtlFirst.getAttribute("aria-label");
    await rtlFirst.focus();
    await rtlFirst.press("ArrowLeft");
    await expect(handles.nth(1)).toHaveAttribute(
      "aria-label",
      firstLabel ?? ""
    );
  });
}
