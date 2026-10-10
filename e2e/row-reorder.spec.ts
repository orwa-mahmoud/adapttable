import { expect, type Locator, type Page, test } from "@playwright/test";

import { configureFeatureLab } from "./feature-lab";

/**
 * Row reorder across every kit — the grip appears when the host opts in,
 * Space lifts, arrows move, Space drops, and the first two people swap.
 * `innerText` of a row starts with the empty grip cell, so names are
 * matched from the seed, not split off the first line.
 */

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

const NAMES = [
  "Ada Lovelace",
  "Alan Turing",
  "Grace Hopper",
  "Katherine Johnson",
  "Margaret Hamilton",
  "آدا لوفليس",
  "آلان تورينغ",
  "غريس هوبر",
  "كاثرين جونسون",
  "مارغريت هاميلتون",
] as const;

const demo = (page: Page) => page.locator("#demo");
const part = (page: Page, name: string) =>
  demo(page).locator(`[data-adapttable-part="${name}"]`);
const pagePart = (page: Page, name: string) =>
  page.locator(`[data-adapttable-part="${name}"]`);

for (const locale of ["en", "ar"]) {
  test(`antd: grouped and extra rows retain native column alignment (${locale})`, async ({
    page,
  }, testInfo) => {
    await openDemo(page, "antd");
    await configureFeatureLab(page, "row structure", "Grouped");
    await enable(page, "reorder");
    await enable(page, "Extra attached to a person");
    if (locale === "ar") await configureFeatureLab(page, "locale", "العربية");
    await expect(part(page, "group-row").first()).toBeVisible();
    await expect(part(page, "full-width-row")).toHaveCount(1);
    await expect
      .poll(() =>
        demo(page).evaluate((root) => {
          const headers = [
            ...root.querySelectorAll<HTMLTableCellElement>(
              "th[data-column-key]"
            ),
          ];
          const person = headers.find(
            (header) => header.dataset.columnKey === "person"
          );
          const budget = headers.find(
            (header) => header.dataset.columnKey === "budget"
          );
          if (!person || !budget)
            throw new Error("Missing native data headers");
          let mismatch = 0;
          for (const group of root.querySelectorAll(
            '[data-adapttable-part="group-row"]'
          )) {
            for (const header of [person, budget]) {
              const cell = group.querySelector(
                `td[data-column-key="${header.dataset.columnKey}"]`
              );
              if (!cell) throw new Error("Missing native aggregate cell");
              const expected = header.getBoundingClientRect();
              const actual = cell.getBoundingClientRect();
              mismatch = Math.max(
                mismatch,
                Math.abs(actual.left - expected.left),
                Math.abs(actual.width - expected.width)
              );
            }
          }
          const extra = root.querySelector(
            '[data-adapttable-part="full-width-cell"]'
          );
          if (!extra) throw new Error("Missing native extra cell");
          const tracks = headers.map((header) =>
            header.getBoundingClientRect()
          );
          const bounds = extra.getBoundingClientRect();
          return Math.max(
            mismatch,
            Math.abs(
              bounds.left - Math.min(...tracks.map((track) => track.left))
            ),
            Math.abs(
              bounds.right - Math.max(...tracks.map((track) => track.right))
            )
          );
        })
      )
      .toBeLessThanOrEqual(1);
    await demo(page).screenshot({
      path: testInfo.outputPath(`antd-synthetic-grid-${locale}.png`),
    });
  });
}

function nameIn(text: string): string {
  return NAMES.find((name) => text.includes(name)) ?? "";
}

async function rowName(row: Locator): Promise<string> {
  const name = nameIn(await row.innerText());
  expect(name.length).toBeGreaterThan(0);
  return name;
}

async function openDemo(page: Page, adapter: string): Promise<void> {
  await page.goto("/all-options/");
  await expect(
    demo(page).locator('[data-adapter="mantine"] [data-stagger]').first()
  ).toBeVisible();
  if (adapter === "mantine") return;
  const tab = page.getByTestId(`adapter-${adapter}`);
  await tab.scrollIntoViewIfNeeded();
  await tab.click();
  await expect(
    demo(page).locator(`[data-adapter="${adapter}"] [data-stagger]`).first()
  ).toBeVisible();
}

