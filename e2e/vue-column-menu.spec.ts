import { expect, type Locator, type Page, test } from "@playwright/test";
const PREVIEW = "/vue/unstyled/column-menu/";
const part = (name: string): string => `[data-adapttable-part="${name}"]`;
const tableOf = (page: Page): Locator =>
  page.locator('[data-demo-table="columns"]');
const panelOf = (page: Page): Locator =>
  tableOf(page).locator(part("column-menu-panel"));
function rowOf(page: Page, name: string): Locator {
  return panelOf(page)
    .locator(part("column-menu-item"))
    .filter({
      has: page
        .locator(part("column-menu-label"))
        .filter({ hasText: new RegExp(`^${name}$`) }),
    });
}
async function open(page: Page): Promise<void> {
  const trigger = tableOf(page).locator(part("column-menu-button"));
  if ((await trigger.getAttribute("aria-expanded")) !== "true")
    await trigger.click();
  await expect(panelOf(page)).toBeVisible();
}
async function rename(
  page: Page,
  previous: string,
  next: string
): Promise<void> {
  await open(page);
  await rowOf(page, previous).locator(part("column-menu-more")).click();
  await rowOf(page, previous)
    .getByRole("button", { name: "Rename column", exact: true })
    .click();
  await panelOf(page).locator(part("column-rename-input")).fill(next);
  await panelOf(page).locator(part("column-rename-input")).press("Enter");
}
async function layoutState(page: Page): Promise<unknown> {
  return JSON.parse(
    await page
      .getByRole("status", { name: "Layout state", exact: true })
      .innerText()
  );
}

test("Vue native columns request visibility, pin, keyboard order and rename against one controlled layout", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(PREVIEW);
  await open(page);
  await rowOf(page, "Team").locator(part("column-menu-visibility")).click();
  await expect
    .poll(() => layoutState(page))
    .toMatchObject({ hidden: ["team"] });
  await expect(tableOf(page).locator('th[data-column-key="team"]')).toHaveCount(
    0
  );
  await rowOf(page, "Name").locator(part("column-menu-pin")).click();
  await expect
    .poll(() => layoutState(page))
    .toMatchObject({ pinned: { name: "start" } });
  await rowOf(page, "Score").locator(part("column-menu-grip")).press("ArrowUp");
  await expect
    .poll(() => layoutState(page))
    .toMatchObject({ order: ["name", "score", "team"] });
  await rename(page, "Name", "  Display name  ");
  await expect
    .poll(() => layoutState(page))
    .toMatchObject({ names: { name: "Display name" } });
  await expect(
    tableOf(page).locator('th[data-column-key="name"]')
  ).toContainText("Display name");
  await expect(rowOf(page, "Display name")).toBeVisible();
  await expect(
    page.getByRole("status", { name: "Rename requests", exact: true })
  ).toContainText('"name":"Display name"');
  expect(errors).toEqual([]);
});

test("Vue native pointer drag reorders the same controlled column layout", async ({
  page,
}) => {
  await page.goto(PREVIEW);
  await open(page);
  await rowOf(page, "Score")
    .locator(part("column-menu-grip"))
    .dragTo(rowOf(page, "Name").locator(part("column-menu-grip")));
  await expect
    .poll(() => layoutState(page))
    .toMatchObject({ order: ["score", "name", "team"] });
  await expect(
    tableOf(page).locator("thead th[data-column-key]").first()
  ).toHaveAttribute("data-column-key", "score");
});

test("Vue native rejected layout requests leave hide, pin, order and name unchanged", async ({
  page,
}) => {
  await page.goto(PREVIEW);
  await page
    .getByRole("checkbox", { name: "Accept layout requests", exact: true })
    .uncheck();
  await open(page);
  await rowOf(page, "Team").locator(part("column-menu-visibility")).click();
  await rowOf(page, "Name").locator(part("column-menu-pin")).click();
  await rowOf(page, "Score").locator(part("column-menu-grip")).press("ArrowUp");
  await rename(page, "Name", "Rejected name");
  await expect
    .poll(() => layoutState(page))
    .toEqual({
      order: ["name", "team", "score"],
      hidden: [],
      pinned: {},
      widths: {},
    });
  await expect(
    tableOf(page).locator('th[data-column-key="name"]')
  ).toContainText("Name");
  await expect(
    rowOf(page, "Name").locator(part("column-menu-visibility"))
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("status", { name: "Layout requests", exact: true })
  ).toContainText("Rejected name");
});

