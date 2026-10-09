import { expect, type Locator, type Page, test } from "@playwright/test";

import { SHOWCASE_PAGES } from "../apps/showcase/pages.mjs";

const registration = SHOWCASE_PAGES.find(
  (page) => page.key === "vue-unstyled-workspace"
);
if (!registration) throw new Error("Vue order workspace is not registered.");
const route = registration.html
  .replace(/^\.\//, "/")
  .replace(/index\.html$/, "");
const part = (name: string) => `[data-adapttable-part="${name}"]`;
const table = (page: Page, name = "orders") =>
  page.locator(`[data-workspace-table="${name}"]`);
const row = (root: Locator, id: string) =>
  root.locator(`tbody [data-row-id="${id}"]`);
async function visit(page: Page, query = ""): Promise<void> {
  const response = await page.goto(`${route}${query}`);
  expect(
    response?.status(),
    "The registered workspace route must be served."
  ).toBe(200);
  await expect(page.locator(".workspace-stage")).toHaveAttribute(
    "aria-busy",
    "false"
  );
  await expect(page.locator(".workspace-error")).toHaveCount(0);
}
async function choosePreference(
  page: Page,
  group: string,
  name: string
): Promise<void> {
  const choices = page.getByRole("group", { name: group, exact: true });
  await expect(
    choices.getByRole("button", { name, exact: true })
  ).toBeVisible();
  const choice = choices.getByRole("button", { name, exact: true });
  const native = await choice.elementHandle();
  if (!native) throw new Error("Preference choice has no native button");
  await choice.focus();
  await choice.press("Space");
  // Language changes the group's accessible name; keep checking its same node.
  await expect.poll(() => native.getAttribute("aria-pressed")).toBe("true");
  await expect
    .poll(() =>
      native.evaluate(
        (node) => node.isConnected && document.activeElement === node
      )
    )
    .toBe(true);
  expect(
    await native.evaluate(
      (node) =>
        node.parentElement?.querySelectorAll('button[aria-pressed="false"]')
          .length
    )
  ).toBe(1);
}

async function contained(page: Page): Promise<void> {
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth
    )
  ).toBeLessThanOrEqual(1);
}

async function compactAssistantLauncher(page: Page): Promise<void> {
  const launcher = table(page).locator(part("assistant-launcher"));
  await expect(launcher).toBeVisible();
  const bounds = await launcher.boundingBox();
  if (!bounds) throw new Error("The assistant launcher has no visible bounds.");
  expect(bounds.width).toBeGreaterThanOrEqual(32);
  expect(bounds.width).toBeLessThanOrEqual(96);
  expect(bounds.height).toBeGreaterThanOrEqual(32);
  expect(bounds.height).toBeLessThanOrEqual(64);
  const mark = await launcher
    .locator(part("assistant-launcher-mark"))
    .boundingBox();
  if (!mark)
    throw new Error("The assistant launcher mark has no visible bounds.");
  expect(mark.width).toBeGreaterThanOrEqual(16);
  expect(mark.width).toBeLessThanOrEqual(24);
  expect(mark.height).toBeGreaterThanOrEqual(16);
  expect(mark.height).toBeLessThanOrEqual(24);
}
async function readableActiveTab(page: Page): Promise<void> {
  const active = page.locator('.workspace-tabs > button[aria-pressed="true"]');
  await active.hover();
  const contrast = await active.evaluate((element) => {
    const luminance = (color: string): number => {
      const channels = color.match(/\d+(?:\.\d+)?/g)?.map(Number);
      if (!channels || channels.length < 3)
        throw new Error(`Unsupported tab color: ${color}`);
      if (channels.length === 4 && channels[3] !== 1)
        throw new Error(`The active tab color must be opaque: ${color}`);
      const [red, green, blue] = channels.slice(0, 3).map((channel) => {
        const normalized = channel / 255;
        return normalized <= 0.04045
          ? normalized / 12.92
          : ((normalized + 0.055) / 1.055) ** 2.4;
      });
      if (red === undefined || green === undefined || blue === undefined)
        throw new Error(`Incomplete tab color: ${color}`);
      return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
    };
    const style = getComputedStyle(element);
    const foreground = luminance(style.color);
    const background = luminance(style.backgroundColor);
    return (
      (Math.max(foreground, background) + 0.05) /
      (Math.min(foreground, background) + 0.05)
    );
  });
  expect(contrast).toBeGreaterThanOrEqual(4.5);
}

const errorsByPage = new WeakMap<Page, string[]>();
test.beforeEach(({ page }) => {
  const errors: string[] = [];
  errorsByPage.set(page, errors);
  page.on("pageerror", (error) => errors.push(error.message));
});
test.afterEach(({ page }) => {
  expect(errorsByPage.get(page) ?? []).toEqual([]);
});
async function csvDownload(page: Page, root: Locator): Promise<string> {
  const download = page.waitForEvent("download");
  await root.locator(part("export-csv-button")).click();
  const exported = await download;
  expect(exported.suggestedFilename()).toMatch(/\.csv$/);
  const stream = await exported.createReadStream();
  if (!stream) throw new Error("The export has no readable CSV body.");
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString("utf8");
}
async function filterOrders(
  page: Page,
  status: string,
  region = ""
): Promise<void> {
  await table(page).locator(part("filters-button")).click();
  const surface = page.locator(
    `${part("filters-popover")}, ${part("filters-panel")}`
  );
  const choices = surface.locator(part("filters-body")).getByRole("combobox");
  await choices.nth(0).selectOption(status);
  await choices.nth(1).selectOption(region);
  await surface.locator(part("filters-done")).click();
  await expect(surface).toHaveCount(0);
}
async function showPending(page: Page): Promise<void> {
  await table(page).locator(part("command-palette-button")).click();
  const reviewLabel =
    (await page.locator("html").getAttribute("lang")) === "ar"
      ? "عرض الطلبات بانتظار المراجعة"
      : "Show orders awaiting review";
  await page.getByRole("option", { name: reviewLabel, exact: true }).click();
  await expect(page.locator(part("command-palette"))).toHaveCount(0);
}
async function markReady(page: Page): Promise<void> {
  page.once("dialog", (dialog) => {
    void dialog.accept();
  });
  await table(page).locator(part("bulk-button")).click();
}
async function editOwner(root: Locator, name: string): Promise<void> {
  const cell = root.locator('[data-column-key="owner"]');
  await cell.locator(part("edit-cell-activate")).press("Enter");
  await cell.locator(part("edit-cell-editor")).fill(name);
  await cell.locator(part("edit-cell-editor")).press("Enter");
  await expect(cell).toContainText(name);
}
async function pivotByStatusAndCost(page: Page): Promise<void> {
  const rows = page.locator(`${part("pivot-zone")}[data-zone="rows"]`);
  await rows
    .getByRole("button", { name: "Remove field: Region", exact: true })
    .click();
  await rows
    .getByRole("combobox", { name: "Add field", exact: true })
    .selectOption("status");
  const measures = page.locator(`${part("pivot-zone")}[data-zone="measures"]`);
  await measures
    .getByRole("button", { name: "Remove field: Sum Value", exact: true })
    .click();
  await measures
    .getByRole("combobox", { name: "Add field", exact: true })
    .selectOption("cost");
}

test("landing leads to a mounted order workspace with editable details and scoped export", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  const response = await page.goto("/vue/unstyled/preview/");
  expect(response?.status()).toBe(200);
  await page.getByRole("link", { name: "Open the order workspace" }).click();
  expect(new URL(page.url()).pathname).toBe(route);
  await expect
    .poll(() => new URL(page.url()).searchParams.get("view"))
    .toBe("orders");
  const orders = table(page);
  await expect(
    orders.getByRole("grid", { name: "Order desk", exact: true })
  ).toBeVisible();
  const first = row(orders, "ORD-1042");
  const owner = first.locator('[data-column-key="owner"]');
  await owner.locator(part("edit-cell-activate")).press("Enter");
  await owner.locator(part("edit-cell-editor")).fill("Discard this edit");
  await owner.locator(part("edit-cell-editor")).press("Escape");
  await expect(owner).toContainText("Maya Chen");
  await expect(owner.locator(part("edit-cell-editor"))).toHaveCount(0);
  await owner.locator(part("edit-cell-activate")).press("Enter");
  await owner.locator(part("edit-cell-editor")).fill("A");
  await owner.locator(part("edit-cell-editor")).press("Enter");
  await expect(owner).toContainText("Enter at least two characters");
  await owner.locator(part("edit-cell-editor")).fill("Sam Rivera");
  await owner.locator(part("edit-cell-editor")).press("Enter");
  await expect(owner).toContainText("Sam Rivera");
  await expect(page.locator(".workspace-feedback")).toContainText(
    "Owner updated for ORD-1042"
  );
  await first.locator(part("expand-button")).click();
  const child = orders.getByRole("table", {
    name: "Line items · ORD-1042",
    exact: true,
  });
  await expect(child).toBeVisible();
  await expect(child.locator("tbody tr")).toHaveCount(3);
  await expect(child).toContainText("Brass bookmark");
  await orders.locator(part("density-toggle")).selectOption("compact");
  await expect(orders).toHaveAttribute("data-density", "compact");
  await expect(
    orders.locator(".order-lines").locator(part("root"))
  ).toHaveAttribute("data-density", "compact");
  await first.locator(part("expand-button")).click();
  const customer = first.locator('td[data-column-key="customer"]');
  await customer.focus();
  await customer.press("Shift+ArrowRight");
  await page
    .getByRole("combobox", { name: "Export", exact: true })
    .selectOption("range");
  const download = page.waitForEvent("download");
  await orders.locator(part("export-csv-button")).click();
  const exported = await download;
  expect(exported.suggestedFilename()).toBe("order-desk.csv");
  const stream = await exported.createReadStream();
  if (!stream)
    throw new Error("The range export download has no readable body.");
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  const csv = Buffer.concat(chunks).toString("utf8");
  expect(csv).toContain("Atelier North");
  expect(csv).toContain("Europe");
  expect(csv).not.toContain("Common Ground");
  expect(csv).not.toContain("Owner");
  await contained(page);
  await testInfo.attach("vue-workspace-desktop", {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png",
  });
  expect(errors).toEqual([]);
});

