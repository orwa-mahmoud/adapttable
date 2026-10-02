import { expect, type Page, test } from "@playwright/test";

import {
  ANGULAR_KITS,
  angularPart,
  expectAngularSelection,
  selectAngularOption,
} from "./angular-kit";

for (const kit of ANGULAR_KITS) {
  test.describe(kit.key, () => {
    /**
     * Each Angular kit's editing page: kit editors in the cell, the
     * host writing each value, a column rule refusing one, and arrow focus.
     */

    const PAGE = `/${kit.key}/editing/`;

    const part = (page: Page, name: string) => angularPart(kit, page, name);

    const cell = (page: Page, row: number, column: number) =>
      part(page, "row")
        .nth(row)
        .locator('[data-adapttable-part="cell"]')
        .nth(column);

    const log = (page: Page) => page.locator("[data-demo-log]");

    test("opens a select on the row's value and saves the new one through the host", async ({
      page,
    }) => {
      await page.goto(PAGE);
      await cell(page, 0, 2).dblclick();
      const editor = part(page, "edit-cell-editor");
      await expectAngularSelection(kit, editor, {
        value: "Planned",
        label: "Planned",
      });
      await selectAngularOption(kit, editor, {
        value: "Blocked",
        label: "Blocked",
      });
      await expectAngularSelection(kit, editor, {
        value: "Blocked",
        label: "Blocked",
      });
      await editor.press("Enter");
      await expect(cell(page, 0, 2)).toHaveText("Blocked");
      await expect(log(page)).toHaveText(
        "Saved status for Ada Lovelace: Blocked"
      );
    });

    if (kit.key === "ng-zorro") {
      test("keeps the select draft through pointer presses and saves only after leaving", async ({
        page,
      }) => {
        await page.goto(PAGE);
        await cell(page, 0, 2).dblclick();
        const editor = part(page, "edit-cell-editor");
        await expect(editor).toBeFocused();
        const selector = editor
          .locator("xpath=ancestor::nz-select[1]")
          .locator("nz-select-top-control");
        await selector.hover();
        await page.mouse.down();
        await expect(editor).toBeFocused();
        await expect(log(page)).toHaveText(
          "Every change goes through the host."
        );
        await page.mouse.up();
        await expect(editor).toHaveAttribute("aria-expanded", "true");
        const option = page.getByRole("option", {
          name: "Blocked",
          exact: true,
        });
        await option.hover();
        await page.mouse.down();
        await expect(editor).toBeFocused();
        await expect(log(page)).toHaveText(
          "Every change goes through the host."
        );
        await page.mouse.up();
        await expect(editor).toHaveAttribute("aria-expanded", "false");
        await expect(editor).toBeFocused();
        await expectAngularSelection(kit, editor, {
          value: "Blocked",
          label: "Blocked",
        });
        await expect(log(page)).toHaveText(
          "Every change goes through the host."
        );
        await page
          .getByRole("heading", { name: "Inline cell editing in NG-ZORRO" })
          .click();
        await expect(cell(page, 0, 2)).toHaveText("Blocked");
        await expect(log(page)).toHaveText(
          "Saved status for Ada Lovelace: Blocked"
        );
      });
    }

    test("edits a number and a date through the kit controls", async ({
      page,
    }) => {
      await page.goto(PAGE);
      await cell(page, 0, 4).dblclick();
      const budget = part(page, "edit-cell-editor");
      await expect(budget).toHaveAttribute("type", "number");
      await budget.fill("12345");
      await budget.press("Enter");
      await expect(cell(page, 0, 4)).toHaveText("$12,345");
      await expect(log(page)).toHaveText(
        "Saved budget for Ada Lovelace: 12345"
      );

      await cell(page, 0, 3).dblclick();
      const start = part(page, "edit-cell-editor");
      await expect(start).toHaveAttribute("type", "date");
      await expect(start).toHaveValue("2026-03-08");
      await start.press("Escape");
      await expect(part(page, "edit-cell-editor")).toHaveCount(0);
    });

    test("refuses an empty name with the column's own message", async ({
      page,
    }) => {
      await page.goto(PAGE);
      await cell(page, 0, 0).dblclick();
      const name = part(page, "edit-cell-editor");
      await name.fill("");
      await name.press("Enter");
      await expect(part(page, "edit-cell-error")).toHaveText(
        "A name is required"
      );
      await expect(name).toHaveAttribute("aria-invalid", "true");
      await expect(log(page)).toHaveText("Every change goes through the host.");
    });

    test("moves a visible focus between cells with the arrow keys", async ({
      page,
    }) => {
      await page.goto(PAGE);
      await expect(part(page, "table")).toHaveAttribute("role", "grid");
      await cell(page, 0, 0).focus();
      await page.keyboard.press("ArrowRight");
      await expect(cell(page, 0, 1)).toBeFocused();
      await page.keyboard.press("ArrowDown");
      await expect(cell(page, 1, 1)).toBeFocused();
    });

    test("undoes and redoes an edit with toolbar controls and grid shortcuts", async ({
      page,
    }) => {
      await page.goto(PAGE);
      await expect(part(page, "undo-button")).toBeDisabled();
      await cell(page, 0, 0).dblclick();
      await part(page, "edit-cell-editor").fill("Ada Updated");
      await part(page, "edit-cell-editor").press("Enter");
      await expect(cell(page, 0, 0)).toHaveText("Ada Updated");
      await part(page, "undo-button").click();
      await expect(cell(page, 0, 0)).toHaveText("Ada Lovelace");
      await part(page, "redo-button").click();
      await expect(cell(page, 0, 0)).toHaveText("Ada Updated");
      await cell(page, 0, 0).focus();
      await page.keyboard.press("Control+z");
      await expect(cell(page, 0, 0)).toHaveText("Ada Lovelace");
      await page.keyboard.press("Control+Shift+z");
      await expect(cell(page, 0, 0)).toHaveText("Ada Updated");
      await cell(page, 0, 0).dblclick();
      const savedMessage = await log(page).textContent();
      await part(page, "edit-cell-editor").press("Control+z");
      await expect(log(page)).toHaveText(savedMessage!);
      await part(page, "edit-cell-editor").press("Escape");
      await expect(cell(page, 0, 0)).toHaveText("Ada Updated");
    });

    test("asks about a live value and keeps the draft when requested", async ({
      page,
    }) => {
      await page.goto(PAGE);
      await cell(page, 0, 0).dblclick();
      await part(page, "edit-cell-editor").fill("Ada Local");
      await page
        .getByRole("button", { name: "Receive live name update" })
        .click();
      await expect(part(page, "edit-cell-conflict")).toBeVisible();
      await expect(part(page, "edit-cell-incoming")).toContainText("Ada Live");
      await part(page, "edit-cell-keep-mine").click();
      await expect(part(page, "edit-cell-conflict")).toHaveCount(0);
      await expect(part(page, "edit-cell-editor")).toHaveValue("Ada Local");
      await part(page, "edit-cell-editor").press("Enter");
      await expect(cell(page, 0, 0)).toHaveText("Ada Local");
    });

    test("takes the incoming live value without saving the abandoned draft", async ({
      page,
    }) => {
      await page.goto(PAGE);
      await cell(page, 0, 0).dblclick();
      await part(page, "edit-cell-editor").fill("Discard this draft");
      await page
        .getByRole("button", { name: "Receive live name update" })
        .click();
      await expect(part(page, "edit-cell-conflict")).toBeVisible();
      await part(page, "edit-cell-take-theirs").click();
      await expect(part(page, "edit-cell-conflict")).toHaveCount(0);
      await expect(part(page, "edit-cell-editor")).toHaveValue("Ada Live");
      await expect(log(page)).toHaveText("Received live name update: Ada Live");
      await part(page, "edit-cell-editor").press("Escape");
      await expect(part(page, "edit-cell-editor")).toHaveCount(0);
      await expect(cell(page, 0, 0)).toHaveText("Ada Live");
      await expect(log(page)).toHaveText("Received live name update: Ada Live");
    });

    test("shows the host's save failure and rolls its optimistic change back", async ({
      page,
    }) => {
      await page.goto(PAGE);
      await page.getByRole("button", { name: "Reject next save" }).click();
      await cell(page, 0, 0).dblclick();
      await part(page, "edit-cell-editor").fill("Rejected name");
      await part(page, "edit-cell-editor").press("Enter");
      await expect(part(page, "edit-cell-save-error")).toContainText(
        "The demo server rejected this change"
      );
      await part(page, "edit-cell-rollback").click();
      await expect(part(page, "edit-cell-save-error")).toHaveCount(0);
      await expect(cell(page, 0, 0)).toHaveText("Ada Lovelace");
      await expect(log(page)).toHaveText(
        "Restored Ada Lovelace after the rejected save."
      );
    });

    test("pastes browser clipboard rows and undoes the rectangle in one gesture", async ({
      page,
      context,
    }) => {
      await context.grantPermissions(["clipboard-read", "clipboard-write"]);
      await page.goto(PAGE);
      const before = [
        await cell(page, 0, 0).textContent(),
        await cell(page, 1, 0).textContent(),
      ];
      await page.evaluate(async () => {
        await navigator.clipboard.writeText("Pasted Ada\nPasted Grace");
      });
      await cell(page, 0, 0).focus();
      await page.keyboard.press("Control+v");
      await expect(cell(page, 0, 0)).toHaveText("Pasted Ada");
      await expect(cell(page, 1, 0)).toHaveText("Pasted Grace");
      await part(page, "undo-button").click();
      await expect(cell(page, 0, 0)).toHaveText(before[0]!);
      await expect(cell(page, 1, 0)).toHaveText(before[1]!);
      await expect(part(page, "undo-button")).toBeDisabled();
      await part(page, "redo-button").click();
      await expect(cell(page, 0, 0)).toHaveText("Pasted Ada");
      await expect(cell(page, 1, 0)).toHaveText("Pasted Grace");
    });

    test("drags the fill handle across rows and undoes one fill gesture", async ({
      page,
    }) => {
      await page.goto(PAGE);
      const before = [
        await cell(page, 1, 0).textContent(),
        await cell(page, 2, 0).textContent(),
      ];
      await cell(page, 0, 0).click();
      const handle = part(page, "fill-handle");
      await expect(handle).toHaveCount(1);
      await expect(handle).toBeVisible();
      await handle.hover();
      await page.mouse.down();
      await cell(page, 2, 0).hover();
      await page.mouse.up();
      await expect(cell(page, 1, 0)).toHaveText("Ada Lovelace");
      await expect(cell(page, 2, 0)).toHaveText("Ada Lovelace");
      await part(page, "undo-button").click();
      await expect(cell(page, 1, 0)).toHaveText(before[0]!);
      await expect(cell(page, 2, 0)).toHaveText(before[1]!);
      await expect(part(page, "undo-button")).toBeDisabled();
    });

    /** Localized cells must write the field they display, on desktop and phones. */
    for (const width of [1280, 390]) {
      const nameCell = (page: Page) =>
        part(page, width === 390 ? "card" : "row")
          .first()
          .locator(
            `[data-adapttable-part="${width === 390 ? "card-value" : "cell"}"]`
          )
          .first();

      test(`Arabic name edits save, undo and redo the displayed value at ${String(width)}px`, async ({
        page,
      }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(`${PAGE}?locale=ar&dir=rtl`);
        await expect(nameCell(page)).toHaveText("آدا لوفليس");
        await part(page, "edit-cell-activate").first().dblclick();
        const editor = part(page, "edit-cell-editor");
        await expect(editor).toHaveValue("آدا لوفليس");
        await editor.fill("آدا المعدلة");
        await editor.press("Enter");
        await expect(nameCell(page)).toHaveText("آدا المعدلة");
        await expect(log(page)).toHaveText(
          "Saved person for Ada Lovelace: آدا المعدلة"
        );
        await part(page, "undo-button").click();
        await expect(nameCell(page)).toHaveText("آدا لوفليس");
        await part(page, "redo-button").click();
        await expect(nameCell(page)).toHaveText("آدا المعدلة");
      });

      test(`Arabic live conflicts preserve the local draft and commit it at ${String(width)}px`, async ({
        page,
      }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(`${PAGE}?locale=ar&dir=rtl`);
        await expect(nameCell(page)).toHaveText("آدا لوفليس");
        await part(page, "edit-cell-activate").first().dblclick();
        await part(page, "edit-cell-editor").fill("آدا المحلية");
        await page
          .getByRole("button", { name: "Receive live name update" })
          .click();
        await expect(part(page, "edit-cell-conflict")).toBeVisible();
        await expect(part(page, "edit-cell-incoming")).toContainText(
          "Ada Live"
        );
        await part(page, "edit-cell-keep-mine").click();
        await expect(part(page, "edit-cell-conflict")).toHaveCount(0);
        await expect(part(page, "edit-cell-editor")).toHaveValue("آدا المحلية");
        await part(page, "edit-cell-editor").press("Enter");
        await expect(nameCell(page)).toHaveText("آدا المحلية");
        await expect(log(page)).toHaveText(
          "Saved person for Ada Lovelace: آدا المحلية"
        );
      });

      test(`Arabic live conflicts can take the incoming value without saving the draft at ${String(width)}px`, async ({
        page,
      }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(`${PAGE}?locale=ar&dir=rtl`);
        await expect(nameCell(page)).toHaveText("آدا لوفليس");
        await part(page, "edit-cell-activate").first().dblclick();
        await part(page, "edit-cell-editor").fill("مسودة مهملة");
        await page
          .getByRole("button", { name: "Receive live name update" })
          .click();
        await expect(part(page, "edit-cell-conflict")).toBeVisible();
        await expect(part(page, "edit-cell-incoming")).toContainText(
          "Ada Live"
        );
        await part(page, "edit-cell-take-theirs").click();
        await expect(part(page, "edit-cell-conflict")).toHaveCount(0);
        await expect(part(page, "edit-cell-editor")).toHaveValue("Ada Live");
        await part(page, "edit-cell-editor").press("Escape");
        await expect(part(page, "edit-cell-editor")).toHaveCount(0);
        await expect(nameCell(page)).toHaveText("Ada Live");
        await expect(log(page)).toHaveText(
          "Received live name update: Ada Live"
        );
      });
    }
  });
}
