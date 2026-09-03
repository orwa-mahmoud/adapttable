import { expect, type Page, test } from "@playwright/test";

import { configureFeatureLab, pickAddField } from "./feature-lab";

/** Feature Lab: working recipes, guarded controls, and a real table preview. */

const ADAPTERS = [
  "mantine",
  "mui",
  "chakra",
  "antd",
  "radix",
  "base-ui",
  "shadcn",
  "tailwind",
] as const;

async function openFeatureControls(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Configure options" }).click();
  await expect(
    page.getByRole("dialog", { name: "Configure Feature Lab" })
  ).toBeVisible();
}

test("all-options page loads grouped controls and the table", async ({
  page,
}) => {
  await page.goto("/all-options/");
  const demo = page.locator("#demo");
  await expect(
    demo.locator('[data-adapter="mantine"] [data-stagger]').first()
  ).toBeVisible();
  const previewWidth = (await page.locator(".lab-preview").boundingBox())
    ?.width;
  await openFeatureControls(page);
  expect((await page.locator(".lab-preview").boundingBox())?.width).toBe(
    previewWidth
  );
  await expect(
    page.getByRole("heading", { name: "Data and chrome" })
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Structure" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Editing" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Rows" })).toBeVisible();
  await expect(
    page.getByRole("group", { name: "row structure" })
  ).toBeVisible();
  await page.getByRole("button", { name: "Close options" }).click();
  await expect(
    page.getByRole("button", { name: "Filters", exact: true }).first()
  ).toBeVisible();
  await expect(
    page.locator(".lab-recipes").getByRole("button", { name: /^Baseline/ })
  ).toBeVisible();
  await expect(
    page.locator(".lab-recipes").getByRole("button", { name: /^Editing/ })
  ).toBeVisible();
});

test("Feature Lab options open as an edge drawer and close from its backdrop", async ({
  page,
}) => {
  await page.goto("/all-options/");
  await openFeatureControls(page);

  const viewport = page.viewportSize();
  const drawer = page.getByRole("dialog", { name: "Configure Feature Lab" });
  await expect
    .poll(async () => {
      const box = await drawer.boundingBox();
      return Math.abs(
        (box?.x ?? 0) + (box?.width ?? 0) - (viewport?.width ?? 0)
      );
    })
    .toBeLessThanOrEqual(1);
  const panel = await drawer.boundingBox();
  expect(viewport).not.toBeNull();
  expect(panel).not.toBeNull();
  expect(panel?.y).toBe(0);
  expect(panel?.height).toBe(viewport?.height);

  await page.mouse.click(8, Math.round((viewport?.height ?? 0) / 2));
  await expect(drawer).toBeHidden();
  await expect(
    page.getByRole("button", { name: "Configure options" })
  ).toHaveAttribute("aria-expanded", "false");
});

test("the Rows recipe keeps every kit on screen, including Radix", async ({
  page,
}) => {
  // Radix Table.Root wraps a ScrollArea. The Rows recipe adds a reorder
  // column, which is enough for that ScrollArea to fight the wrapper's
  // overflow and crash React with "Maximum update depth exceeded".
  await page.goto("/all-options/");
  await page
    .locator(".lab-recipes")
    .getByRole("button", { name: /^Rows/ })
    .click();
  await expect(page.locator(".lab-summary strong")).toHaveText("Rows");

  for (const adapter of ADAPTERS) {
    if (adapter !== "mantine") {
      await page.getByTestId(`adapter-${adapter}`).scrollIntoViewIfNeeded();
      await page.getByTestId(`adapter-${adapter}`).click();
    }
    const table = page.locator(`[data-adapter="${adapter}"]`);
    await expect(table.locator("[data-stagger]").first()).toBeVisible();
    await expect(table.getByText("Ada Lovelace").first()).toBeVisible();
  }
});

test("Feature Lab recipes change the configuration instead of acting as labels", async ({
  page,
}) => {
  await page.goto("/all-options/");
  await page
    .locator(".lab-recipes")
    .getByRole("button", { name: /^Filters/ })
    .click();
  await page
    .locator("#demo")
    .getByRole("button", { name: "Filters", exact: true })
    .first()
    .click();
  await expect(
    page.locator('[data-adapttable-part="filter-checklist"]').last()
  ).toBeVisible();
  await expect(
    page.locator('[data-adapttable-part="filter-tree"]').last()
  ).toBeVisible();

  await page.keyboard.press("Escape");
  await page
    .locator(".lab-recipes")
    .getByRole("button", { name: /^Structure/ })
    .click();
  await openFeatureControls(page);
  await expect(
    page
      .getByRole("group", { name: "row structure" })
      .getByRole("button", { name: "Grouped", exact: true })
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page
      .getByRole("group", { name: "column groups" })
      .getByRole("button", { name: "On", exact: true })
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Close options" }).click();

  await page
    .locator(".lab-recipes")
    .getByRole("button", { name: /^Editing/ })
    .click();
  await openFeatureControls(page);
  await expect(
    page
      .getByRole("group", { name: "editing mode" })
      .getByRole("button", { name: "Cell", exact: true })
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Close options" }).click();

  await page
    .locator(".lab-recipes")
    .getByRole("button", { name: /^Rows/ })
    .click();
  await openFeatureControls(page);
  for (const group of [
    "add / delete",
    "reorder",
    "pin rows",
    "span cells",
    "extra attached to a person",
    "row style",
  ]) {
    await expect(
      page
        .getByRole("group", { name: group })
        .getByRole("button", { name: "On", exact: true })
    ).toHaveAttribute("aria-pressed", "true");
  }
  await expect(page.locator(".lab-summary strong")).toHaveText("Rows");
  await expect(page.locator(".lab-summary")).toContainText("6 row features");

  await page
    .getByRole("group", { name: "density" })
    .getByRole("button", { name: "Compact", exact: true })
    .click();
  await expect(page.locator(".lab-summary strong")).toHaveText("Custom");
  await expect(page.locator(".lab-recipe.is-on")).toHaveCount(0);
});

test("Feature Lab disables combinations the data model cannot honor", async ({
  page,
}) => {
  await page.goto("/all-options/");
  await page
    .locator(".lab-recipes")
    .getByRole("button", { name: /^Rows/ })
    .click();
  await openFeatureControls(page);
  await page
    .getByRole("group", { name: "row structure" })
    .getByRole("button", { name: "Grouped", exact: true })
    .click();
  await expect(
    page
      .getByRole("group", { name: "pin rows" })
      .getByRole("button", { name: "On", exact: true })
  ).toBeDisabled();
  await expect(
    page
      .getByRole("group", { name: "pin rows" })
      .getByRole("button", { name: "Off", exact: true })
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page
      .getByRole("group", { name: "reorder" })
      .getByRole("button", { name: "On", exact: true })
  ).toBeEnabled();

  await page
    .getByRole("group", { name: "data source" })
    .getByRole("button", { name: "Backend", exact: true })
    .click();
  await expect(
    page
      .getByRole("group", { name: "editing mode" })
      .getByRole("button", { name: "Cell", exact: true })
  ).toBeDisabled();
  await expect(
    page
      .getByRole("group", { name: "add / delete" })
      .getByRole("button", { name: "On", exact: true })
  ).toBeDisabled();
});

test("Feature Lab controls fit a 320px phone without page overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto("/all-options/");
  await expect(
    page.locator('[data-adapter="mantine"] [data-stagger]').first()
  ).toBeVisible();
  await openFeatureControls(page);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth
    )
  ).toBe(true);
});