test("grouped orders retain summaries, native overlay focus, selection and pause state", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await visit(page);
  const orders = table(page);
  await choosePreference(page, "Group by region", "By region");
  await expect(orders.locator(part("group-row")).first()).toBeVisible();
  await expect(orders.locator(part("summary"))).toBeVisible();
  const filters = orders.locator(part("filters-button"));
  await filters.click();
  const popover = page.locator(part("filters-popover"));
  await expect(popover).toBeVisible();
  await expect(popover).not.toHaveAttribute("aria-modal", "true");
  await page.keyboard.press("Escape");
  await expect(popover).toHaveCount(0);
  await expect(filters).toBeFocused();
  const checkbox = row(orders, "ORD-1042").locator(
    `${part("selection-cell")} input`
  );
  await checkbox.check();
  await expect(page.locator(".workspace-feedback")).toContainText("1 selected");
  await page
    .getByRole("button", { name: "Pause workspace", exact: true })
    .click();
  await expect(orders).toHaveCount(0);
  await expect(page.locator(".workspace-paused")).toContainText(
    "Your view is kept"
  );
  await page
    .getByRole("button", { name: "Resume workspace", exact: true })
    .first()
    .click();
  await expect(checkbox).toBeChecked();
  await expect(orders.locator(part("group-row")).first()).toBeVisible();
  await page
    .getByRole("button", { name: "Dispatch plan", exact: true })
    .click();
  await expect(table(page, "dispatch")).toBeVisible();
  await page.getByRole("button", { name: "Order desk", exact: true }).click();
  await expect(checkbox).toBeChecked();
});

test("assistant approval composes with order selection and command overlays", async ({
  page,
}) => {
  await visit(page);
  const orders = table(page);
  await compactAssistantLauncher(page);
  await orders.locator(part("assistant-launcher")).click();
  await expect(orders.locator(part("assistant-panel"))).toContainText(
    "Scripted local assistant"
  );
  await orders.locator(part("assistant-input")).fill("Prepare a review");
  await orders.locator(part("assistant-send")).click();
  await expect(orders.locator(part("agent-approval-approve"))).toHaveCount(1);
  await expect(page.locator(".workspace-feedback")).not.toContainText(
    "4 selected"
  );
  await orders.locator(part("agent-approval-reject")).click();
  await expect(page.locator(".workspace-feedback")).not.toContainText(
    "4 selected"
  );
  await orders.locator(part("assistant-input")).fill("Prepare a review");
  await orders.locator(part("assistant-send")).click();
  await orders.locator(part("agent-approval-approve")).click();
  await expect(page.locator(".workspace-feedback")).toContainText("4 selected");
  await orders.locator(part("assistant-receipts-toggle-button")).last().click();
  await expect(
    orders.locator(`${part("assistant-receipt")}[data-status="executed"]`)
  ).toBeVisible();
  await orders.locator(part("command-palette-button")).click();
  await expect(page.locator(part("command-palette"))).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(part("command-palette"))).toHaveCount(0);
  await expect(orders.locator(part("command-palette-button"))).toBeFocused();
  await orders.locator(part("assistant-close")).click();
  await expect(orders.locator(part("assistant-launcher"))).toBeFocused();
});

test("dispatch uses real tree moves and spans, revenue uses the same order data", async ({
  page,
}, testInfo) => {
  await visit(page);
  const orders = table(page);
  await row(orders, "ORD-1042")
    .locator(`${part("selection-cell")} input`)
    .check();
  page.once("dialog", (dialog) => {
    void dialog.accept();
  });
  await orders.locator(part("bulk-button")).click();
  await expect(row(orders, "ORD-1042")).toContainText("Ready");
  await page
    .getByRole("button", { name: "Dispatch plan", exact: true })
    .click();
  const dispatch = table(page, "dispatch");
  const first = row(dispatch, "ORD-1042");
  await expect(first).toBeVisible();
  const moveHandle = first.locator(part("row-reorder-handle"));
  await moveHandle.press("Space");
  await moveHandle.press("ArrowUp");
  await moveHandle.press("Space");
  await expect(dispatch.locator("tbody [data-row-id]").nth(1)).toHaveAttribute(
    "data-row-id",
    "ORD-1042"
  );
  await expect(page.locator(".workspace-feedback")).toContainText(
    "Dispatch order updated"
  );
  const manifest = table(page, "manifest");
  await expect(
    manifest.locator('td[data-column-key="pickup"][rowspan="2"]')
  ).toHaveCount(3);
  await expect(
    manifest.locator('td[data-column-key="pickup"][rowspan="2"]').first()
  ).toBeVisible();
  await expect(manifest.locator(part("summary"))).toContainText("18");
  await page
    .getByRole("button", { name: "Revenue review", exact: true })
    .click();
  const revenue = table(page, "revenue");
  await expect(revenue.locator(part("group-row"))).toHaveCount(3);
  await expect(revenue.locator(part("sparkline")).first()).toBeVisible();
  await expect(revenue.locator('th[data-column-key="profit"]')).toHaveText(
    "Gross profit"
  );
  await expect(page.locator(part("pivot-panel"))).toBeVisible();
  await expect(table(page, "pivot").getByRole("table")).toBeVisible();
  await contained(page);
  await readableActiveTab(page);
  await testInfo.attach("vue-workspace-revenue", {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png",
  });
});

test("Arabic mobile cards keep details, summaries, controls and the viewport contained", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await visit(page, "?lang=ar");
  const orders = table(page);
  await expect(orders).toHaveAttribute("dir", "rtl");
  await expect(orders.locator(part("cards"))).toBeVisible();
  await expect(orders.locator("table")).toHaveCount(0);
  await expect(orders.locator(part("summary-card"))).toBeVisible();
  await orders
    .locator(part("card"))
    .first()
    .locator(part("expand-button"))
    .click();
  await expect(orders.locator(part("nested-table"))).toBeVisible();
  await expect(
    orders.locator(part("nested-table")).locator(part("cards"))
  ).toBeVisible();
  await orders.locator(part("filters-button")).click();
  // The binding's actual mobile mode selects the drawer, including automatic cards.
  await expect(page.locator(part("filters-panel"))).toBeVisible();
  await expect(
    page.locator("dialog").filter({ has: page.locator(part("filters-header")) })
  ).toHaveJSProperty("open", true);
  await page.keyboard.press("Escape");
  await expect(orders.locator(part("filters-button"))).toBeFocused();
  await choosePreference(page, "التخطيط", "بطاقات");
  await orders.locator(part("filters-button")).click();
  await expect(
    page.locator("dialog").filter({ has: page.locator(part("filters-header")) })
  ).toHaveJSProperty("open", true);
  await page.keyboard.press("Escape");
  await expect(orders.locator(part("filters-button"))).toBeFocused();
  await page
    .getByRole("button", { name: "المظهر الداكن", exact: true })
    .click();
  await expect(page.locator("body")).toHaveAttribute(
    "data-workspace-theme",
    "dark"
  );
  await contained(page);
  await testInfo.attach("vue-workspace-arabic-mobile", {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png",
  });
  expect(errors).toEqual([]);
});

test("a failed view chunk exposes a real retry and reloads the registered entry", async ({
  page,
}) => {
  let observed: (() => void) | undefined;
  let release: (() => void) | undefined;
  const requested = new Promise<void>((resolve) => {
    observed = resolve;
  });
  const proceed = new Promise<void>((resolve) => {
    release = resolve;
  });
  const chunk = "**/assets/OrderDesk-*.js";
  await page.route(chunk, async (request) => {
    observed?.();
    await proceed;
    await request.abort("failed");
  });
  const response = await page.goto(route, { waitUntil: "domcontentloaded" });
  expect(response?.status()).toBe(200);
  await requested;
  await expect(page.locator(".workspace-loading")).toBeVisible();
  await expect(page.locator(".workspace-stage")).toHaveAttribute(
    "aria-busy",
    "true"
  );
  release?.();
  await expect(page.locator(".workspace-error")).toContainText(
    "This workspace could not load"
  );
  await expect(page.locator(".workspace-stage")).toHaveAttribute(
    "aria-busy",
    "false"
  );
  await page.unroute(chunk);
  const navigation = page.waitForResponse(
    (response) =>
      response.request().isNavigationRequest() && response.url().includes(route)
  );
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  expect((await navigation).status()).toBe(200);
  await expect(
    table(page).getByRole("grid", { name: "Order desk", exact: true })
  ).toBeVisible();
});

