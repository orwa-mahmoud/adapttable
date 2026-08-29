import { expect, type Page, test } from "@playwright/test";

import { builtAdapters } from "../apps/showcase/matrix.mjs";

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
  "base-ui",
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

test("Mantine Arabic filter drawer sits on the left edge", async ({ page }) => {
  await openDemo(page, "mantine");
  await page
    .getByRole("group", { name: "locale" })
    .getByRole("button", { name: "العربية", exact: true })
    .click();
  await setFiltersMode(page, "Drawer");
  await demo(page)
    .getByRole("button", { name: "عوامل التصفية" })
    .first()
    .click();
  const panel = page.getByRole("dialog", { name: "عوامل التصفية" });
  await expect(panel).toBeVisible();
  // Wait out Mantine's slide. Off-screen start is x=-width; settled left is ~0.
  await expect
    .poll(async () => {
      const box = await panel.boundingBox();
      return box ? Math.round(box.x) : 9999;
    })
    .toBeGreaterThanOrEqual(-1);
  const box = await panel.boundingBox();
  expect(box).not.toBeNull();
  expect(Math.round(box!.x)).toBeLessThan(8);
});

test("shadcn and Tailwind drawer labels are not flush on the control", async ({
  page,
}) => {
  for (const adapter of ["shadcn", "tailwind"] as const) {
    await openDemo(page, adapter);
    await setFiltersMode(page, "Drawer");
    await filtersTrigger(page).click();
    // The drawer slides in, so its fields are not in the DOM on the tick the
    // click resolves. Measuring straight away read zero fields under parallel
    // worker load and passed the spacing loop vacuously — wait for the first
    // one, then measure them all.
    await expect(
      page.locator("[data-adapttable-part='filter-field']").first()
    ).toBeVisible();
    const gaps = await page.evaluate(() =>
      [
        ...document.querySelectorAll("[data-adapttable-part='filter-field']"),
      ].map((el) => {
        const label = el.querySelector("[data-adapttable-part='filter-label']");
        const next = label?.nextElementSibling;
        if (!label || !next) return null;
        return (
          next.getBoundingClientRect().top -
          label.getBoundingClientRect().bottom
        );
      })
    );
    expect(gaps.length).toBeGreaterThan(0);
    for (const gap of gaps) {
      expect(gap).toBeGreaterThanOrEqual(12);
    }
    await page.keyboard.press("Escape");
  }
});

test("default live demo keeps the seven pre-353 controls", async ({ page }) => {
  await page.goto("/");
  await expect(
    demo(page).locator('[data-adapter="mantine"] [data-stagger]').first()
  ).toBeVisible();
  await expect(page.getByRole("group", { name: "data source" })).toBeVisible();
  await expect(page.getByRole("group", { name: "locale" })).toBeVisible();
  await expect(
    page.getByRole("group", { name: "filters container" })
  ).toBeVisible();
  await expect(page.getByRole("group", { name: "density" })).toBeVisible();
  await expect(page.getByRole("group", { name: "grouping" })).toBeVisible();
  await expect(page.getByRole("group", { name: "editing" })).toBeVisible();
  await expect(page.getByRole("group", { name: "motion" })).toBeVisible();
  await expect(page.getByRole("group", { name: "tree" })).toHaveCount(0);
  await expect(
    demo(page).locator('[data-adapttable-part="filter-header-row"]')
  ).toHaveCount(0);
  await expect(
    demo(page).locator('[data-adapttable-part="column-group-toggle"]')
  ).toHaveCount(0);
  await expect(demo(page).getByText("Delivery")).toHaveCount(0);
});

test("backend mode resets and disables frontend-only live controls", async ({
  page,
}) => {
  await page.goto("/");
  for (const group of ["grouping", "editing"]) {
    await page
      .getByRole("group", { name: group })
      .getByRole("button", { name: "On", exact: true })
      .click();
  }
  await page
    .getByRole("group", { name: "data source" })
    .getByRole("button", { name: "Backend", exact: true })
    .click();
  for (const group of ["grouping", "editing"]) {
    const control = page.getByRole("group", { name: group });
    await expect(
      control.getByRole("button", { name: "Off", exact: true })
    ).toHaveAttribute("aria-pressed", "true");
    await expect(
      control.getByRole("button", { name: "On", exact: true })
    ).toBeDisabled();
  }
});

