/**
 * The React Mantine live demo is the reference. Vue and Angular live demos
 * drive the same controls and have to land on the same table behaviour.
 *
 * Page chrome that is a kit widget (a Mantine button versus a Quasar button)
 * is not compared. Parts, geometry, announcements, focus, URL suffixes and
 * the table's own text are.
 */
import { expect, type Page } from "@playwright/test";

import { getLabels } from "../packages/shared/i18n/src/index";

type Framework = "react" | "vue" | "angular";

const PRESENT = [
  "search",
  "column-menu-button",
  "export-csv-button",
  "selection-header",
] as const;

const ABSENT = ["undo-button", "redo-button", "fullscreen-toggle"] as const;

function liveUrl(framework: Framework, kit: string): string {
  const paths: Record<Framework, string> = {
    vue: "/vue-main/",
    angular: "/angular-main/",
    react: "/",
  };
  const url = new URL(paths[framework], "http://localhost:4321");
  url.searchParams.set("kit", kit);
  return `${url.pathname}${url.search}`;
}

async function open(
  page: Page,
  framework: Framework,
  kit: string
): Promise<void> {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(liveUrl(framework, kit));
  await page.locator('[data-adapttable-part="root"]').waitFor();
}

async function settled(page: Page): Promise<void> {
  await page.locator('[data-adapttable-part="root"]').waitFor();
}

/** Preference controls. React uses segmented buttons; the others use the demo form. */
async function choose(
  page: Page,
  framework: Framework,
  key: string,
  value: string,
  reactGroup: string,
  reactLabel: string
): Promise<void> {
  if (framework === "react") {
    await page
      .getByRole("group", { name: reactGroup })
      .getByRole("button", { name: reactLabel, exact: true })
      .click();
    await settled(page);
    return;
  }
  if (framework === "vue") {
    const radio = page.locator(`[data-demo-control="${key}-${value}"]`);
    const target =
      (await radio.count()) > 0
        ? radio
        : page.locator(`[data-demo-control="${key}"]`);
    await Promise.all([
      page.waitForURL(new RegExp(`[?&]${key}=${value}(?:&|$)`)),
      (await radio.count()) > 0 ? radio.click() : target.selectOption(value),
    ]);
  } else {
    const radio = page.locator(`input[name="${key}"][value="${value}"]`);
    await Promise.all([
      page.waitForURL(new RegExp(`[?&]${key}=${value}(?:&|$)`)),
      (await radio.count()) > 0
        ? radio.click()
        : page.locator(`[data-demo-control="${key}"]`).selectOption(value),
    ]);
  }
  await settled(page);
}

async function toggle(
  page: Page,
  framework: Framework,
  key: string,
  reactGroup: string,
  reactLabel: string
): Promise<void> {
  if (framework === "react") {
    await page
      .getByRole("group", { name: reactGroup })
      .getByRole("button", { name: reactLabel, exact: true })
      .click();
  } else {
    const value = reactLabel === "Off" ? "off" : "on";
    await Promise.all([
      page.waitForURL(new RegExp(`[?&]${key}=${value}(?:&|$)`)),
      page.locator(`[data-demo-control="${key}"]`).click(),
    ]);
  }
  await settled(page);
}

function root(page: Page) {
  return page.locator('[data-adapttable-part="root"]');
}

/** The first body cell. Density changes its padding, so its box has to shrink. */
async function cellHeight(page: Page): Promise<number> {
  return page.evaluate(() => {
    const cell = document.querySelector('[data-adapttable-part="cell"]');
    return cell?.getBoundingClientRect().height ?? 0;
  });
}

/** URL state shares a suffix (`q`, `sortBy`, `page`); the namespace differs by page. */
async function expectUrlSuffix(
  page: Page,
  suffix: string,
  value: RegExp
): Promise<void> {
  await expect
    .poll(() => page.url())
    .toMatch(new RegExp(`[?&][^&]*${suffix}=${value.source}`));
}