test("Arabic desktop navigation mirrors the arrows and keeps pinned columns and overlays contained", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await visit(page, "?lang=ar");
  const orders = table(page);
  const first = row(orders, "ORD-1042");
  const customer = first.locator('td[data-column-key="customer"]');
  await customer.focus();
  await customer.press("ArrowLeft");
  await expect(first.locator('td[data-column-key="region"]')).toBeFocused();
  await expect(orders.locator('thead [data-column-key="id"]')).toHaveCSS(
    "position",
    "sticky"
  );
  await expect(orders.locator('thead [data-column-key="amount"]')).toHaveCSS(
    "position",
    "sticky"
  );
  await orders.locator(part("filters-button")).click();
  const overlay = page.locator(part("filters-popover"));
  await expect(overlay).toHaveAttribute("dir", "rtl");
  const bounds = await overlay.boundingBox();
  if (!bounds) throw new Error("The RTL filter overlay has no visible bounds.");
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(1280);
  await page.keyboard.press("Escape");
  await expect(orders.locator(part("filters-button"))).toBeFocused();
  await contained(page);
  await compactAssistantLauncher(page);
  await readableActiveTab(page);
  await testInfo.attach("vue-workspace-arabic-desktop", {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png",
  });
});

for (const scenario of [
  { name: "narrow desktop", width: 820, height: 460, query: "", drawer: false },
  {
    name: "mobile drawer",
    width: 390,
    height: 680,
    query: "?layout=cards",
    drawer: true,
  },
  {
    name: "Arabic RTL",
    width: 900,
    height: 500,
    query: "?lang=ar",
    drawer: false,
  },
]) {
  test(`native filters keep controls reachable near the bottom on ${scenario.name}`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({
      width: scenario.width,
      height: scenario.height,
    });
    await visit(page, scenario.query);
    const orders = table(page);
    const trigger = orders.locator(part("filters-button"));
    await trigger.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      window.scrollBy(0, rect.top - (window.innerHeight - 70));
    });
    await trigger.click();
    const surface = page.locator(
      part(scenario.drawer ? "filters-panel" : "filters-popover")
    );
    await expect(surface).toBeVisible();
    await expect(surface.locator(part("filters-header"))).toBeVisible();
    await expect(surface.locator(part("filters-clear"))).toBeVisible();
    await expect(surface.locator(part("filters-done"))).toBeVisible();
    const body = surface.locator(part("filters-body"));
    await expect(body).toBeVisible();
    // Reach the final real field through the actual native scrolling surface.
    await body.getByRole("combobox").last().scrollIntoViewIfNeeded();
    await expect(body.getByRole("combobox").last()).toBeVisible();
    const bounds = await surface.boundingBox();
    if (!bounds)
      throw new Error("The native filter surface has no visible bounds.");
    expect(bounds.y).toBeGreaterThanOrEqual(0);
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(scenario.height + 1);
    await expect(surface.locator(part("filters-header"))).toBeInViewport();
    await expect(surface.locator(part("filters-clear"))).toBeInViewport();
    await expect(surface.locator(part("filters-done"))).toBeInViewport();
    expect(
      await surface.evaluate(
        (element) => getComputedStyle(element).backgroundColor
      )
    ).toMatch(/^rgb\(\d+, \d+, \d+\)$/);
    expect(
      await surface.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        const hit = document.elementFromPoint(rect.left + 10, rect.top + 10);
        return hit === element || element.contains(hit);
      })
    ).toBe(true);
    await body.getByRole("combobox").first().selectOption("Review");
    await expect(orders.locator(part("filters-count"))).toHaveText("(1)");
    await testInfo.attach(
      `vue-workspace-filters-${scenario.name.replaceAll(" ", "-")}`,
      { body: await page.screenshot(), contentType: "image/png" }
    );
    await surface.locator(part("filters-done")).click();
    await expect(surface).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await trigger.click();
    await surface.locator(part("filters-clear")).click();
    await expect(orders.locator(part("filters-count"))).toHaveCount(0);
    await page.keyboard.press("Escape");
    await expect(surface).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await contained(page);
  });
}

test("range export never falls back without a range and cards require a fresh desktop selection", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await visit(page);
  const orders = table(page);
  const downloads: string[] = [];
  page.on("download", (download) =>
    downloads.push(download.suggestedFilename())
  );
  await page
    .getByRole("combobox", { name: "Export", exact: true })
    .selectOption("range");
  await expect(page.locator("[data-workspace-export-blocked]")).toContainText(
    "No file will be created"
  );
  await expect(orders.locator(part("export-csv-button"))).toHaveCount(0);
  const customer = row(orders, "ORD-1042").locator(
    'td[data-column-key="customer"]'
  );
  await customer.focus();
  await customer.press("Shift+ArrowRight");
  await expect(orders.locator(part("export-csv-button"))).toBeVisible();
  await page
    .getByRole("button", { name: "Clear cell selection", exact: true })
    .click();
  await expect(orders.locator("[data-cell-selected]")).toHaveCount(0);
  await expect(orders.locator(part("export-csv-button"))).toHaveCount(0);
  await customer.focus();
  await customer.press("Shift+ArrowRight");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(orders.locator(part("cards"))).toBeVisible();
  await expect(
    page
      .getByRole("combobox", { name: "Export", exact: true })
      .locator('option[value="range"]')
  ).toHaveJSProperty("disabled", true);
  await expect(
    page.getByRole("combobox", { name: "Export", exact: true })
  ).toHaveValue("range");
  await expect(orders.locator(part("export-csv-button"))).toHaveCount(0);
  await expect(page.locator("[data-workspace-export-blocked]")).toContainText(
    "unavailable in cards"
  );
  await choosePreference(page, "Layout", "Cards");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await expect(orders.locator(part("cards"))).toBeVisible();
  await choosePreference(page, "Layout", "Responsive");
  await expect(
    orders.getByRole("grid", { name: "Order desk", exact: true })
  ).toBeVisible();
  await expect(orders.locator(part("export-csv-button"))).toHaveCount(0);
  expect(downloads).toEqual([]);
  await customer.focus();
  await customer.press("Shift+ArrowRight");
  const csv = await csvDownload(page, orders);
  expect(csv).toContain("Atelier North");
  expect(csv).toContain("Europe");
  expect(csv).not.toContain("Common Ground");
  expect(csv).not.toContain("Owner");
  expect(downloads).toEqual(["order-desk.csv"]);
});

test("filtered and sorted range export stays distinct from page and all-filtered export", async ({
  page,
}) => {
  await visit(page);
  const orders = table(page);
  await filterOrders(page, "Ready", "Americas");
  await orders
    .getByRole("button", { name: "Sort by: Customer", exact: true })
    .click();
  await orders
    .getByRole("button", { name: "Sort by: Customer", exact: true })
    .click();
  await expect(orders.locator("tbody [data-row-id]").first()).toHaveAttribute(
    "data-row-id",
    "ORD-1046"
  );
  const customer = row(orders, "ORD-1046").locator(
    'td[data-column-key="customer"]'
  );
  await customer.focus();
  await customer.press("Shift+ArrowRight");
  await page
    .getByRole("combobox", { name: "Export", exact: true })
    .selectOption("range");
  const selected = await csvDownload(page, orders);
  expect(selected).toContain("Kindred Goods");
  expect(selected).toContain("Americas");
  expect(selected).not.toContain("Common Ground");
  expect(selected).not.toContain("Owner");
  await page
    .getByRole("combobox", { name: "Export", exact: true })
    .selectOption("page");
  const pageCsv = await csvDownload(page, orders);
  expect(pageCsv).toContain("Kindred Goods");
  expect(pageCsv).toContain("Common Ground");
  expect(pageCsv).toContain("Owner");
  await filterOrders(page, "", "");
  await page
    .getByRole("combobox", { name: "Export", exact: true })
    .selectOption("all");
  const all = await csvDownload(page, orders);
  for (const id of ["ORD-1042", "ORD-1047", "ORD-1053"])
    expect(all).toContain(id);
  const exportedIds = all.match(/ORD-\d{4}/g) ?? [];
  expect(exportedIds).toHaveLength(12);
  expect(new Set(exportedIds).size).toBe(12);
  expect(all).toContain("$9,216");
});