test("Vue native column-menu Escape and focus compose with inline validation and dismissal", async ({
  page,
}) => {
  await page.goto(PREVIEW);
  const trigger = tableOf(page).locator(part("column-menu-button"));
  await trigger.press("ArrowDown");
  await expect(panelOf(page).locator(part("column-menu-search"))).toBeFocused();
  await rowOf(page, "Name").locator(part("column-menu-more")).click();
  const renameAction = rowOf(page, "Name").getByRole("button", {
    name: "Rename column",
    exact: true,
  });
  await renameAction.click();
  const input = panelOf(page).locator(part("column-rename-input"));
  await input.fill(" ");
  await input.press("Enter");
  await expect(input).toHaveAttribute("aria-invalid", "true");
  await expect(
    panelOf(page).locator(part("column-rename-error"))
  ).toHaveAttribute("role", "alert");
  await input.press("Escape");
  await expect(renameAction).toBeFocused();
  await renameAction.press("Escape");
  await expect(
    rowOf(page, "Name").locator(part("column-menu-more"))
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  await open(page);
  await page.getByRole("heading", { name: "Vue native column menu" }).click();
  await expect(panelOf(page)).toHaveCount(0);
});

test("Vue native RTL keyboard ordering and localized menu stay usable with mobile cards", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(PREVIEW);
  await page
    .getByRole("checkbox", { name: "Arabic / right to left", exact: true })
    .check();
  await page
    .getByRole("checkbox", { name: "Mobile cards", exact: true })
    .check();
  await expect(tableOf(page).locator(part("cards"))).toBeVisible();
  await expect(tableOf(page).locator("table")).toHaveCount(0);
  await open(page);
  await expect(panelOf(page)).toHaveAttribute("dir", "rtl");
  await expect(
    panelOf(page).locator(part("column-menu-search"))
  ).not.toHaveAttribute("aria-label", "Search columns");
  await rowOf(page, "Score")
    .locator(part("column-menu-grip"))
    .press("ArrowRight");
  await expect
    .poll(() => layoutState(page))
    .toMatchObject({ order: ["name", "score", "team"] });
  await rowOf(page, "Team").locator(part("column-menu-visibility")).click();
  await expect(
    tableOf(page)
      .locator(part("card-label"))
      .filter({ hasText: /^Team$/ })
  ).toHaveCount(0);
  const bounds = await panelOf(page).boundingBox();
  if (!bounds) throw new Error("Columns panel has no visible bounds");
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(390);
});

test("Vue native menu follows source and options replacements and removes the optional feature", async ({
  page,
}) => {
  await page.goto(PREVIEW);
  await open(page);
  await page
    .getByRole("checkbox", { name: "Replace source", exact: true })
    .check();
  await expect(tableOf(page)).toContainText("Cal");
  await expect(tableOf(page)).not.toContainText("Ada");
  await page
    .getByRole("checkbox", { name: "Replace options", exact: true })
    .check();
  await open(page);
  await expect(
    rowOf(page, "Team").locator(part("column-menu-visibility"))
  ).toBeDisabled();
  await expect(
    rowOf(page, "Team").locator(part("column-menu-pin"))
  ).toBeDisabled();
  await rowOf(page, "Score").locator(part("column-menu-more")).click();
  await rowOf(page, "Score")
    .getByRole("button", { name: "Sort ascending", exact: true })
    .click();
  await expect(
    page.getByRole("status", { name: "Source sort states", exact: true })
  ).toContainText('"second":{"by":"score","dir":"asc"}');
  await rename(page, "Person name", "Fresh callback");
  await expect(
    page.getByRole("status", { name: "Rename requests", exact: true })
  ).toContainText('"host":"replacement"');
  await expect(
    page.getByRole("status", { name: "Layout requests", exact: true })
  ).toContainText('"host":"replacement"');
  await page
    .getByRole("checkbox", { name: "Columns menu enabled", exact: true })
    .uncheck();
  await expect(tableOf(page).locator(part("column-menu-button"))).toHaveCount(
    0
  );
  await expect(tableOf(page).locator(part("header-rename-button"))).toHaveCount(
    0
  );
  await page
    .getByRole("checkbox", { name: "Columns menu enabled", exact: true })
    .check();
  await open(page);
  await expect(rowOf(page, "Fresh callback")).toBeVisible();
});

test("a Vue kit with an unfilled required menu slot fails visibly without native fallback", async ({
  page,
}) => {
  await page.goto(PREVIEW);
  await page
    .getByRole("button", { name: "Toggle incomplete kit", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    'requires the adapter control slot "column-menu"'
  );
  await expect(tableOf(page).locator(part("column-menu-button"))).toHaveCount(
    0
  );
  await expect(tableOf(page).locator(part("column-menu-panel"))).toHaveCount(0);
});
