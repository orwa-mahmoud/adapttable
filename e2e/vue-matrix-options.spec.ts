/** Composed native pages must complete their advertised host-owned workflows. */
import { readFile } from "node:fs/promises";

import { expect, type Locator, type Page, test } from "@playwright/test";

import { builtAdapters, pathOf } from "../apps/showcase/matrix.mjs";

function part(page: Page, name: string): Locator {
  return page.locator(`.mx-demo [data-adapttable-part="${name}"]`);
}

async function toggle(checkbox: Locator): Promise<void> {
  await expect(checkbox).toBeAttached();
  const label = checkbox.locator("xpath=ancestor::label").first();
  if (await label.count()) await label.click();
  else await checkbox.click();
}

async function choose(
  page: Page,
  label: string | Locator,
  value: string,
  option: string
): Promise<void> {
  const field =
    typeof label === "string"
      ? page.getByRole("combobox", { name: label, exact: true })
      : label;
  if (await field.evaluate((element) => element instanceof HTMLSelectElement)) {
    await field.selectOption(value);
    return;
  }
  const nativeRoot = field
    .locator(
      "xpath=ancestor::*[contains(concat(' ', normalize-space(@class), ' '), ' el-select ') or contains(concat(' ', normalize-space(@class), ' '), ' v-field ')]"
    )
    .first();
  const trigger = (await nativeRoot.count()) ? nativeRoot : field;
  // A grouping write changes page height. Finish positioning the native
  // control before pressing it, so smooth page scroll cannot move the
  // wrapper away from the pointer between actionability and mousedown.
  await trigger.evaluate((element) =>
    element.scrollIntoView({ block: "center", behavior: "instant" })
  );
  await trigger.click();
  await page.getByRole("option", { name: option, exact: true }).click();
}