for (const query of ["", "?lang=ar"]) {
  test(`Show pending reveals hidden and off-page orders, including an empty queue ${query || "English"}`, async ({
    page,
  }) => {
    await visit(page, query);
    const orders = table(page);
    await orders.locator(part("page-next")).click();
    await expect(row(orders, "ORD-1042")).toHaveCount(0);
    await showPending(page);
    await expect(orders.locator("tbody [data-row-id]")).toHaveCount(4);
    await expect(row(orders, "ORD-1042")).toBeVisible();
    await filterOrders(page, "Dispatched");
    await expect(row(orders, "ORD-1042")).toHaveCount(0);
    await showPending(page);
    await expect(orders.locator("tbody [data-row-id]")).toHaveCount(4);
    await expect(row(orders, "ORD-1052")).toBeVisible();
    await markReady(page);
    await expect(orders.locator("tbody [data-row-id]")).toHaveCount(0);
    await showPending(page);
    await expect(orders.locator("tbody [data-row-id]")).toHaveCount(0);
    await expect(page.locator(".workspace-feedback")).toContainText("0");
    await expect(orders.locator(part("bulk-bar"))).toHaveCount(0);
  });
}

test("shared owner edits and readiness drive stable dispatch moves and restore", async ({
  page,
}) => {
  await visit(page);
  const orders = table(page);
  await editOwner(row(orders, "ORD-1042"), "Sam Rivera");
  await row(orders, "ORD-1042")
    .locator(`${part("selection-cell")} input`)
    .check();
  await markReady(page);
  await page
    .getByRole("button", { name: "Dispatch plan", exact: true })
    .click();
  const dispatch = table(page, "dispatch");
  await expect(row(dispatch, "ORD-1042")).toContainText("Sam Rivera");
  await expect(row(dispatch, "ORD-1044")).toHaveCount(0);
  await expect(row(dispatch, "ORD-1045")).toHaveCount(0);
  const handle = row(dispatch, "ORD-1042").locator(part("row-reorder-handle"));
  await handle.press("Space");
  await handle.press("ArrowUp");
  await handle.press("Space");
  await expect(dispatch.locator("tbody [data-row-id]").nth(1)).toHaveAttribute(
    "data-row-id",
    "ORD-1042"
  );
  await page.getByRole("button", { name: "Order desk", exact: true }).click();
  await expect(row(orders, "ORD-1042")).toContainText("Sam Rivera");
  await page
    .getByRole("button", { name: "Dispatch plan", exact: true })
    .click();
  await expect(dispatch.locator("tbody [data-row-id]").nth(1)).toHaveAttribute(
    "data-row-id",
    "ORD-1042"
  );
  await page.getByRole("button", { name: "Order desk", exact: true }).click();
  await page
    .getByRole("button", { name: "Restore sample data", exact: true })
    .click();
  await expect(row(orders, "ORD-1042")).toContainText("Maya Chen");
  await page
    .getByRole("button", { name: "Dispatch plan", exact: true })
    .click();
  await expect(row(dispatch, "ORD-1042")).toHaveCount(0);
  await expect(dispatch.locator("tbody [data-row-id]").nth(1)).toHaveAttribute(
    "data-row-id",
    "ORD-1051"
  );
});

test("context actions and the review side panel reveal a specific pending order", async ({
  page,
}) => {
  await visit(page);
  const orders = table(page);
  await row(orders, "ORD-1042")
    .locator('td[data-column-key="customer"]')
    .click({ button: "right" });
  await page
    .getByRole("menuitem", { name: "Open line items", exact: true })
    .click();
  await expect(
    orders.getByRole("table", { name: "Line items · ORD-1042", exact: true })
  ).toBeVisible();
  await expect(orders.locator(part("search"))).toHaveValue("Atelier North");
  await page.getByRole("button", { name: "Review queue", exact: true }).click();
  const panel = orders.locator(part("side-panel"));
  await expect(panel).toBeVisible();
  await panel
    .getByRole("button", { name: "ORD-1052 · Open House", exact: true })
    .click();
  await expect(row(orders, "ORD-1052")).toBeVisible();
  await expect(row(orders, "ORD-1042")).toHaveCount(0);
  await expect(
    orders.getByRole("table", { name: "Line items · ORD-1052", exact: true })
  ).toBeVisible();
  await panel.locator(part("side-panel-close")).click();
  await expect(panel).toHaveCount(0);
});

test("editing cost recalculates the real formula and pivot dimensions and measures persist", async ({
  page,
}) => {
  await visit(page, "?view=revenue");
  const revenue = table(page, "revenue");
  const first = row(revenue, "ORD-1042");
  const cost = first.locator('td[data-column-key="cost"]');
  await cost.locator(part("edit-cell-activate")).press("Enter");
  await cost.locator(part("edit-cell-editor")).fill("100");
  await cost.locator(part("edit-cell-editor")).press("Enter");
  await expect(first.locator('td[data-column-key="profit"]')).toHaveText(
    "$452"
  );
  await expect(revenue.locator(part("summary"))).toContainText("$5,330");
  await pivotByStatusAndCost(page);
  const pivot = table(page, "pivot");
  await expect(
    pivot.locator("tbody tr").filter({ hasText: "Review" }).locator("td").last()
  ).toHaveText("1748");
  await expect(
    pivot.locator("tbody tr").filter({ hasText: "Ready" }).locator("td").last()
  ).toHaveText("1948");
  await expect(
    pivot
      .locator("tbody tr")
      .filter({ hasText: "Dispatched" })
      .locator("td")
      .last()
  ).toHaveText("1634");
  await expect(
    pivot
      .locator("tr")
      .filter({ has: page.locator('[data-pivot-kind="grandTotal"]') })
      .locator("td")
      .last()
  ).toHaveText("5330");
  await expect
    .poll(() => new URL(page.url()).search)
    .toContain("workspace-pivot");
  await page.reload();
  await expect(
    row(table(page, "revenue"), "ORD-1042").locator(
      'td[data-column-key="profit"]'
    )
  ).toHaveText("$452");
  await expect(
    page.locator(`${part("pivot-zone")}[data-zone="rows"]`)
  ).toContainText("Status");
  await expect(
    page.locator(`${part("pivot-zone")}[data-zone="measures"]`)
  ).toContainText("Cost");
});

test("retry after authored work preserves orders, selection, pivot and appearance through repeated failures", async ({
  page,
}) => {
  await visit(page);
  const orders = table(page);
  await editOwner(row(orders, "ORD-1042"), "Sam Rivera");
  await row(orders, "ORD-1042")
    .locator(`${part("selection-cell")} input`)
    .check();
  await markReady(page);
  const retainedSelection = row(orders, "ORD-1042").locator(
    `${part("selection-cell")} input`
  );
  await expect(retainedSelection).not.toBeChecked();
  await retainedSelection.check();
  await expect(retainedSelection).toBeChecked();
  await page
    .getByRole("button", { name: "Revenue review", exact: true })
    .click();
  const cost = row(table(page, "revenue"), "ORD-1042").locator(
    'td[data-column-key="cost"]'
  );
  await cost.locator(part("edit-cell-activate")).press("Enter");
  await cost.locator(part("edit-cell-editor")).fill("100");
  await cost.locator(part("edit-cell-editor")).press("Enter");
  await pivotByStatusAndCost(page);
  await expect
    .poll(() => new URL(page.url()).search)
    .toContain("workspace-pivot");
  await page
    .getByRole("button", { name: "Dark appearance", exact: true })
    .click();
  let failures = 2;
  await page.route("**/assets/DispatchPlan-*.js", async (request) => {
    if (failures > 0) {
      failures--;
      await request.abort("failed");
    } else await request.continue();
  });
  await page
    .getByRole("button", { name: "Dispatch plan", exact: true })
    .click();
  await expect(page.locator(".workspace-error")).toBeVisible();
  for (let attempt = 0; attempt < 2; attempt++) {
    const navigation = page.waitForResponse(
      (response) =>
        response.request().isNavigationRequest() &&
        response.url().includes(route)
    );
    await page.getByRole("button", { name: "Try again", exact: true }).click();
    expect((await navigation).status()).toBe(200);
    if (attempt === 0)
      await expect(page.locator(".workspace-error")).toBeVisible();
  }
  await expect(row(table(page, "dispatch"), "ORD-1042")).toContainText(
    "Sam Rivera"
  );
  await expect(page.locator("body")).toHaveAttribute(
    "data-workspace-theme",
    "dark"
  );
  await page.getByRole("button", { name: "Order desk", exact: true }).click();
  await expect(
    row(table(page), "ORD-1042").locator(`${part("selection-cell")} input`)
  ).toBeChecked();
  await expect(row(table(page), "ORD-1042")).toContainText("Sam Rivera");
  await page
    .getByRole("button", { name: "Revenue review", exact: true })
    .click();
  await expect(
    row(table(page, "revenue"), "ORD-1042").locator(
      'td[data-column-key="profit"]'
    )
  ).toHaveText("$452");
  await expect(
    page.locator(`${part("pivot-zone")}[data-zone="rows"]`)
  ).toContainText("Status");
  await expect(
    page.locator(`${part("pivot-zone")}[data-zone="measures"]`)
  ).toContainText("Cost");
});