async function enable(page: Page, group: string): Promise<void> {
  await configureFeatureLab(page, group, "On");
}

/**
 * HTML5 pointer-drag path. Playwright's `dragTo` mouse sequence does not
 * start a drag on every kit's handle (MUI / Radix IconButton swallow the
 * native gesture); dispatching the same DragEvents a completed pointer
 * drag fires still goes through the live `dropProps` the digest exists for.
 */
async function pointerDragRow(grip: Locator, target: Locator): Promise<void> {
  const toHandle = await target.elementHandle();
  expect(toHandle).not.toBeNull();
  await grip.evaluate(async (from, to) => {
    if (!(from instanceof HTMLElement) || !(to instanceof HTMLElement)) {
      throw new Error("missing drag nodes");
    }
    const dt = new DataTransfer();
    const rowId = to.getAttribute("data-row-id");
    from.dispatchEvent(
      new DragEvent("dragstart", {
        bubbles: true,
        cancelable: true,
        dataTransfer: dt,
      })
    );
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve());
    });
    const live =
      (rowId === null
        ? null
        : document.querySelector(`[data-row-id="${CSS.escape(rowId)}"]`)) ?? to;
    const bounds = live.getBoundingClientRect();
    const clientY = bounds.top + bounds.height / 2;
    live.dispatchEvent(
      new DragEvent("dragover", {
        bubbles: true,
        cancelable: true,
        dataTransfer: dt,
        clientY,
      })
    );
    live.dispatchEvent(
      new DragEvent("drop", {
        bubbles: true,
        cancelable: true,
        dataTransfer: dt,
        clientY,
      })
    );
    from.dispatchEvent(
      new DragEvent("dragend", {
        bubbles: true,
        cancelable: true,
        dataTransfer: dt,
      })
    );
  }, toHandle);
}

async function grabOneDown(page: Page, key: "ArrowDown" | "ArrowLeft") {
  const grip = part(page, "row-reorder-handle").first();
  await expect(grip).toBeVisible();
  const rows = demo(page).locator("[data-stagger]");
  const firstName = await rowName(rows.nth(0));
  const secondName = await rowName(rows.nth(1));
  expect(firstName).not.toBe(secondName);

  await grip.focus();
  await grip.press(" ");
  await expect(grip).toHaveAttribute("aria-pressed", "true");
  await grip.press(key);
  await grip.press(" ");
  await expect(grip).toHaveAttribute("aria-pressed", "false");

  await expect(rows.nth(0)).toContainText(secondName);
  await expect(rows.nth(0)).not.toContainText(firstName);
}