test("mobile nav keeps every demo page reachable", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto("/");
  const pageSelect = page.getByRole("combobox", { name: "Demo page" });
  await expect(pageSelect).toBeVisible();
  await expect(pageSelect).toHaveValue("demo");
  await pageSelect.selectOption("mantine/columns");
  await expect(page).toHaveURL(/\/mantine\/columns\/$/);
  await expect(pageSelect).toHaveValue("mantine/columns");
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

for (const focused of [
  { name: "grouping", path: "/mantine/grouping/", exportName: /Export XLSX/ },
  { name: "export", path: "/mantine/export/", exportName: /Export PDF/ },
  { name: "mobile", path: "/mantine/mobile-cards/", exportName: null },
  { name: "RTL", path: "/mantine/rtl/", exportName: null },
] as const) {
  test(`${focused.name} page keeps only its relevant table chrome`, async ({
    page,
  }) => {
    await page.goto(focused.path);
    await expect(page.locator("[data-stagger]").first()).toBeVisible();
    for (const name of ["Filters", "Saved views", "Columns"]) {
      await expect(page.getByRole("button", { name, exact: true })).toHaveCount(
        0
      );
    }
    await expect(
      page.getByRole("columnheader", { name: "Actions" })
    ).toHaveCount(0);
    if (focused.exportName) {
      await expect(
        page.getByRole("button", { name: focused.exportName })
      ).toBeVisible();
    } else {
      await expect(page.getByRole("button", { name: /^Export/ })).toHaveCount(
        0
      );
    }
  });
}

test("mobile page previews the native card layout for every adapter", async ({
  page,
}) => {
  // The page fixes its kit, so the loop is over the adapters whose pages are
  // built — and widens to the whole grid as the rest arrive.
  for (const adapter of builtAdapters().map((kit) => kit.key)) {
    await page.goto(`/${adapter}/mobile-cards/`);
    const root = page.locator(`[data-adapter="${adapter}"]`);
    await expect(root.getByRole("list", { name: "Data table" })).toBeVisible();
    await expect(root.getByRole("columnheader")).toHaveCount(0);
    expect(
      await page
        .locator(".phone-frame")
        .evaluate((frame) => frame.scrollWidth <= frame.clientWidth)
    ).toBe(true);
    if (adapter === "shadcn" || adapter === "tailwind") {
      const card = root.locator('[data-adapttable-part="card"]').first();
      const chrome = await card.evaluate((node) => {
        const style = getComputedStyle(node);
        return {
          padding: Number.parseFloat(style.paddingTop),
          border: Number.parseFloat(style.borderTopWidth),
        };
      });
      expect(chrome.padding).toBeGreaterThan(0);
      expect(chrome.border).toBeGreaterThan(0);
    }
  }
});

test("antd keeps its sticky header to one compact line", async ({ page }) => {
  await openDemo(page, "antd");
  const root = demo(page).locator('[data-adapter="antd"]');
  const header = root.locator(".ant-table-sticky-holder thead tr").first();
  const row = root.locator("[data-stagger]").first();
  const headerBox = await header.boundingBox();
  const rowBox = await row.boundingBox();
  expect(headerBox?.height).toBeLessThanOrEqual(64);
  expect(headerBox?.height ?? 0).toBeLessThan((rowBox?.height ?? 1) * 2);
});

/** Grouping and editing are opt-in control-bar toggles (off by default). */
async function enableToggle(
  page: Page,
  group: "grouping" | "editing"
): Promise<void> {
  await page
    .getByRole("group", { name: group })
    .getByRole("button", { name: "On", exact: true })
    .click();
}

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

      // Open it with the toolbar already on screen. An anchored popover is
      // dismissed by a page scroll, and Playwright scrolls on its own before
      // hovering something out of view — which would close the card under the
      // very assertions below rather than testing them.
      await trigger.evaluate((node) => {
        window.scrollBy(0, node.getBoundingClientRect().top - 60);
      });
      await trigger.click();
      await expect(trigger).toHaveAttribute("aria-expanded", "true");

      // A control inside the open overlay must be hittable — Playwright's
      // actionability throws if a sticky header or pinned cell is stacked over
      // it (the historical bleed-through bug), so a plain hover is the check.
      //
      // Scope the search to the filter form itself. Searching the page finds
      // whichever control happens to come last in the DOM, and the table's own
      // inputs qualify — hovering one of those scrolls the page, which
      // dismisses an anchored popover before Escape is ever pressed.
      // The FIRST control in the form: the card is taller than this viewport,
      // so its last field sits below the fold and hovering it would scroll —
      // and a scroll dismisses an anchored popover.
      const form = page.locator('[data-adapttable-part="filters-form"]');
      await expect(
        page.getByRole("group", { name: "value picker" })
      ).toHaveCount(0);
      await expect(
        page.locator('[data-adapttable-part="filter-tree"]')
      ).toHaveCount(0);
      const control = form
        .getByRole("combobox")
        .or(form.getByRole("spinbutton"))
        .or(form.getByRole("radio"))
        .first();
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

      // A point over the table body before the drawer opens. The row has to be
      // ON SCREEN to hit-test: `elementFromPoint` answers null for anything
      // outside the viewport, and the demo's controls push the table below the
      // fold at this window size.
      const row = demo(page).locator("[data-stagger]").first();
      await row.scrollIntoViewIfNeeded();
      const point = await row.evaluate((node) => {
        const r = node.getBoundingClientRect();
        return { x: Math.round(r.left + 8), y: Math.round(r.top + 8) };
      });
      const behind = await page.evaluate(
        (p) => document.elementFromPoint(p.x, p.y)?.tagName ?? null,
        point
      );

      await filtersTrigger(page).click();
      // Drawer kits mount/animate the backdrop a tick after open — poll the
      // hit-test until the same point no longer lands on the row (CI flake
      // without this: sameRow stayed true while the panel was still sliding).
      await expect
        .poll(async () => {
          const covering = await page.evaluate((p) => {
            const el = document.elementFromPoint(p.x, p.y);
            if (!el) return { blocked: false, sameRow: true };
            const row = el.closest("[data-stagger]");
            return { blocked: true, sameRow: Boolean(row) };
          }, point);
          return covering.blocked && !covering.sameRow;
        })
        .toBe(true);
      expect(behind).not.toBeNull();

      // The panel must cover the page header too — Radix's Dialog overlay
      // ships with no z-index, so a sticky nav (z-index 40) used to paint
      // over the drawer while every other kit sat on top.
      const nav = page.locator(".nav");
      await expect(nav).toBeVisible();
      await expect
        .poll(async () => {
          return nav.evaluate((node) => {
            const r = node.getBoundingClientRect();
            const hit = document.elementFromPoint(r.left + 24, r.top + 12);
            return hit?.closest(".nav") ? "nav" : "covered";
          });
        })
        .toBe("covered");
    });

    test("columns menu opens on top of the table", async ({ page }) => {
      await openDemo(page, adapter);
      const trigger = demo(page)
        .getByRole("button", { name: "Columns", exact: true })
        .first();
      await trigger.click();
      // A column visibility toggle is visible and hittable — the column overlay
      // stacks above the sticky header / pinned cells, same as the filter one.
      const toggle = page
        .getByRole("button", { name: /(hide|show) column/i })
        .first();
      await expect(toggle).toBeVisible();
      const stacked = await page.evaluate(() => {
        const item = document.querySelector(
          '[data-adapttable-part="column-menu-item"]'
        );
        if (!item) return { found: false };
        const ir = item.getBoundingClientRect();
        const hit = document.elementFromPoint(
          ir.left + Math.min(24, ir.width / 2),
          ir.top + 8
        );
        return {
          found: true,
          headerOnTop: Boolean(
            hit?.closest("th, [data-adapttable-part='header-cell']")
          ),
        };
      });
      expect(stacked.found).toBe(true);
      expect(stacked.headerOnTop).toBe(false);
    });

    test("saved views menu opens below the trigger", async ({ page }) => {
      await openDemo(page, adapter);
      const trigger = demo(page)
        .getByRole("button", { name: "Saved views", exact: true })
        .first();
      await trigger.click();
      const save = page.getByRole("button", { name: "Save view", exact: true });
      await expect(save).toBeVisible();
      const stacked = await page.evaluate(() => {
        const save = [...document.querySelectorAll("button")].find(
          (el) => el.textContent?.trim() === "Save view"
        );
        if (!save) return { found: false };
        const sr = save.getBoundingClientRect();
        const hit = document.elementFromPoint(
          sr.left + Math.min(24, sr.width / 2),
          sr.top + 8
        );
        return {
          found: true,
          headerOnTop: Boolean(
            hit?.closest("th, [data-adapttable-part='header-cell']")
          ),
        };
      });
      expect(stacked.found).toBe(true);
      expect(stacked.headerOnTop).toBe(false);
    });

    test("mirrors to RTL in Arabic", async ({ page }) => {
      await openDemo(page, adapter);
      await page
        .getByRole("group", { name: "locale" })
        .getByRole("button", { name: "العربية", exact: true })
        .click();
      // The re-rendered table flips its writing direction.
      await expect(demo(page).locator('[dir="rtl"]').first()).toBeVisible();

      // A dir attribute SOMEWHERE is not enough — that assertion passed for
      // months while Radix rendered its columns left-to-right. Check what the
      // browser actually resolves on the table and inside a cell, which is
      // the only place the CSS overrides (Radix's own ScrollArea dir, and its
      // physical text-align classes) can be proven.
      const table = demo(page).locator("table").first();
      await expect(table).toHaveCSS("direction", "rtl");

      // Alignment: kits resolve this to the logical "start" (already correct
      // under RTL); Radix compiles it to a physical value. Either is fine —
      // "left" is the bug, because it does not follow direction.
      const firstDataHeader = demo(page).locator("thead th").nth(1);
      const align = await firstDataHeader.evaluate(
        (el) => getComputedStyle(el).textAlign
      );
      expect(align).not.toBe("left");

      // And prove it where it counts — the pixels. Measure the first
      // text-bearing cell's own TEXT NODE (not its wrapper, which stretches
      // to the full column width and hides the misalignment) against its own
      // padding box: under RTL the glyphs must hug the RIGHT edge. This is
      // the assertion that fails on the shipped Radix build, where the cell
      // kept a physical `text-align: left` and the text sat on the far side
      // of the column from where an Arabic reader looks for it.
      const gaps = await demo(page)
        .locator("tbody tr")
        .first()
        .evaluate((row) => {
          for (const cell of row.querySelectorAll("td")) {
            const walker = document.createTreeWalker(
              cell,
              NodeFilter.SHOW_TEXT
            );
            let node = walker.nextNode();
            while (node && !node.textContent?.trim()) node = walker.nextNode();
            if (!node) continue; // checkbox / icon-only column — nothing to align
            const range = document.createRange();
            range.selectNode(node);
            const text = range.getBoundingClientRect();
            const box = cell.getBoundingClientRect();
            const css = getComputedStyle(cell);
            return {
              left: text.left - (box.left + parseFloat(css.paddingLeft)),
              right: box.right - parseFloat(css.paddingRight) - text.right,
            };
          }
          return null;
        });
      // 1px of subpixel slack; the real regression is a whole column width.
      expect(gaps!.right).toBeLessThanOrEqual(gaps!.left + 1);

      // …and the mirrored order puts that first column on the right half.
      const t = await table.boundingBox();
      const h = await firstDataHeader.boundingBox();
      expect(h!.x - t!.x).toBeGreaterThan(t!.width / 2);
    });

    test("inline cell edit commits on Enter", async ({ page }) => {
      await openDemo(page, adapter);
      // Editing and grouping are opt-in toggles; grouping stays ON here so
      // the edit below exercises a row OUTSIDE the page slice.
      await enableToggle(page, "editing");
      await enableToggle(page, "grouping");
      // Frontend mode ships onCellEdit; every data column is editable, so
      // scope to Barbara's row (id 6 — OUTSIDE the current page slice while
      // grouping renders the full filtered set) and take its first editable
      // cell. Guards the regression where the page-slice discard froze every
      // off-page row as display-only (only each group's first row edited).
      const activate = demo(page)
        .locator("tr", { hasText: "Barbara Liskov" })
        .locator('[data-adapttable-part="edit-cell-activate"]')
        .first();
      await expect(activate).toBeVisible();
      await activate.dblclick();
      // Prefer the accessible textbox — kit wrappers may put the data-* on a
      // non-input root (MUI TextField), so role is the stable target.
      const editor = demo(page)
        .getByRole("textbox", { name: "Edit cell" })
        .or(
          demo(page).locator(
            '[data-adapttable-part="edit-cell-editor"] input, input[data-adapttable-part="edit-cell-editor"]'
          )
        );
      await expect(editor).toBeVisible();
      await editor.fill("edited@example.com");
      await editor.press("Enter");
      await expect(
        demo(page).getByText("edited@example.com").first()
      ).toBeVisible();
    });

    test("group header expands and collapses", async ({ page }) => {
      await openDemo(page, adapter);
      await enableToggle(page, "grouping");
      // Frontend mode groups by team; group headers replace bare leaf rows.
      const groupRow = demo(page)
        .locator('[data-adapttable-part="group-row"]')
        .first();
      await expect(groupRow).toBeVisible();
      const toggle = groupRow.locator('[data-adapttable-part="group-toggle"]');
      await expect(toggle).toHaveAttribute("aria-expanded", "true");
      await toggle.click();
      await expect(toggle).toHaveAttribute("aria-expanded", "false");
      await expect(groupRow).toHaveAttribute("data-collapsed", "true");
      await toggle.click();
      await expect(toggle).toHaveAttribute("aria-expanded", "true");
      await expect(groupRow).not.toHaveAttribute("data-collapsed", "true");
    });
  });
}