for (const kit of builtAdapters("vue")) {
  for (const width of [1440, 390]) {
    const route = (slug: string, query = "") =>
      `/vue/${pathOf(kit)}/${slug}/?locale=en${query}`;
    const rowPart = width === 390 ? "card" : "row";

    test(`${kit.key}/columns: ${width}px rename, pin, reorder and resize persist`, async ({
      page,
    }, info) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(route("columns"));
      const trigger = part(page, "column-menu-button");
      await page.evaluate(() => document.fonts.ready.then(() => undefined));
      await trigger.evaluate((element) =>
        window.scrollBy({
          top: element.getBoundingClientRect().top - 300,
          behavior: "instant",
        })
      );
      await trigger.focus();
      await trigger.press("Enter");
      const panel = page.locator('[data-adapttable-part="column-menu-panel"]');
      await expect(panel).toBeVisible();
      const boundary =
        kit.key === "quasar"
          ? panel
              .locator(
                "xpath=ancestor::*[contains(concat(' ', normalize-space(@class), ' '), ' q-menu ')]"
              )
              .first()
          : panel;
      await expect
        .poll(async () => {
          const box = await boundary.boundingBox();
          return (
            box !== null &&
            box.x >= 0 &&
            box.x + box.width <= width + 1 &&
            box.y >= 0 &&
            box.y + box.height <= 901
          );
        })
        .toBe(true);
      await expect
        .poll(async () => {
          const [content, outer] = await Promise.all([
            panel.boundingBox(),
            boundary.boundingBox(),
          ]);
          return (
            content !== null &&
            outer !== null &&
            content.x >= outer.x - 1 &&
            content.x + content.width <= outer.x + outer.width + 1
          );
        })
        .toBe(true);
      const item = (key: string) =>
        panel.locator('[data-adapttable-part="column-menu-item"]').filter({
          has: page
            .locator('[data-adapttable-part="column-menu-label"]')
            .filter({
              hasText: key === "person" ? /^(Person|Display name)$/ : /^Team$/,
            }),
        });
      await item("person")
        .locator('[data-adapttable-part="column-menu-more"]')
        .click();
      await item("person")
        .getByRole("button", { name: "Rename column", exact: true })
        .click();
      const editor = panel
        .locator('[data-adapttable-part="column-rename-form"]')
        .getByRole("textbox");
      const fitsPanel = () =>
        expect
          .poll(() =>
            panel.evaluate((element) => {
              const box = element.getBoundingClientRect();
              return {
                left: box.left >= 0,
                right: box.right <= window.innerWidth + 1,
                fits: element.scrollWidth <= element.clientWidth + 1,
              };
            })
          )
          .toEqual({ left: true, right: true, fits: true });
      await fitsPanel();
      await editor.fill("Display name");
      await editor.press("Enter");
      await expect(
        item("person").locator('[data-adapttable-part="column-menu-label"]')
      ).toHaveText("Display name");
      await fitsPanel();
      if (kit.key === "vue-unstyled")
        await expect
          .poll(() =>
            panel
              .locator('[data-adapttable-part="column-menu-title"]')
              .evaluate((element) => {
                const box = element.getBoundingClientRect();
                return element.ownerDocument
                  .elementsFromPoint(
                    box.left + box.width / 2,
                    box.top + box.height / 2
                  )
                  .includes(element);
              })
          )
          .toBe(true);
      const capture = info.outputPath(`${kit.key}-${width}-column-menu.png`);
      await page.screenshot({ path: capture, animations: "disabled" });
      await info.attach("native column menu", {
        path: capture,
        contentType: "image/png",
      });
      await expect
        .poll(() => new URL(page.url()).searchParams.get("cols.colName"))
        .toContain("Display%20name");
      const team = item("team");
      if (kit.key === "quasar" && width === 390)
        await expect
          .poll(
            async () =>
              (
                await team
                  .locator('[data-adapttable-part="column-menu-label"]')
                  .boundingBox()
              )?.width ?? 0
          )
          .toBeGreaterThan(56);
      await team.locator('[data-adapttable-part="column-menu-pin"]').click();
      await expect(team).toHaveAttribute("data-pinned", "start");
      await team
        .locator('[data-adapttable-part="column-menu-grip"]')
        .press("ArrowUp");
      await expect(
        team.locator('[data-adapttable-part="column-menu-grip"]')
      ).toBeFocused();
      await expect(
        panel.locator('[data-adapttable-part="column-menu-item"]').first()
      ).toContainText("Team");
      await page.keyboard.press("Escape");
      await expect(panel).toBeHidden();
      await expect(trigger).toBeFocused();
      if (width === 1440) {
        const header = page.locator('.mx-demo th[data-column-key="person"]');
        const previous = (await header.boundingBox())?.width ?? 0;
        const handle = header.locator('[data-adapttable-part="resize-handle"]');
        await handle.focus();
        await handle.press("ArrowRight");
        await expect
          .poll(async () => (await header.boundingBox())?.width ?? 0)
          .toBeGreaterThan(previous + 10);
      } else {
        await expect(part(page, "card").first()).toContainText("Ada Lovelace");
      }
      await expect
        .poll(() => new URL(page.url()).searchParams.get("cols.colName"))
        .toContain("Display%20name");
      await expect
        .poll(() => new URL(page.url()).searchParams.get("cols.colPin"))
        .toContain("team");
      await expect
        .poll(() => new URL(page.url()).searchParams.get("cols.colOrder"))
        .toContain("team");
      if (width === 1440)
        await expect
          .poll(() => new URL(page.url()).searchParams.get("cols.colW"))
          .toContain("person");
      await page.reload();
      await expect(part(page, rowPart).first()).toBeVisible();
      await page.evaluate(() => document.fonts.ready.then(() => undefined));
      await trigger.evaluate((element) =>
        window.scrollBy({
          top: element.getBoundingClientRect().top - 300,
          behavior: "instant",
        })
      );
      await trigger.press("Enter");
      await expect(item("person")).toContainText("Display name");
      await expect(item("team")).toHaveAttribute("data-pinned", "start");
      await expect(
        panel.locator('[data-adapttable-part="column-menu-item"]').first()
      ).toContainText("Team");
    });

    test(`${kit.key}/filtering: ${width}px advanced AND/OR and header funnels filter real rows`, async ({
      page,
    }, info) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(route("filtering"));
      const rows = part(page, rowPart);
      const trigger = part(page, "filters-button");
      await trigger.click();
      const surface = page.locator('[data-adapttable-part="filters-popover"]');
      await expect(surface).toBeVisible();
      await surface
        .getByText("Advanced", { exact: true })
        .filter({ visible: true })
        .click();
      await surface
        .getByRole("button", { name: "Add condition", exact: true })
        .click();
      const conditions = surface.locator(
        '[data-adapttable-part="filter-tree-condition"]'
      );
      await expect(conditions).toHaveCount(1);
      await conditions
        .first()
        .getByRole("textbox", { name: "Value", exact: true })
        .fill("Ada Lovelace");
      await expect(rows).toHaveCount(1);
      await surface
        .getByRole("button", { name: "Add condition", exact: true })
        .click();
      await conditions
        .last()
        .getByRole("textbox", { name: "Value", exact: true })
        .fill("Grace Hopper");
      await expect(rows).toHaveCount(0);
      await choose(
        page,
        surface.getByRole("combobox", { name: "Advanced", exact: true }),
        "or",
        "OR"
      );
      await expect(rows).toHaveCount(2);
      await surface
        .getByRole("button", { name: "Add group", exact: true })
        .click();
      await expect(
        surface.locator('[data-adapttable-part="filter-tree-group"]')
      ).toHaveCount(2);
      await conditions.first().scrollIntoViewIfNeeded();
      const capture = info.outputPath(
        `${kit.key}-${width}-advanced-filters.png`
      );
      await page.screenshot({ path: capture, animations: "disabled" });
      await info.attach("native advanced filters", {
        path: capture,
        contentType: "image/png",
      });
      await surface
        .getByRole("button", { name: "Remove group", exact: true })
        .click();
      await expect(
        surface.locator('[data-adapttable-part="filter-tree-group"]')
      ).toHaveCount(1);
      await surface.locator('[data-adapttable-part="filters-clear"]').click();
      await expect(rows).toHaveCount(25);
      await page.keyboard.press("Escape");
      await expect(trigger).toBeFocused();
      await page.getByLabel("Filter layout").selectOption("header");
      const funnels = part(page, "filter-header-trigger");
      if (width === 390) {
        await expect(funnels).toHaveCount(0);
        return;
      }
      const person = page.getByRole("button", {
        name: "Filters: Person",
        exact: true,
      });
      await expect(person).toBeVisible();
      await person.focus();
      await person.press("Enter");
      const input = page.getByRole("textbox", { name: "Person", exact: true });
      await input.fill("Ada Lovelace");
      await expect(rows).toHaveCount(1);
      await input.press("Escape");
      await expect(person).toBeFocused();
      await part(page, "chip-remove").first().click();
      await expect(rows).toHaveCount(25);
    });

    test(`${kit.key}/column-groups: ${width}px each collapse presentation retains its data`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(route("column-groups"));
      const rows = part(page, rowPart);
      await expect(rows.first()).toContainText("Ada Lovelace");
      const toggles = part(page, "column-group-toggle");
      if (width === 390) {
        // Card labels expose the leaves; grouped headers belong to the desktop table.
        await expect(toggles).toHaveCount(0);
        await expect(
          rows.first().locator('[data-adapttable-part="card-value"]')
        ).toHaveCount(6);
        return;
      }
      await expect(toggles).toHaveCount(3);
      const cells = rows.first().locator('[data-adapttable-part="cell"]');
      await expect(cells).toHaveCount(6);
      for (let group = 0; group < 3; group++) {
        const toggle = toggles.nth(group);
        await toggle.focus();
        await toggle.press("Enter");
        await expect(toggle).toHaveAttribute("aria-expanded", "false");
        await expect(rows.first()).toContainText("Ada Lovelace");
        await expect(cells).toHaveCount(group < 2 ? 5 : 6);
        if (group === 0)
          await expect(
            rows.first().locator('[data-column-key="status"]')
          ).toHaveCount(0);
        if (group === 1)
          await expect(rows.first()).toContainText("$25,300 budget");
        await toggle.press("Enter");
        await expect(toggle).toHaveAttribute("aria-expanded", "true");
        await expect(cells).toHaveCount(6);
      }
    });

    test(`${kit.key}/grouping: ${width}px groups and aggregate controls update and persist`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(route("grouping"));
      const items = part(page, "grouping-item");
      await expect(items).toHaveCount(2);
      const rows = part(page, rowPart);
      const initial = await rows.count();
      const branch = part(page, "group-toggle").first();
      await branch.focus();
      await branch.press("Enter");
      await expect(branch).toHaveAttribute("aria-expanded", "false");
      await expect.poll(() => rows.count()).toBeLessThan(initial);
      await branch.press("Enter");
      await expect(rows).toHaveCount(initial);
      await page
        .getByLabel("Remove Team from grouping", { exact: true })
        .click();
      await expect(items).toHaveCount(1);
      await choose(page, "Add grouping column", "team", "Team");
      await expect(items).toHaveCount(2);
      await page.reload();
      await expect(items).toHaveCount(2);
      await expect(items.first()).toContainText("Status");
      await expect(items.last()).toContainText("Team");
      const aggregates = part(page, "grouping-aggregation-item");
      const count = await aggregates.count();
      expect(count).toBeGreaterThan(0);
      await part(page, "grouping-aggregation-remove").first().click();
      await expect(aggregates).toHaveCount(count - 1);
      await part(page, "grouping-aggregations-restore").click();
      await expect(aggregates).toHaveCount(count);
    });

    for (const tier of ["frontend", "server", "query"]) {
      test(`${kit.key}/scale: ${width}px ${tier} moves the real row window`, async ({
        page,
      }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(route("scale", `&tier=${tier}`));
        const rows = part(page, rowPart);
        await expect(rows.first()).toBeVisible();
        if (tier === "query") {
          await expect(rows).toHaveCount(10);
          await page
            .getByRole("button", { name: "Use alternate data", exact: true })
            .click();
          await expect(rows).toHaveCount(2);
          await expect(rows.first()).toContainText("Alternate Ada Lovelace");
          await page
            .getByRole("button", { name: "Use alternate data", exact: true })
            .click();
          await expect(rows).toHaveCount(10);
          await expect(rows.first()).toContainText("Ada Lovelace");
          return;
        }
        expect(await rows.count()).toBeLessThan(50);
        const firstId = await rows.first().getAttribute("data-row-id");
        const scroll = part(page, "scroll-box");
        await scroll.evaluate((element) => {
          element.scrollTop = 2000;
        });
        await expect(rows.first()).not.toHaveAttribute("data-row-id", firstId!);
        expect(await rows.count()).toBeLessThan(50);
        await scroll.evaluate((element) => {
          element.scrollTop = 0;
        });
        await expect(rows.first()).toHaveAttribute("data-row-id", firstId!);
      });
    }

    test(`${kit.key}/tree: ${width}px keyboard branches retain rows and hierarchy`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(route("tree"));
      const rows = part(page, rowPart);
      const branch = part(page, "tree-toggle").first();
      await expect(branch).toHaveAttribute("aria-expanded", "false");
      const initial = await rows.count();
      await branch.focus();
      await branch.press("ArrowRight");
      await expect(branch).toHaveAttribute("aria-expanded", "true");
      await expect.poll(() => rows.count()).toBeGreaterThan(initial);
      await expect(
        rows.locator("xpath=self::*[@aria-level='2']").first()
      ).toBeVisible();
      await branch.press("ArrowLeft");
      await expect(rows).toHaveCount(initial);
      await expect(branch).toBeFocused();
      await branch.press("Enter");
      await expect(branch).toHaveAttribute("aria-expanded", "true");
    });

    test(`${kit.key}/nested-tables: ${width}px native children open and close independently`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(route("nested-tables"));
      const nested = part(page, "nested-table");
      await expect(nested).toHaveCount(1);
      await expect(nested).toHaveAttribute(
        "aria-label",
        "Orders for Ada Lovelace"
      );
      await expect(
        nested.getByText("Item", { exact: true }).first()
      ).toBeVisible();
      const roots = part(page, "root");
      const parent = roots.first();
      const first = parent
        .locator('[data-adapttable-part="expand-button"]')
        .first();
      await first.focus();
      await first.press("Enter");
      await expect(nested).toHaveCount(0);
      await expect(first).toHaveAttribute("aria-expanded", "false");
      await first.press("Enter");
      await expect(nested).toHaveCount(1);
      const second = parent
        .locator(`[data-adapttable-part="${rowPart}"][data-row-id="2"]`)
        .locator('[data-adapttable-part="expand-button"]');
      await second.click();
      await expect(nested).toHaveCount(2);
      await first.click();
      await expect(nested).toHaveCount(1);
      await expect(nested).not.toHaveAttribute(
        "aria-label",
        "Orders for Ada Lovelace"
      );
    });

    test(`${kit.key}/row-reordering: ${width}px keyboard move and cancel reach the host once`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(route("row-reordering"));
      const rows = part(page, rowPart);
      await expect(rows.first()).toContainText("Ada Lovelace");
      if (width === 390) {
        const down = rows
          .first()
          .locator('[data-adapttable-part="row-reorder-down"]');
        await down.focus();
        await down.press("Enter");
        await expect(rows.nth(1)).toContainText("Ada Lovelace");
        await expect(page.locator("[data-demo-log]")).toHaveText(
          "Moved Ada Lovelace from 1 to 2"
        );
        await rows
          .nth(1)
          .locator('[data-adapttable-part="row-reorder-up"]')
          .press("Enter");
        await expect(rows.first()).toContainText("Ada Lovelace");
        await expect(page.locator("[data-demo-log]")).toHaveText(
          "Moved Ada Lovelace from 2 to 1"
        );
        return;
      }
      const handle = rows
        .first()
        .locator('[data-adapttable-part="row-reorder-handle"]');
      await handle.focus();
      await handle.press("Space");
      await handle.press("ArrowDown");
      await handle.press("Space");
      await expect(rows.nth(1)).toContainText("Ada Lovelace");
      await expect(page.locator("[data-demo-log]")).toHaveText(
        "Moved Ada Lovelace from 1 to 2"
      );
      const moved = rows
        .nth(1)
        .locator('[data-adapttable-part="row-reorder-handle"]');
      await moved.press("Space");
      await moved.press("ArrowDown");
      await moved.press("Escape");
      await expect(rows.nth(1)).toContainText("Ada Lovelace");
      await expect(page.locator("[data-demo-log]")).toHaveText(
        "Moved Ada Lovelace from 1 to 2"
      );
    });

    test(`${kit.key}/rows: ${width}px add, duplicate, pin and delete use native menus`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(route("rows"));
      await page.evaluate(() => document.fonts.ready.then(() => undefined));
      await part(page, "add-row").click();
      const rows = page.locator(".mx-demo [data-row-id]");
      const added = rows.filter({ hasText: "New person" });
      await expect(added).toHaveCount(1);
      const action = async (label: string) => {
        const trigger = added
          .first()
          .locator('[data-adapttable-part="row-actions-trigger"]');
        await trigger.evaluate((element) =>
          window.scrollBy({
            top: element.getBoundingClientRect().top - 300,
            behavior: "instant",
          })
        );
        await trigger.click();
        const owner = kit.key === "element-plus" ? added.first() : page;
        const choice = owner
          .getByLabel(label, { exact: true })
          .filter({ visible: true });
        await expect(choice).toHaveCount(1);
        await choice.click();
        await expect(choice).toBeHidden();
        if (kit.key === "vuetify")
          await expect(
            page.locator('[data-adapttable-part="row-actions-menu"]')
          ).toHaveCount(0);
      };
      await action("Duplicate row");
      await expect(added).toHaveCount(2);
      await action("Pin to top");
      await expect(rows.first()).toContainText("New person");
      await action("Unpin row");
      const remove = async (accept: boolean) => {
        let dialogHandled = Promise.resolve();
        if (kit.key !== "element-plus")
          dialogHandled = new Promise<void>((resolve, reject) => {
            page.once("dialog", async (dialog) => {
              try {
                expect(dialog.type()).toBe("confirm");
                expect(dialog.message()).toContain("Delete this row?");
                if (accept) await dialog.accept();
                else await dialog.dismiss();
                resolve();
              } catch (error) {
                reject(
                  error instanceof Error ? error : new Error(String(error))
                );
              }
            });
          });
        await action("Delete row");
        await dialogHandled;
        if (kit.key === "element-plus") {
          const dialog = page.getByRole("dialog", {
            name: "Delete row",
            exact: true,
          });
          await expect(dialog).toBeVisible();
          await dialog
            .getByRole("button", {
              name: accept ? "Delete row" : "Cancel",
              exact: true,
            })
            .click();
          await expect(dialog).toBeHidden();
        }
      };
      await remove(false);
      await expect(added).toHaveCount(2);
      await remove(true);
      await expect(added).toHaveCount(1);
      await remove(true);
      await expect(added).toHaveCount(0);
    });

    test(`${kit.key}/mobile-cards: ${width}px selection, search and paging use the same data`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(route("mobile-cards"));
      const cards = part(page, "card");
      await expect(cards).toHaveCount(8);
      await toggle(cards.first().getByRole("checkbox"));
      await expect(cards.first().getByRole("checkbox")).toBeChecked();
      await page.evaluate(() => document.fonts.ready.then(() => undefined));
      await cards.last().evaluate((element) =>
        window.scrollBy({
          top: element.getBoundingClientRect().bottom - 500,
          behavior: "instant",
        })
      );
      await expect.poll(() => cards.count()).toBeGreaterThan(8);
      await expect(cards.first()).toContainText("Ada Lovelace");
      await expect(cards.first().getByRole("checkbox")).toBeChecked();
      await page
        .locator(".mx-demo")
        .getByRole("searchbox")
        .fill("Ada Lovelace");
      await expect(cards).toHaveCount(1);
      await expect(cards.first()).toContainText("Ada Lovelace");
    });

    test(`${kit.key}/saved-views: ${width}px named search persists, applies and deletes`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(route("saved-views"));
      const search = page.locator(".mx-demo").getByRole("searchbox");
      await search.fill("Ada Lovelace");
      const rows = part(page, rowPart);
      await expect(rows).toHaveCount(1);
      const trigger = part(page, "views-button");
      await trigger.click();
      const input = page
        .locator('[data-adapttable-part="views-panel"]')
        .getByRole("textbox");
      await input.fill("Ada only");
      await input.press("Enter");
      await expect(
        page.locator('[data-adapttable-part="views-item"]')
      ).toHaveText("Ada only");
      await input.press("Escape");
      await expect(trigger).toBeFocused();
      await page.reload();
      await expect(rows).toHaveCount(25);
      await trigger.click();
      await page.locator('[data-adapttable-part="views-item"]').click();
      await expect(search).toHaveValue("Ada Lovelace");
      await expect(rows).toHaveCount(1);
      await trigger.click();
      await page.locator('[data-adapttable-part="views-delete"]').click();
      await expect(
        page.locator('[data-adapttable-part="views-item"]')
      ).toHaveCount(0);
      await page.keyboard.press("Escape");
      await page.reload();
      await trigger.click();
      await expect(
        page.locator('[data-adapttable-part="views-item"]')
      ).toHaveCount(0);
    });

    for (const scope of ["page", "selected", "range"]) {
      test(`${kit.key}/export: ${width}px ${scope} CSV contains the requested data`, async ({
        page,
      }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(route("export", `&scope=${scope}`));
        const rows = part(page, rowPart);
        await expect(rows.first()).toContainText("Ada Lovelace");
        const button = part(page, "export-csv-button");
        if (scope === "selected")
          await toggle(rows.first().getByRole("checkbox"));
        if (scope === "range") {
          if (width === 390) {
            // Core exports the current page when no cell range is available.
            await expect(button).toBeEnabled();
          } else {
            const cell = rows.first().locator('[data-column-key="person"]');
            await cell.focus();
            await cell.press("Shift+ArrowDown");
          }
        }
        const pending = page.waitForEvent("download");
        await button.click();
        const download = await pending;
        expect(download.suggestedFilename()).toMatch(/\.csv$/);
        const path = await download.path();
        expect(path).not.toBeNull();
        const csv = await readFile(path, "utf8");
        expect(csv).toContain("Ada Lovelace");
        const lines = csv.trim().split(/\r?\n/);
        let expectedLines = scope === "selected" ? 2 : 3;
        if (scope === "page" || (scope === "range" && width === 390))
          expectedLines = (await rows.count()) + 1;
        expect(lines).toHaveLength(expectedLines);
        expect(await download.failure()).toBeNull();
      });
    }
  }
}