test("retry retains the authored dispatch sequence", async ({ page }) => {
  await visit(page);
  await row(table(page), "ORD-1042")
    .locator(`${part("selection-cell")} input`)
    .check();
  await markReady(page);
  await page
    .getByRole("button", { name: "Dispatch plan", exact: true })
    .click();
  const handle = row(table(page, "dispatch"), "ORD-1042").locator(
    part("row-reorder-handle")
  );
  await handle.press("Space");
  await handle.press("ArrowUp");
  await handle.press("Space");
  await expect(
    table(page, "dispatch").locator("tbody [data-row-id]").nth(1)
  ).toHaveAttribute("data-row-id", "ORD-1042");
  await page.route("**/assets/RevenueReview-*.js", (request) =>
    request.abort("failed")
  );
  await page
    .getByRole("button", { name: "Revenue review", exact: true })
    .click();
  await expect(page.locator(".workspace-error")).toBeVisible();
  await page.unroute("**/assets/RevenueReview-*.js");
  const navigation = page.waitForResponse(
    (response) =>
      response.request().isNavigationRequest() && response.url().includes(route)
  );
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  expect((await navigation).status()).toBe(200);
  await expect(table(page, "revenue")).toBeVisible();
  await page
    .getByRole("button", { name: "Dispatch plan", exact: true })
    .click();
  await expect(
    table(page, "dispatch").locator("tbody [data-row-id]").nth(1)
  ).toHaveAttribute("data-row-id", "ORD-1042");
});

test("unavailable recovery storage leaves existing authored work usable", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const set = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key: string, value: string): void {
      if (key === "adapttable-vue-order-workspace:v2")
        throw new DOMException("Storage unavailable", "QuotaExceededError");
      set.call(this, key, value);
    };
  });
  await visit(page);
  await editOwner(row(table(page), "ORD-1042"), "Sam Rivera");
  await page.route("**/assets/RevenueReview-*.js", (request) =>
    request.abort("failed")
  );
  await page
    .getByRole("button", { name: "Revenue review", exact: true })
    .click();
  await expect(page.locator(".workspace-error")).toBeVisible();
  let navigations = 0;
  page.on("request", (request) => {
    if (request.isNavigationRequest()) navigations++;
  });
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(page.locator(".workspace-error")).toContainText(
    "Nothing was reloaded"
  );
  expect(navigations).toBe(0);
  await page.getByRole("button", { name: "Order desk", exact: true }).click();
  await expect(row(table(page), "ORD-1042")).toContainText("Sam Rivera");
});

test("presentation history and copied deep links restore actual views without losing table queries", async ({
  page,
  context,
}) => {
  await visit(page, "?keep=external&theme=light");
  await editOwner(row(table(page), "ORD-1042"), "Sam Rivera");
  await filterOrders(page, "Ready");
  await table(page).locator(part("search")).fill("Kindred");
  await expect(row(table(page), "ORD-1046")).toBeVisible();
  await expect
    .poll(() => new URL(page.url()).search)
    .toContain("workspace-orders");
  await choosePreference(page, "Language", "العربية");
  await page.locator('[data-workspace-view="revenue"]').click();
  await choosePreference(page, "التخطيط", "بطاقات");
  await page
    .getByRole("button", { name: "المظهر الداكن", exact: true })
    .click();
  const chosen = new URL(page.url());
  expect(
    Object.fromEntries(
      ["view", "lang", "layout", "theme", "keep"].map((key) => [
        key,
        chosen.searchParams.get(key),
      ])
    )
  ).toEqual({
    view: "revenue",
    lang: "ar",
    layout: "cards",
    theme: "dark",
    keep: "external",
  });
  await page.goBack();
  await expect(page.locator("body")).toHaveAttribute(
    "data-workspace-theme",
    "light"
  );
  await page.goBack();
  await expect(
    page
      .getByRole("group", { name: "التخطيط", exact: true })
      .getByRole("button", { name: "متجاوب", exact: true })
  ).toHaveAttribute("aria-pressed", "true");
  await page.goForward();
  await expect(
    page
      .getByRole("group", { name: "التخطيط", exact: true })
      .getByRole("button", { name: "بطاقات", exact: true })
  ).toHaveAttribute("aria-pressed", "true");
  await page.goForward();
  await expect(page.locator("body")).toHaveAttribute(
    "data-workspace-theme",
    "dark"
  );
  const linked = await context.newPage();
  const linkedErrors: string[] = [];
  linked.on("pageerror", (error) => linkedErrors.push(error.message));
  const response = await linked.goto(page.url());
  expect(response?.status()).toBe(200);
  await expect(
    linked.locator('[data-workspace-view="revenue"]')
  ).toHaveAttribute("aria-pressed", "true");
  await expect(table(linked, "revenue").locator(part("cards"))).toBeVisible();
  await expect(linked.locator("html")).toHaveAttribute("lang", "ar");
  await expect(linked.locator("body")).toHaveAttribute(
    "data-workspace-theme",
    "dark"
  );
  expect(linkedErrors).toEqual([]);
  await linked.close();
  await page.locator('[data-workspace-view="orders"]').click();
  await expect(table(page).locator(part("search"))).toHaveValue("Kindred");
  await expect(
    table(page).locator(`${part("card")}[data-row-id="ORD-1046"]`)
  ).toBeVisible();
  await filterOrders(page, "");
  await table(page).locator(part("search")).fill("Atelier");
  await expect(
    table(page).locator(`${part("card")}[data-row-id="ORD-1042"]`)
  ).toContainText("Sam Rivera");
  await page.reload();
  await expect(table(page).locator(part("search"))).toHaveValue("Atelier");
  await expect(
    table(page).locator(`${part("card")}[data-row-id="ORD-1042"]`)
  ).toContainText("Sam Rivera");
});

test("a theme preference survives a fresh link and Back restores the first explicit appearance", async ({
  page,
}) => {
  await visit(page, "?theme=light");
  await page
    .getByRole("button", { name: "Dark appearance", exact: true })
    .click();
  await page.goBack();
  await expect(page.locator("body")).toHaveAttribute(
    "data-workspace-theme",
    "light"
  );
  await page.goForward();
  await expect(page.locator("body")).toHaveAttribute(
    "data-workspace-theme",
    "dark"
  );
  await readableActiveTab(page);
  await visit(page);
  await expect(page.locator("body")).toHaveAttribute(
    "data-workspace-theme",
    "dark"
  );
});

test("mobile bulk, dispatch moves, cost editing and pivot controls complete the same workflow", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await visit(page);
  const order = table(page).locator(`${part("card")}[data-row-id="ORD-1042"]`);
  await order.locator(part("edit-cell-activate")).press("Enter");
  await order.locator(part("edit-cell-editor")).fill("Sam Rivera");
  await order.locator(part("edit-cell-editor")).press("Enter");
  await order.locator('input[type="checkbox"]').check();
  await markReady(page);
  await expect(order).toContainText("Ready");
  await page
    .getByRole("button", { name: "Dispatch plan", exact: true })
    .click();
  const dispatch = table(page, "dispatch");
  const delivery = dispatch.locator(`${part("card")}[data-row-id="ORD-1042"]`);
  await expect(delivery).toContainText("Sam Rivera");
  await delivery.locator(part("row-reorder-up")).click();
  await expect(dispatch.locator(part("card")).nth(1)).toHaveAttribute(
    "data-row-id",
    "ORD-1042"
  );
  await delivery.locator('input[type="checkbox"]').check();
  const dispatchCsv = await csvDownload(page, dispatch);
  expect(dispatchCsv).toContain("Atelier North");
  expect(dispatchCsv).toContain("Sam Rivera");
  expect(dispatchCsv).not.toContain("Studio Field");
  await testInfo.attach("vue-workspace-dispatch-mobile", {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png",
  });
  await page
    .getByRole("button", { name: "Revenue review", exact: true })
    .click();
  const revenue = table(page, "revenue");
  const customer = revenue.locator(`${part("card")}[data-row-id="ORD-1042"]`);
  await customer.locator(part("edit-cell-activate")).press("Enter");
  await customer.locator(part("edit-cell-editor")).fill("100");
  await customer.locator(part("edit-cell-editor")).press("Enter");
  await expect(customer.locator('[data-column-key="profit"]')).toHaveText(
    "$452"
  );
  await pivotByStatusAndCost(page);
  await expect(table(page, "pivot").locator(part("cards"))).toContainText(
    "Cost"
  );
  await contained(page);
  await testInfo.attach("vue-workspace-revenue-mobile", {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png",
  });
});

