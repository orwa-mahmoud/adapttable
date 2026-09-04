import { expect, type Page, test } from "@playwright/test";

import {
  builtAdapters,
  CANONICAL_AI_ADAPTER,
} from "../apps/showcase/matrix.mjs";

/**
 * Feature 21: every published kit mounts a real table and a labelled
 * tool-call playground. Not a language model.
 */
const kits = builtAdapters().map((adapter) => adapter.key);

async function mountedTable(page: Page) {
  const table = page.getByRole("table");
  const cards = page.getByRole("list", { name: "Data table" });
  await expect(table.or(cards).first()).toBeVisible();
  return table.or(cards).first();
}

async function openPlayground(page: Page, kit: string): Promise<void> {
  await page.goto(`/${kit}/ai/`);
  await expect(page.locator(".ai-play")).toBeVisible();
  await mountedTable(page);
  await expect.poll(async () => catalogText(page)).toContain("view.setFilters");
}

async function catalogText(page: Page): Promise<string> {
  return (await page.getByTestId("ai-catalog").innerText()).trim();
}

async function jonahSalary(page: Page): Promise<string> {
  const row = page.getByRole("row", { name: /Jonah/ });
  const editor = row.locator('[data-adapttable-part="edit-cell-editor"]');
  if ((await editor.count()) > 0) return (await editor.inputValue()).trim();
  const spin = row.getByRole("spinbutton");
  if ((await spin.count()) > 0) return (await spin.inputValue()).trim();
  return (await row.getByRole("cell").nth(2).innerText()).trim();
}

for (const kit of kits) {
  test(`${kit} AI page is a real kit table with a live catalog`, async ({
    page,
  }) => {
    await openPlayground(page, kit);
    const catalog = await catalogText(page);
    expect(catalog).toContain("view.setFilters");
    expect(catalog).toContain("edit.cells");
    expect(catalog).not.toMatch(/pivot/i);
    expect(catalog).not.toContain("view.setGroupBy");
    await expect(
      page.locator(".ai-play").getByRole("link", { name: "AI integrations" })
    ).toHaveAttribute("href", /ai-integrations/);
    await expect(
      page.getByRole("region", { name: /Tool-call playground/ })
    ).toBeVisible();
    await expect(
      page.getByRole("radiogroup", { name: "Live catalog" })
    ).toBeVisible();
    await expect(page.getByTestId("ai-mode-simulated")).toHaveAttribute(
      "aria-checked",
      "true"
    );
    await expect(page.getByTestId("ai-backend")).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Filter Core team" })
    ).toBeVisible();
  });

  test(`${kit} catalog drops edit.cells when editing is turned off`, async ({
    page,
  }) => {
    await openPlayground(page, kit);
    expect(await catalogText(page)).toContain("edit.cells");
    await page.getByTestId("ai-allow-edit").click();
    await expect
      .poll(async () => catalogText(page))
      .not.toContain("edit.cells");
    expect(await catalogText(page)).toContain("view.setFilters");
    await page.getByTestId("ai-allow-edit").click();
    await expect.poll(async () => catalogText(page)).toContain("edit.cells");
  });

  test(`${kit} filter and approved write go through the live session`, async ({
    page,
  }) => {
    await openPlayground(page, kit);
    expect(await jonahSalary(page)).toBe("155");
    await page.getByRole("button", { name: "Propose Jonah's salary" }).click();
    const strip = page.locator('[data-adapttable-part="agent-approval"]');
    await expect(strip).toBeVisible();
    await page
      .locator('[data-adapttable-part="agent-approval-approve"]')
      .click();
    await expect(strip).toHaveCount(0);
    await expect(
      page.locator('[data-adapttable-part="batch-edit-bar"]')
    ).toBeVisible();
    await page.locator('[data-adapttable-part="batch-edit-save"]').click();
    await expect(
      page.locator('[data-adapttable-part="batch-edit-bar"]')
    ).toHaveCount(0);
    expect(await jonahSalary(page)).toBe("20000");

    await page.getByRole("button", { name: "Filter Core team" }).click();
    await expect(page.getByText("Chioma Eze")).toBeVisible();
    await expect(page.getByText("Jonah Okonkwo")).toHaveCount(0);
    await expect(page.getByText("Sefa Demir")).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Propose Jonah's salary" })
    ).toBeDisabled();
    await page.getByRole("button", { name: "Clear filter" }).click();
    await expect(page.getByText("Jonah Okonkwo")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Propose Jonah's salary" })
    ).toBeEnabled();
  });
}

test("Connect backend stays idle until Connect and returns to simulated", async ({
  page,
}) => {
  await openPlayground(page, CANONICAL_AI_ADAPTER);
  await page.getByTestId("ai-mode-backend").click();
  await expect(page.getByTestId("ai-backend")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Filter Core team" })
  ).toHaveCount(0);
  await expect(page.getByTestId("ai-backend-send")).toHaveCount(0);
  await expect(page.getByTestId("ai-backend-connect")).toBeEnabled();
  await mountedTable(page);
  await page.getByTestId("ai-mode-simulated").click();
  await expect(page.getByTestId("ai-backend")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Filter Core team" })
  ).toBeVisible();
});

test("AI demo nav goes to the canonical kit page", async ({ page }) => {
  await page.goto("/");
  const link = page.locator(".nav").getByRole("link", { name: "AI demo" });
  await expect(link).toBeVisible();
  await expect(link).toHaveAttribute(
    "href",
    new RegExp(`${CANONICAL_AI_ADAPTER}/ai`)
  );
  await link.click();
  await expect(page.locator(".ai-play")).toBeVisible();
  await mountedTable(page);
});

test("switching kits keeps the same playground scenario", async ({ page }) => {
  await openPlayground(page, CANONICAL_AI_ADAPTER);
  await page.getByRole("button", { name: "Filter Core team" }).click();
  await expect(page.getByText("Chioma Eze")).toBeVisible();
  const other = builtAdapters().find(
    (adapter) => adapter.key !== CANONICAL_AI_ADAPTER
  );
  if (!other) throw new Error("expected another published kit");
  const switcher = page.getByRole("navigation", {
    name: "Same playground in another adapter",
  });
  await switcher.getByRole("link", { name: other.label, exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/${other.key}/ai/`));
  await expect(page.locator(".ai-play")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Filter Core team" })
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Propose Jonah's salary" })
  ).toBeVisible();
  await mountedTable(page);
});

test("keyboard reaches catalog, actions and the table", async ({ page }) => {
  await openPlayground(page, CANONICAL_AI_ADAPTER);
  await page.locator(".ai-play__key").first().focus();
  await expect(page.locator(".ai-play__key").first()).toBeFocused();
  await page.getByRole("button", { name: "Filter Core team" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText("Chioma Eze")).toBeVisible();
  await (await mountedTable(page)).focus();
});

test("RTL playground keeps the catalog and table readable", async ({
  page,
}) => {
  await page.goto(`/${CANONICAL_AI_ADAPTER}/ai/?dir=rtl`);
  await expect(page.locator(".mx-demo")).toHaveAttribute("dir", "rtl");
  await expect(page.locator(".ai-play")).toBeVisible();
  await mountedTable(page);
});

test("mobile playground stays usable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openPlayground(page, CANONICAL_AI_ADAPTER);
  await expect(
    page.getByRole("button", { name: "Filter Core team" })
  ).toBeVisible();
  await expect(page.getByTestId("ai-catalog")).toBeVisible();
});