for (const adapter of ADAPTERS) {
  test.describe(adapter, () => {
    test("lifts a row with the keyboard and drops it one slot down", async ({
      page,
    }) => {
      await openDemo(page, adapter);
      await enable(page, "reorder");
      await grabOneDown(page, "ArrowDown");
    });

    test("reorders a row with a pointer drag", async ({ page }) => {
      await openDemo(page, adapter);
      await enable(page, "reorder");
      const rows = demo(page).locator("[data-stagger]");
      const firstName = await rowName(rows.nth(0));
      const secondName = await rowName(rows.nth(1));
      expect(firstName).not.toBe(secondName);
      const grip = part(page, "row-reorder-handle").first();
      await expect(grip).toBeVisible();
      await pointerDragRow(grip, rows.nth(1));
      await expect(rows.nth(0)).toContainText(secondName);
      await expect(rows.nth(0)).not.toContainText(firstName);
    });

    test("mirrors the horizontal grab under RTL", async ({ page }) => {
      await openDemo(page, adapter);
      await enable(page, "reorder");
      await configureFeatureLab(page, "locale", "العربية");
      await expect(demo(page).locator('[dir="rtl"]').first()).toBeVisible();
      // RTL: ArrowLeft is down, the same as ArrowDown in LTR.
      await grabOneDown(page, "ArrowLeft");
    });

    test("moves between groups and guards tree cycles", async ({ page }) => {
      await openDemo(page, adapter);
      await configureFeatureLab(page, "row structure", "Tree");
      await enable(page, "reorder");

      const treeRows = demo(page).locator("[data-stagger][data-row-id]");
      await part(page, "tree-toggle").first().click();
      await expect(treeRows.nth(5)).toBeVisible();
      await pointerDragRow(
        part(page, "row-reorder-handle").first(),
        treeRows.nth(1)
      );
      await expect(part(page, "row-reorder-announcer")).toContainText(
        "cannot move inside"
      );
      const treeTrigger = part(page, "row-move-menu-trigger").first();
      await expect(treeTrigger).toBeVisible();
      await treeTrigger.focus();
      await treeTrigger.press("Enter");
      const cycleTarget = page.locator(
        '[data-adapttable-part="row-move-menu-item"][title*="cannot move inside"]:visible'
      );
      await expect(cycleTarget.first()).toBeVisible();
      await page.keyboard.press("Escape");

      await configureFeatureLab(page, "row structure", "Grouped");
      const groupedRows = demo(page).locator("[data-stagger][data-row-id]");
      await expect(groupedRows).toHaveCount(30);
      const groupedGrip = part(page, "row-reorder-handle").first();
      const movedRowId = await groupedGrip.evaluate((node) =>
        node.closest("[data-row-id]")?.getAttribute("data-row-id")
      );
      await groupedGrip.evaluate((element) =>
        element.scrollIntoView({ block: "center" })
      );
      await expect(groupedGrip).toBeInViewport();
      await pointerDragRow(groupedGrip, groupedRows.last());
      let confirmation = page.locator(
        '[data-adapttable-part="row-move-confirmation"]:visible'
      );
      await expect(confirmation).toBeVisible();
      const confirm = confirmation.getByRole("button", { name: "Move" });
      await confirm.focus();
      await confirm.press("Enter");
      await expect(part(page, "row-reorder-announcer")).toContainText(
        "Row moved to"
      );
      await expect(
        page.locator('[data-adapttable-part="row-move-confirmation"]:visible')
      ).toHaveCount(0);
      if (adapter === "antd")
        await expect(
          demo(page).locator(
            `[data-row-id="${movedRowId}"] [data-adapttable-part="row-move-menu-trigger"]`
          )
        ).toBeFocused();

      const trigger = part(page, "row-move-menu-trigger").first();
      await expect(trigger).toBeVisible();
      const triggerRowId = await trigger.evaluate((node) =>
        node.closest("[data-row-id]")?.getAttribute("data-row-id")
      );
      expect(triggerRowId).toBeTruthy();
      // The previous focus restore can start the page's smooth scroll.
      // Position this row immediately so the click reaches its trigger.
      await trigger.evaluate((element) =>
        window.scrollBy({
          top: element.getBoundingClientRect().top - 300,
          behavior: "instant",
        })
      );
      // Click, not Space: after the confirm dialog closes, Space is eaten by
      // a kit overlay that is no longer :visible but still intercepts keys.
      await trigger.click();
      const destination = pagePart(page, "row-move-menu-item")
        .filter({
          visible: true,
        })
        .first();
      await expect(destination).toBeVisible();
      await destination.click();
      confirmation = page.locator(
        '[data-adapttable-part="row-move-confirmation"]:visible'
      );
      await expect(confirmation).toBeVisible();
      const cancel = confirmation.getByRole("button", { name: "Cancel" });
      await cancel.focus();
      await cancel.press("Enter");
      // `.first()` is a different trigger after the grouped remount — cancel
      // returns focus to the row that opened the menu.
      await expect(
        demo(page).locator(
          `[data-row-id="${triggerRowId}"] [data-adapttable-part="row-move-menu-trigger"]`
        )
      ).toBeFocused();
    });

    test("keeps nested move controls on mobile RTL cards", async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await openDemo(page, adapter);
      await configureFeatureLab(page, "row structure", "Tree");
      await enable(page, "reorder");
      await configureFeatureLab(page, "locale", "العربية");

      await expect(demo(page).locator('[dir="rtl"]').first()).toBeVisible();
      await expect(part(page, "row-reorder-buttons").first()).toBeVisible();
      await expect(part(page, "row-move-menu-trigger").first()).toBeVisible();
      await expect(part(page, "row-reorder-handle")).toHaveCount(0);
    });
  });
}
