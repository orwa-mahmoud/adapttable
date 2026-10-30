import { expect, type Page, test } from "@playwright/test";

import { builtAdapters } from "../apps/showcase/matrix.mjs";

/**
 * The adapter the page-level checks run against — the first whose own pages
 * are built. The per-kit block at the foot of this file loops every one of
 * them, and widens to the whole grid as the rest arrive.
 */
const KIT = builtAdapters()[0]!.key;

/**
 * The /columns/ demo is the wide table: "Person" pinned to the start, eight
 * columns overflowing sideways, Columns menu + resize enabled. Only a real
 * browser can prove a pinned cell holds its offset while the scroll container
 * moves under it — the historical sticky/z-index bug class jsdom can't see.
 */

const headerCell = (page: Page, name: string) =>
  page.getByRole("columnheader", { name }).first();

async function headerX(page: Page, name: string): Promise<number> {
  const box = await headerCell(page, name).boundingBox();
  if (!box) throw new Error(`no layout box for column header "${name}"`);
  return box.x;
}

/**
 * Scroll the table's horizontal container and return the resulting offset.
 *
 * Every kit owns its own scroll box — antd wraps the body in one of its own,
 * the shared shell names it as a part — so this finds whichever is present
 * rather than hard-coding one kit's class.
 */
async function scrollTableX(page: Page, dx: number): Promise<number> {
  const scroller = page
    .locator(
      '[data-adapttable-part="scroll-box"], .ant-table-content, .ant-table-body'
    )
    .first();
  return scroller.evaluate((el, delta) => {
    el.scrollLeft += delta;
    return el.scrollLeft;
  }, dx);
}

test("the focused page has column tools without unrelated table chrome", async ({
  page,
}) => {
  await page.goto(`/${KIT}/columns/`);
  await expect(headerCell(page, "Person")).toBeVisible();
  await expect(page.getByText("Assignment", { exact: true })).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Filters", exact: true })
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Saved views", exact: true })
  ).toHaveCount(0);
  await expect(headerCell(page, "Actions")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Export XLSX/ })).toBeVisible();
});

test.describe("columns — pinning", () => {
  test("the default-pinned column holds its offset while the table scrolls sideways", async ({
    page,
  }) => {
    await page.goto(`/${KIT}/columns/`);
    await expect(headerCell(page, "Person")).toBeVisible();

    const pinBefore = await headerX(page, "Person");
    const floatBefore = await headerX(page, "Email");

    const scrolled = await scrollTableX(page, 400);
    expect(scrolled).toBeGreaterThan(200); // the container really scrolled

    // The floating column slid left with the content…
    await expect
      .poll(async () => headerX(page, "Email"))
      .toBeLessThan(floatBefore - 200);
    // …while the pinned column did not move.
    expect(Math.abs((await headerX(page, "Person")) - pinBefore)).toBeLessThan(
      2
    );

    // And nothing scrolled-under bleeds over it: the pinned header is still
    // the hittable element at its own location (hover throws otherwise).
    await headerCell(page, "Person").hover();
  });

  test("pinning a floating column through the Columns menu makes it sticky", async ({
    page,
  }) => {
    await page.goto(`/${KIT}/columns/`);
    await expect(headerCell(page, "Person")).toBeVisible();

    await page.getByRole("button", { name: "Columns", exact: true }).click();
    await page.getByRole("button", { name: "Pin to start: Status" }).click();
    await page.keyboard.press("Escape");

    // The pin applied: the header cell turned position:sticky. (antd keeps a
    // mid-table pinned column in DOM place — it slides with the content until
    // it reaches its sticky offset, then holds — so stickiness, not a fixed
    // x, is the invariant to assert.)
    await expect
      .poll(() =>
        headerCell(page, "Status").evaluate(
          (el) => getComputedStyle(el).position
        )
      )
      .toBe("sticky");

    // Scroll to the far end so Status has certainly hit its offset and stuck…
    const maxScroll = await scrollTableX(page, 10_000); // clamps to max
    expect(maxScroll).toBeGreaterThan(300);
    const stuckX = await headerX(page, "Status");
    const emailX = await headerX(page, "Email");

    // …then scroll back while Status is still within its sticky range: the
    // floating column slides with the content, the pinned one does not move.
    // The focused page intentionally has no Actions column, so its maximum
    // scroll is shorter than the kitchen-sink table's was.
    const scroll2 = await scrollTableX(page, -20);
    expect(scroll2).toBe(maxScroll - 20);
    await expect
      .poll(async () => headerX(page, "Email"))
      .toBeGreaterThan(emailX + 10);
    expect(Math.abs((await headerX(page, "Status")) - stuckX)).toBeLessThan(2);
  });
});

/**
 * Export what the user highlighted, as a real spreadsheet.
 *
 * This is the one thing no unit test can prove: that arrowing through cells,
 * holding Shift, and clicking Export produces a file the browser downloads
 * whose bytes are a valid workbook containing exactly the highlighted block.
 * The /columns/ demo runs `scope: "range"` with the XLSX writer for this
 * reason — three unit-passing keyboard bugs reached a browser before it did.
 */