test("view changes retire a pending assistant approval before a new request can run", async ({
  page,
}) => {
  await visit(page);
  const orders = table(page);
  await orders.locator(part("assistant-launcher")).click();
  await orders.locator(part("assistant-input")).fill("Prepare a review");
  await orders.locator(part("assistant-send")).click();
  await expect(orders.locator(part("agent-approval-approve"))).toBeVisible();
  await page
    .getByRole("button", { name: "Dispatch plan", exact: true })
    .click();
  await expect(table(page, "dispatch")).toBeVisible();
  await page.getByRole("button", { name: "Order desk", exact: true }).click();
  await expect(orders.locator(part("agent-approval-approve"))).toHaveCount(0);
  await expect(page.locator(".workspace-feedback")).not.toContainText(
    "4 selected"
  );
  const launcher = orders.locator(part("assistant-launcher"));
  if (await launcher.count()) await launcher.click();
  await orders.locator(part("assistant-input")).fill("Prepare a review");
  await orders.locator(part("assistant-send")).click();
  await orders.locator(part("agent-approval-approve")).click();
  await expect(page.locator(".workspace-feedback")).toContainText("4 selected");
});

test("feature and framework discovery points to registered pages and keeps the current task", async ({
  page,
}) => {
  await visit(page);
  await editOwner(row(table(page), "ORD-1042"), "Sam Rivera");
  await page.getByText("How this view is built", { exact: true }).click();
  await page
    .getByLabel("Find a native feature", { exact: true })
    .fill("columns");
  const finder = page.locator(".workspace-implementation");
  await expect(
    finder.getByRole("link", { name: "Columns", exact: true })
  ).toHaveAttribute("href", "../column-menu/");
  await expect(
    finder.getByRole("link", { name: "Columns", exact: true })
  ).toHaveAttribute("target", "_blank");
  const comparisons = finder
    .getByRole("navigation", { name: "Compare a working kit", exact: true })
    .getByRole("link");
  await expect(comparisons).toHaveCount(4);
  await expect(
    finder.getByRole("link", { name: "React · Tailwind", exact: true })
  ).toHaveAttribute("href", /\/react\/demo\/tailwind\/filtering\/$/);
  for (const link of await comparisons.all()) {
    const href = await link.getAttribute("href");
    if (!href) throw new Error("A comparison has no destination.");
    expect(
      SHOWCASE_PAGES.some((entry) => entry.route === new URL(href).pathname)
    ).toBe(true);
    await expect(link).toHaveAttribute("target", "_blank");
  }
  await expect(finder.locator("pre")).toContainText("nestedTable");
  await page.getByText("How this view is built", { exact: true }).click();
  await expect(row(table(page), "ORD-1042")).toContainText("Sam Rivera");
});

for (const mode of [
  { name: "automatic mobile", width: 390, query: "" },
  { name: "explicit cards", width: 1280, query: "?layout=cards" },
]) {
  test(`fresh ${mode.name} offers honest page/all exports and no cell-range action`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: mode.width, height: 844 });
    await visit(page, mode.query);
    const orders = table(page);
    await expect(orders.locator(part("cards"))).toBeVisible();
    await expect(
      page
        .getByRole("combobox", { name: "Export", exact: true })
        .locator('option[value="range"]')
    ).toHaveJSProperty("disabled", true);
    await expect(
      page.getByRole("combobox", { name: "Export", exact: true })
    ).toHaveValue("page");
    await expect(
      page
        .getByRole("combobox", { name: "Export", exact: true })
        .locator('option[value="page"]')
    ).toHaveText("Loaded cards");
    const loadedIds = await orders
      .locator(part("card"))
      .evaluateAll((cards) =>
        cards.map((card) => card.getAttribute("data-row-id"))
      );
    const pageCsv = await csvDownload(page, orders);
    expect(pageCsv.match(/ORD-\d{4}/g)).toEqual(loadedIds);
    expect(pageCsv).toContain("ORD-1042");
    await page
      .getByRole("combobox", { name: "Export", exact: true })
      .selectOption("all");
    const all = await csvDownload(page, orders);
    expect(all).toContain("ORD-1053");
    expect(all.match(/ORD-\d{4}/g)).toHaveLength(12);
  });
}

test("a query change clears the old range and empty-result recovery cannot revive it", async ({
  page,
}) => {
  await visit(page);
  const orders = table(page);
  const customer = row(orders, "ORD-1042").locator(
    'td[data-column-key="customer"]'
  );
  await customer.focus();
  await customer.press("Shift+ArrowRight");
  await page
    .getByRole("combobox", { name: "Export", exact: true })
    .selectOption("range");
  await expect(orders.locator(part("export-csv-button"))).toBeVisible();
  await orders.locator(part("search")).fill("no such customer");
  await expect(orders.locator(".workspace-empty")).toContainText(
    "No orders match this view"
  );
  await expect(orders.locator(part("export-csv-button"))).toHaveCount(0);
  await orders
    .locator(".workspace-empty")
    .getByRole("button", { name: "Clear filters", exact: true })
    .click();
  await expect(row(orders, "ORD-1042")).toBeVisible();
  await expect(orders.locator("[data-cell-selected]")).toHaveCount(0);
  await expect(orders.locator(part("export-csv-button"))).toHaveCount(0);
  await customer.focus();
  await customer.press("Shift+ArrowRight");
  const csv = await csvDownload(page, orders);
  expect(csv).toContain("Atelier North");
  expect(csv).not.toContain("Common Ground");
});

test("a failed stale view load cannot replace the authored view the user returned to", async ({
  page,
}) => {
  await visit(page);
  await editOwner(row(table(page), "ORD-1042"), "Sam Rivera");
  let requested: (() => void) | undefined;
  let release: (() => void) | undefined;
  const seen = new Promise<void>((resolve) => {
    requested = resolve;
  });
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/assets/RevenueReview-*.js", async (request) => {
    requested?.();
    await gate;
    await request.abort("failed");
  });
  await page
    .getByRole("button", { name: "Revenue review", exact: true })
    .click();
  await seen;
  await expect(page.locator(".workspace-loading")).toBeVisible();
  await page.getByRole("button", { name: "Order desk", exact: true }).click();
  await expect(row(table(page), "ORD-1042")).toContainText("Sam Rivera");
  const failed = page.waitForEvent("requestfailed", (request) =>
    request.url().includes("RevenueReview-")
  );
  release?.();
  await failed;
  await expect(page.locator('[data-workspace-view="orders"]')).toHaveAttribute(
    "aria-pressed",
    "true"
  );
  await expect(page.locator(".workspace-error")).toHaveCount(0);
  await expect(row(table(page), "ORD-1042")).toContainText("Sam Rivera");
});

test("group collapse survives a reload through the binding's own URL state", async ({
  page,
}) => {
  await visit(page);
  const orders = table(page);
  await choosePreference(page, "Group by region", "By region");
  const europe = orders
    .locator(part("group-row"))
    .filter({ hasText: "Europe" });
  await europe.locator(part("group-toggle")).click();
  await expect(row(orders, "ORD-1042")).toHaveCount(0);
  await expect
    .poll(() => new URL(page.url()).search)
    .toContain("workspace-order-groups");
  await page.reload();
  await expect(
    table(page).locator(part("group-row")).filter({ hasText: "Europe" })
  ).toBeVisible();
  await expect(row(table(page), "ORD-1042")).toHaveCount(0);
  await table(page)
    .locator(part("group-row"))
    .filter({ hasText: "Europe" })
    .locator(part("group-toggle"))
    .click();
  await expect(row(table(page), "ORD-1042")).toBeVisible();
  await table(page)
    .locator(part("group-row"))
    .filter({ hasText: "Europe" })
    .locator(part("group-toggle"))
    .click();
  await expect(row(table(page), "ORD-1042")).toHaveCount(0);
  await showPending(page);
  await expect(row(table(page), "ORD-1042")).toBeVisible();
  await expect(row(table(page), "ORD-1049")).toBeVisible();
});

