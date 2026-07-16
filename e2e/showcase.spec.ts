import { expect, type Page, test } from "@playwright/test";

/**
 * E2E smoke suite over the real showcase — one describe block per adapter.
 * These assert the bug class jsdom can't see: filter-overlay stacking (no
 * sticky-header/pinned-cell bleed-through), the drawer backdrop actually
 * blocking the background, and the mount-animation hook tagging rows. Depth
 * lives in the unit suites; this is the real-browser net.
 */

const ADAPTERS = [
  "mantine",
  "mui",
  "chakra",
  "antd",
  "radix",
  "shadcn",
  "tailwind",
] as const;

const demo = (page: Page) => page.locator("#demo");
const filtersTrigger = (page: Page) =>
  demo(page).getByRole("button", { name: "Filters", exact: true }).first();

async function openDemo(page: Page, adapter: string): Promise<void> {
  await page.goto("/");
  // Default kit (Mantine) is eager — wait for it before switching so lazy
  // chunk requests for other kits are attributable to the click.
  await expect(
    demo(page).locator('[data-adapter="mantine"] [data-stagger]').first()
  ).toBeVisible();
  if (adapter === "mantine") return;
  const tab = page.getByTestId(`adapter-${adapter}`);
  await tab.scrollIntoViewIfNeeded();
  await tab.click();
  // startTransition keeps the previous kit painted until the new chunk is
  // ready — assert against the NEW adapter's tree, not the outgoing one.
  await expect(
    demo(page).locator(`[data-adapter="${adapter}"] [data-stagger]`).first()
  ).toBeVisible();
}

test("non-default kits load on demand (code-split)", async ({ page }) => {
  await page.goto("/");
  await expect(
    demo(page).locator('[data-adapter="mantine"] [data-stagger]').first()
  ).toBeVisible();

  const chunk = page.waitForRequest(
    (req) =>
      req.resourceType() === "script" &&
      /adapters\/MuiDemo|MuiDemo/.test(req.url())
  );
  await page.getByTestId("adapter-mui").click();
  await chunk;
  await expect(
    demo(page).locator('[data-adapter="mui"] [data-stagger]').first()
  ).toBeVisible();
});

test("install + StackBlitz CTAs sit under the kit switcher", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Copy install command" })
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Open in StackBlitz" })
  ).toBeVisible();
});

async function setFiltersMode(
  page: Page,
  mode: "Popover" | "Drawer"
): Promise<void> {
  await page
    .getByRole("group", { name: "filters container" })
    .getByRole("button", { name: mode, exact: true })
    .click();
}

for (const adapter of ADAPTERS) {
  test.describe(adapter, () => {
    test("renders the real table with animation-tagged rows", async ({
      page,
    }) => {
      await openDemo(page, adapter);
      expect(
        await demo(page).locator("[data-stagger]").count()
      ).toBeGreaterThan(0);
    });

    test("filter popover opens on top and dismisses on Escape + outside click", async ({
      page,
    }) => {
      await openDemo(page, adapter);
      await setFiltersMode(page, "Popover");
      const trigger = filtersTrigger(page);

      await trigger.click();
      await expect(trigger).toHaveAttribute("aria-expanded", "true");

      // A control inside the open overlay must be hittable — Playwright's
      // actionability throws if a sticky header or pinned cell is stacked over
      // it (the historical bleed-through bug), so a plain hover is the check.
      const control = page
        .getByRole("combobox")
        .or(page.getByRole("spinbutton"))
        .or(page.getByRole("radio"))
        .last();
      await expect(control).toBeVisible();
      await control.hover();

      // Escape while interacting inside the overlay dismisses it (some kits
      // scope their Escape listener to the open panel, so focus it first).
      await control.focus();
      await page.keyboard.press("Escape");
      await expect(trigger).toHaveAttribute("aria-expanded", "false");
      // Escape must also RESTORE focus to the trigger (CLAUDE.md overlay
      // rule) — a closed-but-focus-lost popover strands keyboard users.
      await expect(trigger).toBeFocused();

      // Re-open, then a click in the far corner (outside the anchored card)
      // dismisses it.
      await trigger.click();
      await expect(trigger).toHaveAttribute("aria-expanded", "true");
      await page.mouse.click(4, 4);
      await expect(trigger).toHaveAttribute("aria-expanded", "false");
    });

    test("filter drawer dims and blocks the background", async ({ page }) => {
      await openDemo(page, adapter);
      await setFiltersMode(page, "Drawer");

      // A point over the table body before the drawer opens.
      const point = await demo(page)
        .locator("[data-stagger]")
        .first()
        .evaluate((node) => {
          const r = node.getBoundingClientRect();
          return { x: Math.round(r.left + 8), y: Math.round(r.top + 8) };
        });
      const behind = await page.evaluate(
        (p) => document.elementFromPoint(p.x, p.y)?.tagName ?? null,
        point
      );

      await filtersTrigger(page).click();
      // With the drawer open, the same point now hits its backdrop/panel, not
      // the row that was there — the background is blocked.
      const covering = await page.evaluate((p) => {
        const el = document.elementFromPoint(p.x, p.y);
        if (!el) return { blocked: false, sameRow: false };
        const row = el.closest("[data-stagger]");
        return { blocked: true, sameRow: Boolean(row), tag: el.tagName };
      }, point);
      expect(covering.blocked).toBe(true);
      expect(covering.sameRow).toBe(false);
      expect(behind).not.toBeNull();
    });

    test("columns menu opens on top of the table", async ({ page }) => {
      await openDemo(page, adapter);
      await demo(page)
        .getByRole("button", { name: "Columns", exact: true })
        .first()
        .click();
      // A column visibility toggle is visible and hittable — the column overlay
      // stacks above the sticky header / pinned cells, same as the filter one.
      const toggle = page
        .getByRole("button", { name: /(hide|show) column/i })
        .first();
      await expect(toggle).toBeVisible();
      await toggle.hover();
    });

    test("mirrors to RTL in Arabic", async ({ page }) => {
      await openDemo(page, adapter);
      await page
        .getByRole("group", { name: "locale" })
        .getByRole("button", { name: "العربية", exact: true })
        .click();
      // The re-rendered table flips its writing direction.
      await expect(demo(page).locator('[dir="rtl"]').first()).toBeVisible();
    });
  });
}