test.describe("columns — export the selected range", () => {
  /** Read a little-endian unsigned integer out of the archive. */
  const readInt = (bytes: Uint8Array, at: number, size: number) => {
    let value = 0;
    for (let i = size - 1; i >= 0; i--) value = value * 256 + bytes[at + i]!;
    return value;
  };

  /** The stored entries of a ZIP, by name. Entries are uncompressed. */
  function unzip(bytes: Uint8Array): Map<string, string> {
    const decoder = new TextDecoder();
    const files = new Map<string, string>();
    let at = 0;
    while (readInt(bytes, at, 4) === 0x04034b50) {
      const size = readInt(bytes, at + 18, 4);
      const nameLength = readInt(bytes, at + 26, 2);
      const start = at + 30 + nameLength + readInt(bytes, at + 28, 2);
      files.set(
        decoder.decode(bytes.slice(at + 30, at + 30 + nameLength)),
        decoder.decode(bytes.slice(start, start + size))
      );
      at = start + size;
    }
    return files;
  }

  test("downloads a workbook holding exactly the highlighted block", async ({
    page,
  }) => {
    await page.goto(`/${KIT}/columns/`);
    await expect(headerCell(page, "Person")).toBeVisible();

    // Enter the grid at its first cell, then highlight a 2×2 block.
    const firstCell = page.locator("[data-grid-cell]").first();
    await firstCell.focus();
    await page.keyboard.press("Shift+ArrowRight");
    await page.keyboard.press("Shift+ArrowDown");
    await expect(page.locator("[data-cell-selected]")).toHaveCount(4);

    const exportButton = page.getByRole("button", { name: /Export/ });
    await expect(exportButton).toBeVisible();
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      exportButton.click(),
    ]);
    expect(download.suggestedFilename()).toBe("people.xlsx");

    const stream = await download.createReadStream();
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(Buffer.from(chunk));
    const files = unzip(new Uint8Array(Buffer.concat(chunks)));

    // A workbook, not just bytes: the parts Excel refuses to open without.
    expect([...files.keys()]).toContain("xl/worksheets/sheet1.xml");
    const sheet = files.get("xl/worksheets/sheet1.xml") ?? "";

    // Two selected columns and two selected rows — a header row plus two.
    const rows = sheet.match(/<row /g) ?? [];
    expect(rows).toHaveLength(3);
    expect(sheet).not.toContain('<c r="C1"');
  });
});

/**
 * The page's subject has to work in every kit, not just the one that loads
 * first. Both halves have been broken here before: the Columns menu was gated
 * on an antd-only flag, and the wide column set collapsed to fit in Mantine
 * because a pixel min-width was being rem-scaled to zero.
 */
/**
 * The adapters whose own pages are built. Each feature page fixes its
 * kit, so the loop is over URLs rather than over clicks on a switcher
 * the page no longer needs — and it widens to the whole grid as the
 * remaining adapters' pages arrive.
 */
const KITS = builtAdapters().map((adapter) => adapter.key);

for (const kit of KITS) {
  test(`${kit}: offers the Columns menu over a table that scrolls sideways`, async ({
    page,
  }) => {
    await page.goto(`/${kit}/columns/`);
    const root = page.locator(`[data-adapter="${kit}"]`);
    await expect(root.first()).toBeVisible();
    await expect(
      root.locator('[data-adapttable-part="column-menu-button"]').first()
    ).toBeVisible();

    // Fixed column widths must push the table past its container, or there is
    // nothing to scroll and nothing for a pinned column to stick against.
    const overflow = await root.evaluate((el) =>
      [...el.querySelectorAll("*")].some(
        (node) => node.scrollWidth > node.clientWidth + 20
      )
    );
    expect(overflow, `${kit} table does not overflow sideways`).toBe(true);
  });
}

for (const kit of KITS) {
  test(`${kit}: a pinned column's header and body cells name the edge they hold`, async ({
    page,
  }) => {
    await page.goto(`/${kit}/columns/`);
    const root = page.locator(`[data-adapter="${kit}"]`).first();
    const pinnedHeader = root
      .locator('[data-adapttable-part="header-cell"]')
      .filter({ hasText: "Person" })
      .first();
    await expect(pinnedHeader).toHaveAttribute("data-pinned", "start");
    const key = await pinnedHeader.getAttribute("data-column-key");
    const firstRow = root.locator('[data-adapttable-part="row"]').first();
    await expect(
      firstRow.locator(
        `[data-adapttable-part="cell"][data-column-key="${key}"]`
      )
    ).toHaveAttribute("data-pinned", "start");
    // A floating column says nothing.
    const floating = root
      .locator('[data-adapttable-part="header-cell"]')
      .filter({ hasText: "Status" })
      .first();
    await expect(floating).not.toHaveAttribute("data-pinned", /./);
  });
}