test("Arabic pivot captions localize measures and nested dimensions without changing keys", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await visit(page, "?view=revenue&lang=ar");
  const pivot = table(page, "pivot");
  const columns = page.locator(`${part("pivot-zone")}[data-zone="columns"]`);
  const rows = page.locator(`${part("pivot-zone")}[data-zone="rows"]`);
  await expect(pivot.locator('thead [data-column-key="pivot-0"]')).toHaveText(
    "المجموع القيمة"
  );
  const measures = page.locator(`${part("pivot-zone")}[data-zone="measures"]`);
  await expect(measures.locator(part("pivot-field"))).toContainText(
    "المجموع القيمة"
  );
  await expect(measures).not.toContainText("sum");
  await measures
    .getByRole("button", { name: "إزالة الحقل: المجموع القيمة", exact: true })
    .click();
  await expect(measures.locator(part("pivot-field"))).toHaveCount(0);
  await measures.getByRole("combobox").selectOption("amount");
  await expect(measures.locator(part("pivot-field"))).toContainText(
    "المجموع القيمة"
  );
  await columns.getByRole("combobox").selectOption("status");
  for (const caption of ["للمراجعة", "جاهز", "تم الشحن"])
    await expect(
      pivot.getByRole("columnheader", { name: caption, exact: true })
    ).toBeVisible();
  await rows
    .getByRole("button", { name: "إزالة الحقل: المنطقة", exact: true })
    .click();
  await columns.getByRole("combobox").selectOption("region");
  await expect(
    pivot
      .locator(part("header-group-cell"))
      .filter({ hasText: "أوروبا" })
      .first()
  ).toBeVisible();
  await expect(
    pivot
      .locator(part("header-group-cell"))
      .filter({ hasText: "الأمريكتان" })
      .first()
  ).toBeVisible();
  await expect(
    pivot
      .locator(part("header-group-cell"))
      .filter({ hasText: "الشرق الأوسط" })
      .first()
  ).toBeVisible();
  await expect(pivot.locator("thead")).not.toContainText(
    /Review|Ready|Dispatched|Europe|Americas|Middle East|sum/u
  );
  await columns
    .getByRole("button", { name: "إزالة الحقل: المنطقة", exact: true })
    .click();
  await rows.getByRole("combobox").selectOption("region");
  await columns
    .getByRole("button", { name: "إزالة الحقل: الحالة", exact: true })
    .click();
  await rows.getByRole("combobox").selectOption("status");
  await expect(
    pivot
      .locator(part("pivot-row-header"))
      .filter({ hasText: "أوروبا" })
      .first()
  ).toBeVisible();
  await expect(
    pivot
      .locator(part("pivot-row-header"))
      .filter({ hasText: "للمراجعة" })
      .first()
  ).toBeVisible();
  await rows
    .getByRole("button", { name: "إزالة الحقل: الحالة", exact: true })
    .click();
  await columns.getByRole("combobox").selectOption("status");
  const identities = async () => ({
    columns: await pivot
      .locator("thead [data-column-key]")
      .evaluateAll((elements) =>
        elements.map((element) => element.getAttribute("data-column-key"))
      ),
    rows: await pivot
      .locator("tbody [data-row-id]")
      .evaluateAll((elements) =>
        elements.map((element) => element.getAttribute("data-row-id"))
      ),
  });
  const original = await identities();
  const configParams = () =>
    [...new URL(page.url()).searchParams].filter(([key]) =>
      key.startsWith("workspace-pivot.")
    );
  await expect
    .poll(() => new URL(page.url()).searchParams.get("workspace-pivot.pivot"))
    .toBe("rows:region;cols:status;sum:amount");
  const canonical = configParams();
  await choosePreference(page, "اللغة", "English");
  await expect(
    pivot.getByRole("columnheader", { name: "Review", exact: true })
  ).toBeVisible();
  await expect(pivot.locator('thead [data-column-key="pivot-0"]')).toHaveText(
    "Sum Value"
  );
  expect(await identities()).toEqual(original);
  expect(configParams()).toEqual(canonical);
  await choosePreference(page, "Language", "العربية");
  await page.reload();
  await expect(
    table(page, "pivot").getByRole("columnheader", {
      name: "للمراجعة",
      exact: true,
    })
  ).toBeVisible();
  expect(await identities()).toEqual(original);
  expect(configParams()).toEqual(canonical);
  await testInfo.attach("vue-workspace-arabic-pivot-columns", {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png",
  });
});

for (const scenario of [
  {
    name: "desktop",
    width: 1440,
    query: "",
    manage: "Manage saved views",
    rename: "Rename view",
    input: "View name",
    remove: "Delete view",
    default: "Set as default",
  },
  {
    name: "Arabic mobile",
    width: 390,
    query: "?lang=ar",
    manage: "إدارة طرق العرض المحفوظة",
    rename: "إعادة تسمية العرض",
    input: "اسم العرض",
    remove: "حذف العرض",
    default: "تعيين كافتراضي",
  },
]) {
  test(`saved views persist and manage the real Orders state on ${scenario.name}`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: scenario.width, height: 1000 });
    await visit(page, scenario.query);
    const orders = table(page);
    const record = (id: string) =>
      orders.locator(
        `tbody [data-row-id="${id}"], ${part("card")}[data-row-id="${id}"]`
      );
    await editOwner(record("ORD-1043"), "Sam Rivera");
    await record("ORD-1043").getByRole("checkbox").check();
    await filterOrders(page, "Ready", "Americas");
    await orders.locator(part("density-toggle")).selectOption("compact");
    if (scenario.width > 768) {
      await orders
        .getByRole("button", { name: "Sort by: Customer", exact: true })
        .click();
      await orders
        .getByRole("button", { name: "Sort by: Customer", exact: true })
        .click();
    }
    await orders.locator(part("views-button")).click();
    const menu = orders.locator(part("views-panel"));
    await menu.locator(part("views-input")).fill("Ready Americas");
    await menu.locator(part("views-save")).click();
    await expect(menu.locator(part("views-item"))).toHaveText("Ready Americas");
    const menuBounds = await menu.boundingBox();
    if (!menuBounds)
      throw new Error("The saved views menu has no visible bounds.");
    expect(menuBounds.x).toBeGreaterThanOrEqual(0);
    expect(menuBounds.x + menuBounds.width).toBeLessThanOrEqual(
      scenario.width + 1
    );
    expect(menuBounds.y).toBeGreaterThanOrEqual(0);
    expect(menuBounds.y + menuBounds.height).toBeLessThanOrEqual(1001);
    await expect(menu.locator(part("views-save"))).toBeInViewport();
    await expect(menu.locator(part("views-item"))).toBeInViewport();
    await testInfo.attach(
      `vue-workspace-saved-view-menu-${scenario.name.replaceAll(" ", "-")}`,
      { body: await page.screenshot(), contentType: "image/png" }
    );
    await page.keyboard.press("Escape");
    await expect(orders.locator(part("views-button"))).toBeFocused();
    await page
      .getByRole("button", { name: scenario.manage, exact: true })
      .click();
    const manager = orders.locator(part("saved-views-panel"));
    await manager
      .getByRole("button", { name: scenario.rename, exact: true })
      .click();
    await manager
      .getByRole("textbox", { name: scenario.input, exact: true })
      .fill("Dispatch shortlist");
    await manager
      .getByRole("textbox", { name: scenario.input, exact: true })
      .press("Enter");
    await expect(
      manager.getByRole("button", { name: "Dispatch shortlist", exact: true })
    ).toBeVisible();
    await manager
      .getByRole("button", { name: scenario.default, exact: true })
      .click();
    await expect(manager.locator(part("saved-view-default"))).toBeVisible();
    await orders.locator(part("side-panel-close")).click();
    await filterOrders(page, "Review");
    await orders.locator(part("search")).fill("Atelier");
    await orders.locator(part("density-toggle")).selectOption("comfortable");
    await expect(record("ORD-1042")).toBeVisible();
    await expect
      .poll(() => new URL(page.url()).searchParams.get("workspace-orders.q"))
      .toBe("Atelier");
    const explicitLink = page.url();
    await page.reload();
    await expect(orders.locator(part("search"))).toHaveValue("Atelier");
    await expect(record("ORD-1043")).toHaveCount(0);
    await orders.locator(part("views-button")).click();
    await menu
      .getByRole("button", { name: "Dispatch shortlist", exact: true })
      .click();
    await expect(record("ORD-1043")).toContainText("Sam Rivera");
    await expect(record("ORD-1043").getByRole("checkbox")).toBeChecked();
    await expect(record("ORD-1046")).toBeVisible();
    await expect(record("ORD-1042")).toHaveCount(0);
    await expect(orders).toHaveAttribute("data-density", "compact");
    if (scenario.width > 768)
      await expect(
        orders.locator("tbody [data-row-id]").first()
      ).toHaveAttribute("data-row-id", "ORD-1046");
    await filterOrders(page, "Review");
    await page.locator('[data-workspace-view="dispatch"]').click();
    await page.locator('[data-workspace-view="orders"]').click();
    await expect(record("ORD-1042")).toBeVisible();
    await expect(record("ORD-1043")).toHaveCount(0);
    await visit(page, scenario.query);
    await expect(record("ORD-1043")).toBeVisible();
    await expect(record("ORD-1042")).toHaveCount(0);
    const response = await page.goto(explicitLink);
    expect(response?.status()).toBe(200);
    await expect(orders.locator(part("search"))).toHaveValue("Atelier");
    await expect(record("ORD-1043")).toHaveCount(0);
    await page
      .getByRole("button", { name: scenario.manage, exact: true })
      .click();
    await manager
      .getByRole("button", { name: scenario.remove, exact: true })
      .click();
    await expect(manager.locator(part("saved-view-row"))).toHaveCount(0);
    await page.reload();
    await orders.locator(part("views-button")).click();
    await expect(menu.locator(part("views-item"))).toHaveCount(0);
    await contained(page);
    await testInfo.attach(
      `vue-workspace-saved-views-${scenario.name.replaceAll(" ", "-")}`,
      {
        body: await page.screenshot({ fullPage: true }),
        contentType: "image/png",
      }
    );
    if (scenario.width > 768) {
      const scroll = orders.locator(part("scroll-box"));
      const current = record("ORD-1042");
      const statusCell = current.locator('td[data-column-key="status"]');
      const badge = statusCell.locator(".order-status");
      const pinnedId = current.locator('td[data-column-key="id"]');
      const pinnedAmount = current.locator('td[data-column-key="amount"]');
      const previousScroll = await scroll.evaluate((element) => ({
        left: element.scrollLeft,
        top: element.scrollTop,
      }));
      const previousPageScroll = await page.evaluate(() => ({
        x: window.scrollX,
        y: window.scrollY,
      }));
      const geometry = async (name: string) => {
        const value = {
          badge: await badge.boundingBox(),
          statusCell: await statusCell.boundingBox(),
          pinnedId: await pinnedId.boundingBox(),
          pinnedAmount: await pinnedAmount.boundingBox(),
          scrollBox: await scroll.boundingBox(),
          scroll: await scroll.evaluate((element) => ({
            left: element.scrollLeft,
            top: element.scrollTop,
            width: element.scrollWidth,
            viewportWidth: element.clientWidth,
          })),
          page: await page.evaluate(() => ({
            x: window.scrollX,
            y: window.scrollY,
          })),
          viewport: page.viewportSize(),
        };
        await testInfo.attach(name, {
          body: Buffer.from(JSON.stringify(value, null, 2)),
          contentType: "application/json",
        });
        return value;
      };
      try {
        const before = await geometry(
          "vue-workspace-saved-views-before-scroll"
        );
        expect(
          before.scroll.width - before.scroll.viewportWidth
        ).toBeGreaterThan(0);
        await badge.scrollIntoViewIfNeeded();
        const target = await badge.boundingBox();
        const start = await pinnedId.boundingBox();
        const end = await pinnedAmount.boundingBox();
        if (!target || !start || !end)
          throw new Error(
            "The saved-view status or pinned cells have no bounds."
          );
        const offset =
          target.x + target.width / 2 - (start.x + start.width + end.x) / 2;
        await scroll.evaluate((element, delta) => {
          element.scrollLeft += delta;
        }, offset);
        const after = await geometry("vue-workspace-saved-views-after-scroll");
        await expect(badge).toBeInViewport({ ratio: 1 });
        await expect(badge).toHaveText("Review");
        await expect(pinnedId).toHaveCSS("position", "sticky");
        await expect(pinnedAmount).toHaveCSS("position", "sticky");
        const badgeBounds = after.badge;
        const idBounds = after.pinnedId;
        const amountBounds = after.pinnedAmount;
        if (!badgeBounds || !idBounds || !amountBounds)
          throw new Error(
            "The saved-view status or pinned cells have no bounds."
          );
        expect(badgeBounds.x).toBeGreaterThanOrEqual(
          idBounds.x + idBounds.width - 1
        );
        expect(badgeBounds.x + badgeBounds.width).toBeLessThanOrEqual(
          amountBounds.x + 1
        );
        expect(
          await badge.evaluate(
            (element) => element.scrollWidth - element.clientWidth
          )
        ).toBeLessThanOrEqual(1);
        await testInfo.attach("vue-workspace-saved-views-status-after-scroll", {
          body: await orders.screenshot(),
          contentType: "image/png",
        });
      } finally {
        await scroll.evaluate((element, position) => {
          element.scrollLeft = position.left;
          element.scrollTop = position.top;
        }, previousScroll);
        await page.evaluate((position) => {
          window.scrollTo(position.x, position.y);
        }, previousPageScroll);
      }
    }
  });
}