test("Feature Lab stays contained on mobile in dark mode across every kit", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/all-options/");
  await expect(
    page.locator('[data-adapter="mantine"] [data-stagger]').first()
  ).toBeVisible();
  await page.getByRole("button", { name: "Toggle dark mode" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page
    .locator(".lab-recipes")
    .getByRole("button", { name: /^Filters/ })
    .click();

  for (const adapter of ADAPTERS) {
    if (adapter !== "mantine") {
      await page.getByTestId(`adapter-${adapter}`).click();
    }
    const table = page.locator(`[data-adapter="${adapter}"]`);
    await expect(table.locator("[data-stagger]").first()).toBeVisible();
    await expect(table.getByRole("list", { name: "Data table" })).toBeVisible();
    const trigger = table
      .getByRole("button", { name: "Filters", exact: true })
      .first();
    await trigger.click();
    await expect(
      page.locator('[data-adapttable-part="filters-form"]').last()
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth
      )
    ).toBe(true);
    await page.keyboard.press("Escape");
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
  }
});

test("the docked pivot builder pivots the Lab's own table", async ({
  page,
}) => {
  // What the side panel is FOR: a builder beside the rows it changes. The Lab
  // used to dock a paragraph about what could go there, which demonstrated
  // nothing — this drives the real panel and reads the result off the table.
  await page.goto("/all-options/");
  await configureFeatureLab(page, "side panel", "On");

  const panel = page.locator('[data-adapttable-part="side-panel"]').first();
  await expect(panel).toBeVisible();
  await panel.getByRole("tab", { name: "Pivot" }).click();
  const zones = panel.locator('[data-adapttable-part="pivot-zone"]');
  await expect(zones).toHaveCount(3);

  // Team down the side, budget in the cells — the smallest pivot there is.
  const addTo = async (zone: string, field: string) => {
    await pickAddField(page, panel.getByRole("group", { name: zone }), field);
  };
  await addTo("Rows", "Team");
  await addTo("Measures", "Budget");

  // The Lab's rows are now that pivot, with its grand total — and the builder
  // is still docked beside it, which is the only way back.
  const pivot = page.getByTestId("pivot-table");
  await expect(pivot).toBeVisible();
  await expect(
    pivot.locator('tbody [data-column-key="pivot-row"]').first()
  ).not.toBeEmpty();
  await expect(pivot.getByText("Grand total")).toBeVisible();
  await expect(
    panel.locator('[data-adapttable-part="pivot-panel"]')
  ).toBeVisible();
});

test("the docked views panel manages the table's saved views", async ({
  page,
}) => {
  await page.goto("/all-options/");
  await configureFeatureLab(page, "side panel", "On");

  const panel = page.locator('[data-adapttable-part="side-panel"]').first();
  await panel.getByRole("tab", { name: "Views" }).click();

  // The real panel, wired to the same store the toolbar's Views menu reads.
  await expect(
    panel.locator('[data-adapttable-part="saved-views-panel"]')
  ).toBeVisible();
});

test("the formula column toggle holds on both data tiers", async ({ page }) => {
  await page.goto("/all-options/");
  await configureFeatureLab(page, "formula column", "On");

  // `=UPPER(team) & " · " & role`, computed per row from fields the rows carry
  // on either tier — which is why the toggle needs no guard.
  const cell = (kit: string) =>
    page.locator(`#demo [data-adapter="${kit}"] tbody [data-column-key="tag"]`);
  await expect(cell("mantine").first()).toHaveText("CORE · Engineer");

  await configureFeatureLab(page, "data source", "Backend");
  await expect(cell("mantine").first()).toHaveText("CORE · Engineer");
});