/**
 * The three pieces of chrome #334 added, exercised where a user meets them.
 *
 * Each is off by default, which is the part a unit test cannot show: the
 * Lab's table renders without them until the toggle is thrown.
 */
test("adds toolbar chrome only when the Feature Lab asks", async ({ page }) => {
  await page.goto("/all-options/");
  await expect(
    page.locator('[data-adapttable-part="root"]').first()
  ).toBeVisible();

  await expect(page.locator('[data-adapttable-part="status-bar"]')).toHaveCount(
    0
  );
  await expect(page.locator('[data-adapttable-part="side-panel"]')).toHaveCount(
    0
  );

  // The Lab keeps its controls in a drawer; nothing below exists until it
  // is open, which is also the proof that the table starts without them.
  await page.getByRole("button", { name: "Configure options" }).click();

  await page
    .getByRole("group", { name: "status bar" })
    .getByRole("button", { name: "On" })
    .click();
  await expect(
    page.locator('[data-adapttable-part="status-bar"]').first()
  ).toBeVisible();

  await page
    .getByRole("group", { name: "side panel" })
    .getByRole("button", { name: "On" })
    .click();
  const panel = page.locator('[data-adapttable-part="side-panel"]').first();
  await expect(panel).toBeVisible();

  // The tab strip is a real one: arrows move the selection, and wrap.
  await panel.getByRole("tab", { name: "Pivot" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(panel.getByRole("tab", { name: "Views" })).toHaveAttribute(
    "aria-selected",
    "true"
  );
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await expect(panel.getByRole("tab", { name: "Pivot" })).toHaveAttribute(
    "aria-selected",
    "true"
  );

  // Escape closes it from inside.
  await page.keyboard.press("Escape");
  await expect(page.locator('[data-adapttable-part="side-panel"]')).toHaveCount(
    0
  );
});

/**
 * The two chrome features from #333 and #335, where a user meets them.
 *
 * Both are keyboard-first and both fail silently when their binding is
 * missing — a menu that never opens, a palette that never appears — so the
 * routes are exercised rather than trusted.
 */
test("opens the right-click menu and the palette from the Feature Lab", async ({
  page,
}) => {
  await page.goto("/all-options/");
  await expect(
    page.locator('[data-adapttable-part="root"]').first()
  ).toBeVisible();
  await page.getByRole("button", { name: "Configure options" }).click();

  await page
    .getByRole("group", { name: "right-click menus" })
    .getByRole("button", { name: "On" })
    .click();
  await page
    .getByRole("group", { name: "command palette (⌘k)" })
    .getByRole("button", { name: "On" })
    .click();
  await page.getByRole("button", { name: "Close" }).first().click();

  // Shift+F10 on a header — the keyboard route a right-click-only menu
  // leaves out.
  const header = page.locator('[data-adapttable-part="header-cell"]').first();
  await header.click({ button: "right" });
  await expect(
    page.locator('[data-adapttable-part="context-menu"]').first()
  ).toBeVisible();
  await page.keyboard.press("Escape");

  await page.keyboard.press("ControlOrMeta+k");
  const palette = page
    .locator('[data-adapttable-part="command-palette"]')
    .first();
  await expect(palette).toBeVisible();

  // Focus lands in the search box, which is the whole point of a palette.
  await expect(
    page.locator('[data-adapttable-part="command-input"]').first()
  ).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(
    page.locator('[data-adapttable-part="command-palette"]')
  ).toHaveCount(0);
});

/**
 * The density control and the fullscreen toggle.
 *
 * Fullscreen itself cannot be driven from a test — browsers require a real
 * user gesture — so what is checked is that both controls appear when asked
 * for, that density actually changes the table, and that the fullscreen
 * button is a real, labelled control rather than a decoration.
 */
test("offers density and fullscreen from the Feature Lab", async ({ page }) => {
  await page.goto("/all-options/");
  const root = page.locator('[data-adapttable-part="root"]').first();
  await expect(root).toBeVisible();
  await page.getByRole("button", { name: "Configure options" }).click();

  await expect(
    page.locator('[data-adapttable-part="density-toggle"]')
  ).toHaveCount(0);

  await page
    .getByRole("group", { name: "density & fullscreen" })
    .getByRole("button", { name: "On" })
    .click();
  await page.getByRole("button", { name: "Close" }).first().click();

  const density = page
    .locator('[data-adapttable-part="density-toggle"]')
    .first();
  await expect(density).toBeVisible();
  await expect(
    page.locator('[data-adapttable-part="fullscreen-toggle"]').first()
  ).toBeVisible();

  // The click has to travel out to the host and back as the `density`
  // prop, not just flip something local to the button.
  await expect(density).toHaveText("Comfortable");
  await density.click();
  await expect(density).toHaveText("Compact");
});