test("interaction during a delayed Orders load retires automatic defaults and history wins", async ({
  page,
}) => {
  await visit(page);
  await filterOrders(page, "Ready");
  await table(page).locator(part("views-button")).click();
  await table(page).locator(part("views-input")).fill("Ready default");
  await table(page).locator(part("views-save")).click();
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", { name: "Manage saved views", exact: true })
    .click();
  await table(page)
    .locator(part("saved-views-panel"))
    .getByRole("button", { name: "Set as default", exact: true })
    .click();
  let requested: (() => void) | undefined;
  let release: (() => void) | undefined;
  const seen = new Promise<void>((resolve) => {
    requested = resolve;
  });
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const chunk = "**/assets/OrderDesk-*.js";
  await page.route(chunk, async (request) => {
    requested?.();
    await gate;
    await request.continue();
  });
  const response = await page.goto(`${route}?theme=light`, {
    waitUntil: "domcontentloaded",
  });
  expect(response?.status()).toBe(200);
  await seen;
  await expect(page.locator(".workspace-loading")).toBeVisible();
  await page
    .getByRole("button", { name: "Dark appearance", exact: true })
    .click();
  release?.();
  await expect(row(table(page), "ORD-1042")).toBeVisible();
  await expect(row(table(page), "ORD-1043")).toBeVisible();
  await page.unroute(chunk);
  await table(page).locator(part("side-panel-close")).click();
  await table(page).locator(part("views-button")).click();
  await table(page)
    .locator(part("views-item"))
    .filter({ hasText: "Ready default" })
    .click();
  await expect(row(table(page), "ORD-1042")).toHaveCount(0);
  await filterOrders(page, "Review");
  await page.locator('[data-workspace-view="dispatch"]').click();
  await page.locator('[data-workspace-view="orders"]').click();
  await page.goBack();
  await expect(
    page.locator('[data-workspace-view="dispatch"]')
  ).toHaveAttribute("aria-pressed", "true");
  await page.goBack();
  await expect(row(table(page), "ORD-1042")).toBeVisible();
  await expect(row(table(page), "ORD-1043")).toHaveCount(0);
});

async function containedDispatchControls(
  page: Page,
  labels: { up: string; down: string; menu: string }
): Promise<void> {
  const cards = table(page, "dispatch").locator(part("card"));
  await expect(cards.first()).toBeVisible();
  expect(await cards.count()).toBeGreaterThan(3);
  const viewport = page.viewportSize();
  if (!viewport) throw new Error("The mobile viewport is missing.");
  for (const card of await cards.all()) {
    const controls = card.locator(part("row-reorder-buttons"));
    await expect(controls).toBeVisible();
    await controls.evaluate((element) =>
      element.scrollIntoView({ block: "center", inline: "nearest" })
    );
    const up = controls.getByRole("button", { name: labels.up, exact: true });
    const down = controls.getByRole("button", {
      name: labels.down,
      exact: true,
    });
    const menu = controls.getByRole("combobox", {
      name: labels.menu,
      exact: true,
    });
    await expect(up).toHaveText(labels.up);
    await expect(down).toHaveText(labels.down);
    const cardBounds = await card.boundingBox();
    if (!cardBounds)
      throw new Error("The Dispatch card has no visible bounds.");
    const bounds = [];
    for (const control of [up, down, menu]) {
      await expect(control).toBeVisible();
      await expect(control).toBeInViewport();
      const box = await control.boundingBox();
      if (!box) throw new Error("The reorder control has no visible bounds.");
      expect(box.x).toBeGreaterThanOrEqual(Math.max(0, cardBounds.x) - 1);
      expect(box.x + box.width).toBeLessThanOrEqual(
        Math.min(viewport.width, cardBounds.x + cardBounds.width) + 1
      );
      expect(box.y).toBeGreaterThanOrEqual(Math.max(0, cardBounds.y) - 1);
      expect(box.y + box.height).toBeLessThanOrEqual(
        Math.min(viewport.height, cardBounds.y + cardBounds.height) + 1
      );
      expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeLessThanOrEqual(48);
      bounds.push(box);
    }
    const [upBounds, downBounds, menuBounds] = bounds;
    if (!upBounds || !downBounds || !menuBounds)
      throw new Error("The complete reorder control group is missing.");
    expect(menuBounds.y).toBeGreaterThanOrEqual(
      Math.max(upBounds.y + upBounds.height, downBounds.y + downBounds.height) -
        1
    );
    for (const button of [up, down]) {
      const text = await button.evaluate((element) => {
        const range = document.createRange();
        range.selectNodeContents(element);
        return {
          lines: [...range.getClientRects()].filter((rect) => rect.width > 0)
            .length,
          overflow: element.scrollWidth - element.clientWidth,
        };
      });
      expect(text.lines).toBe(1);
      expect(text.overflow).toBeLessThanOrEqual(1);
    }
    expect(
      await menu.evaluate((element) => getComputedStyle(element).appearance)
    ).not.toBe("none");
    expect(
      await card.evaluate(
        (element) => element.scrollWidth - element.clientWidth
      )
    ).toBeLessThanOrEqual(1);
  }
}

for (const scenario of [
  {
    locale: "en",
    up: "Move row up",
    down: "Move row down",
    menu: "Move under…",
  },
  {
    locale: "ar",
    up: "نقل الصف لأعلى",
    down: "نقل الصف لأسفل",
    menu: "نقل تحت…",
  },
]) {
  test(`Dispatch card controls fit every card at narrow mobile widths in ${scenario.locale}`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await visit(page, `?view=dispatch&lang=${scenario.locale}`);
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      await containedDispatchControls(page, scenario);
      await contained(page);
      const representative = table(page, "dispatch").locator(
        `${part("card")}[data-row-id="ORD-1043"]`
      );
      await testInfo.attach(
        `vue-workspace-dispatch-controls-${scenario.locale}-${width}`,
        {
          body: await representative.screenshot(),
          contentType: "image/png",
        }
      );
    }
  });
}