export async function assertLiveDemo(
  page: Page,
  framework: Framework,
  kit: string
): Promise<void> {
  await open(page, framework, kit);
  const table = root(page);

  for (const part of PRESENT) {
    await expect(
      table.locator(`[data-adapttable-part="${part}"]`).first()
    ).toBeVisible();
  }
  for (const part of ABSENT) {
    await expect(page.locator(`[data-adapttable-part="${part}"]`)).toHaveCount(
      0
    );
  }
  await expect(
    table.getByRole("button", { name: "Saved views" })
  ).toBeVisible();
  await expect(table.getByRole("button", { name: "Export CSV" })).toBeVisible();
  await expect(table.getByRole("button", { name: "Columns" })).toBeVisible();
  await expect(table.getByRole("button", { name: "Filters" })).toBeVisible();
  await expect(
    table.getByRole("button", { name: "Edit", exact: true }).first()
  ).toBeVisible();
  await expect(
    table.getByRole("button", { name: "Delete", exact: true }).first()
  ).toBeVisible();
  await expect(
    table.getByRole("button", { name: "Sort by: Person" })
  ).toBeVisible();
  await expect(
    table.getByRole("button", { name: "Sort by: Team" })
  ).toHaveCount(0);
  await expect(table.locator('[data-adapttable-part="row"]')).toHaveCount(5);
  await expect(table).toContainText("Ada Lovelace");
  await expect(table).toContainText(getLabels("en").rowsPerPage);
  await expect(
    page.locator('[data-adapttable-part="column-menu-item"]')
  ).toHaveCount(0);
  await expect(
    page.locator('[data-adapttable-part="filter-field"]')
  ).toHaveCount(0);

  const comfortable = await cellHeight(page);
  await choose(page, framework, "density", "compact", "density", "Compact");
  if (framework !== "react") {
    await expect(root(page)).toHaveAttribute("data-density", "compact");
  }
  const compact = await cellHeight(page);
  expect(comfortable > 0 && compact > 0 && compact < comfortable).toBe(true);

  await choose(page, framework, "locale", "ar", "locale", "العربية");
  await expect(root(page)).toHaveCSS("direction", "rtl");
  await expect(root(page)).toContainText(getLabels("ar").rowsPerPage);

  await open(page, framework, kit);
  await root(page).getByRole("button", { name: "Sort by: Person" }).click();
  await expect(
    root(page).locator('[data-adapttable-part="header-cell"]').first()
  ).toHaveAttribute("aria-sort", /asc|desc/);
  await expectUrlSuffix(page, "sortBy", /person/);
  await expect(
    root(page).locator('[data-adapttable-part="grid-announcer"]')
  ).toHaveCount(1);
  await expect(
    root(page).locator('[data-adapttable-part="table-status-announcer"]')
  ).toHaveCount(1);

  const first =
    (await root(page)
      .locator('[data-adapttable-part="row"]')
      .first()
      .textContent()) ?? "";
  await root(page).getByRole("button", { name: "Next page" }).click();
  await expectUrlSuffix(page, "page", /2/);
  await expect(
    root(page).locator('[data-adapttable-part="row"]').first()
  ).not.toHaveText(first);

  await root(page)
    .getByRole("button", { name: "Columns", exact: true })
    .click();
  const menuItem = page
    .locator('[data-adapttable-part="column-menu-item"]')
    .first();
  await expect(menuItem).toBeVisible();
  // Mantine leaves focus on the trigger. Several kits move it into the menu.
  // Either place is still inside the control the click opened.
  await expect
    .poll(() =>
      page.evaluate(() => {
        const active = document.activeElement;
        if (!active) return false;
        if (
          active.getAttribute("data-adapttable-part") === "column-menu-button"
        )
          return true;
        return Boolean(
          active.closest(
            '[data-adapttable-part="column-menu-item"], [role="dialog"], [role="menu"]'
          )
        );
      })
    )
    .toBe(true);
  await page.keyboard.press("Escape");

  const views = root(page).getByRole("button", { name: "Saved views" });
  await views.click();
  await expect
    .poll(async () => {
      const expanded = await views.getAttribute("aria-expanded");
      const menu = await page
        .getByRole("menu")
        .or(page.getByRole("dialog"))
        .count();
      return expanded === "true" || menu > 0;
    })
    .toBe(true);
  await page.keyboard.press("Escape");

  await root(page)
    .getByRole("button", { name: "Filters", exact: true })
    .click();
  await expect(
    page.locator('[data-adapttable-part="filter-field"]').first()
  ).toBeVisible();
  await page.keyboard.press("Escape");

  await choose(
    page,
    framework,
    "filters",
    "drawer",
    "filters container",
    "Drawer"
  );
  await root(page)
    .getByRole("button", { name: "Filters", exact: true })
    .click();
  await expect(
    page.locator('[data-adapttable-part="filter-field"]').first()
  ).toBeVisible();
  await page.keyboard.press("Escape");

  await open(page, framework, kit);
  const search = root(page).locator('[data-adapttable-part="search"]');
  const field = search.locator("input, textarea");
  if ((await field.count()) > 0) await field.first().fill("Ada");
  else await search.fill("Ada");
  await expectUrlSuffix(page, "q", /Ada/);
  await expect(root(page).locator('[data-adapttable-part="row"]')).toHaveCount(
    1
  );
  await expect(root(page)).toContainText("Ada Lovelace");
  await expect
    .poll(async () =>
      page
        .locator(
          '[data-adapttable-part="grid-announcer"], [data-adapttable-part="table-status-announcer"]'
        )
        .allTextContents()
    )
    .not.toEqual(["", ""]);

  await open(page, framework, kit);
  const cell = root(page)
    .locator('[data-adapttable-part="selection-cell"]')
    .first();
  const checkbox = cell.getByRole("checkbox");
  if ((await checkbox.count()) > 0 && (await checkbox.isVisible())) {
    await checkbox.click();
  } else {
    await cell.click();
  }
  await expect(page.locator('[data-adapttable-part="bulk-bar"]')).toBeVisible();

  await root(page)
    .locator('[data-adapttable-part="edit-cell-activate"]')
    .first()
    .click();
  await expect(
    page.locator('[data-adapttable-part="edit-cell-editor"]').first()
  ).toBeVisible();

  await open(page, framework, kit);
  await toggle(page, framework, "grouping", "grouping", "On");
  await expect(
    page
      .locator(
        '[data-adapttable-part="group-row"], [data-adapttable-part="group-toggle"]'
      )
      .first()
  ).toBeVisible();

  await toggle(page, framework, "motion", "motion", "Off");
  await expect(
    root(page).locator('[data-adapttable-part="row"]').first()
  ).toBeVisible();

  await page.setViewportSize({ width: 375, height: 812 });
  if (framework !== "react") {
    await choose(page, framework, "mobile", "on", "layout", "Cards");
  }
  await expect(page.locator('[data-adapttable-part="cards"]')).toBeVisible();

  await open(page, framework, kit);
  await choose(page, framework, "mode", "backend", "data source", "Backend");
  if (framework === "react") {
    await expect(
      page
        .getByRole("group", { name: "grouping" })
        .getByRole("button", { name: "On" })
    ).toBeDisabled();
    await expect(
      page
        .getByRole("group", { name: "editing" })
        .getByRole("button", { name: "On" })
    ).toBeDisabled();
  } else {
    await expect(page.locator('[data-demo-control="grouping"]')).toBeDisabled();
    await expect(page.locator('[data-demo-control="editing"]')).toBeDisabled();
  }
}
