import { expect, test } from "@playwright/test";

import {
  ANGULAR_KITS,
  angularPart,
  checkAngularCheckbox,
  selectAngularOption,
} from "./angular-kit";

for (const kit of ANGULAR_KITS) {
  test(`${kit.key}: the overview edits, exports and restores real people`, async ({
    page,
  }, testInfo) => {
    await page.goto(`/${kit.key}/`);
    const root = page.locator(
      '.mx-demo--overview [data-adapttable-part="root"]'
    );
    const rows = root.locator('[data-adapttable-part="row"]');
    await expect(rows).toHaveCount(10);
    const name = rows.first().locator('[data-column-key="person"]');
    // The native edit button owns activation; the cell also contains row padding.
    const activate = name.getByRole("button", {
      name: "Ada Lovelace",
      exact: true,
    });
    await expect(activate).toHaveAttribute(
      "data-adapttable-part",
      "edit-cell-activate"
    );
    if (kit.key === "ng-bootstrap") {
      await name.scrollIntoViewIfNeeded();
      const geometry = await name.evaluate((cell) => {
        const button = cell.querySelector(
          '[data-adapttable-part="edit-cell-activate"]'
        )!;
        const cellBox = cell.getBoundingClientRect();
        const buttonBox = button.getBoundingClientRect();
        const center = (box: DOMRect) => ({
          x: box.x + box.width / 2,
          y: box.y + box.height / 2,
        });
        const cellPoint = center(cellBox);
        const buttonPoint = center(buttonBox);
        return {
          cell: cellBox.toJSON(),
          button: buttonBox.toJSON(),
          cellPoint,
          buttonPoint,
          cellCenterHitsButton: button.contains(
            document.elementFromPoint(cellPoint.x, cellPoint.y)
          ),
          buttonCenterHitsButton: button.contains(
            document.elementFromPoint(buttonPoint.x, buttonPoint.y)
          ),
        };
      });
      await testInfo.attach("native-edit-activation-geometry", {
        body: JSON.stringify(geometry, null, 2),
        contentType: "application/json",
      });
      expect(geometry.buttonCenterHitsButton).toBe(true);
    }
    await activate.dblclick();
    const editor = angularPart(kit, page, "edit-cell-editor");
    await expect(editor).toBeVisible();
    await expect(editor).toBeFocused();
    await editor.fill("Ada Workspace");
    await editor.press("Enter");
    await expect(name).toContainText("Ada Workspace");

    const downloaded = page.waitForEvent("download");
    await root.getByRole("button", { name: "Export CSV", exact: true }).click();
    const download = await downloaded;
    expect(download.suggestedFilename()).toBe("people-workspace.csv");
    const stream = await download.createReadStream();
    if (!stream) throw new Error("The CSV download has no readable content");
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(Buffer.from(chunk));
    expect(Buffer.concat(chunks).toString("utf8")).toContain("Ada Workspace");

    await root.getByRole("button", { name: "Undo", exact: true }).click();
    await expect(name).toContainText("Ada Lovelace");
    await root.getByRole("button", { name: "Redo", exact: true }).click();
    await expect(name).toContainText("Ada Workspace");
    await checkAngularCheckbox(
      kit,
      rows.first().getByRole("checkbox", { name: "Select row", exact: true })
    );
    await expect(rows.first()).toHaveAttribute("aria-selected", "true");
    await page.getByRole("button", { name: "Next page", exact: true }).click();
    await expect(rows.first()).not.toContainText("Ada Workspace");
    await page
      .getByRole("button", { name: "Previous page", exact: true })
      .click();
    await expect(rows.first()).toHaveAttribute("aria-selected", "true");
    await expect(name).toContainText("Ada Workspace");
  });

  test(`${kit.key}: overview views restore search and grouping persists`, async ({
    page,
  }) => {
    await page.goto(`/${kit.key}/`);
    const root = page.locator(
      '.mx-demo--overview [data-adapttable-part="root"]'
    );
    const search = root.getByRole("searchbox", { name: "Search", exact: true });
    await search.fill("Ada");
    await expect(root.locator('[data-adapttable-part="row"]')).toHaveCount(1);
    await angularPart(kit, page, "views-button", root).click();
    await angularPart(kit, page, "views-input").fill("Ada overview");
    await angularPart(kit, page, "views-save").click();
    await expect(
      page.getByRole("button", { name: "Ada overview", exact: true })
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(angularPart(kit, page, "views-panel")).toBeHidden();
    await expect(angularPart(kit, page, "views-button", root)).toHaveAttribute(
      "aria-expanded",
      "false"
    );
    await search.fill("");
    await expect(root.locator('[data-adapttable-part="row"]')).toHaveCount(10);
    await angularPart(kit, page, "views-button", root).click();
    await expect(angularPart(kit, page, "views-panel")).toBeVisible();
    await page
      .getByRole("button", { name: "Ada overview", exact: true })
      .click();
    await expect(search).toHaveValue("Ada");
    await expect(root.locator('[data-adapttable-part="row"]')).toHaveCount(1);
    await page.keyboard.press("Escape");
    await search.fill("");
    await expect(root.locator('[data-adapttable-part="row"]')).toHaveCount(10);
    await selectAngularOption(angularPart(kit, page, "grouping-add"), {
      value: "team",
      label: "Team",
    });
    await expect(angularPart(kit, page, "group-row", root)).not.toHaveCount(0);
    await expect(page).toHaveURL(/overview\.groupBy=team/);
    await page.reload();
    await expect(angularPart(kit, page, "group-row", root)).not.toHaveCount(0);
  });

  test(`${kit.key}: overview native menus restore focus and fullscreen can repeat`, async ({
    page,
  }) => {
    await page.goto(`/${kit.key}/`);
    const root = page.locator(
      '.mx-demo--overview [data-adapttable-part="root"]'
    );
    const columns = angularPart(kit, page, "column-menu-button", root);
    for (let attempt = 0; attempt < 2; attempt++) {
      await columns.click();
      await expect(angularPart(kit, page, "column-menu-panel")).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(columns).toBeFocused();
      await expect(columns).toHaveAttribute("aria-expanded", "false");
      await root
        .getByRole("button", { name: "Enter fullscreen", exact: true })
        .click();
      await expect(
        root.getByRole("button", { name: "Exit fullscreen", exact: true })
      ).toBeVisible();
      await root
        .getByRole("button", { name: "Exit fullscreen", exact: true })
        .click();
      await expect(
        root.getByRole("button", { name: "Enter fullscreen", exact: true })
      ).toBeVisible();
    }
  });

  test(`${kit.key}: overview Arabic cards and native toolbar fit a dark phone`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/${kit.key}/?locale=ar`);
    const theme = page.getByRole("button", {
      name: "Toggle dark mode",
      exact: true,
    });
    if ((await theme.getAttribute("aria-pressed")) !== "true")
      await theme.click();
    const root = page.locator(
      '.mx-demo--overview [data-adapttable-part="root"]'
    );
    await expect(root).toHaveAttribute("dir", "rtl");
    await expect(root.locator('[data-adapttable-part="card"]')).toHaveCount(10);
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth
      )
    ).toBeLessThanOrEqual(0);
    const buttons = root.locator(
      '[data-adapttable-part="toolbar"] button:visible'
    );
    for (const button of await buttons.all()) {
      const box = await button.boundingBox();
      if (!box) throw new Error("A visible toolbar action has no bounds");
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(390);
    }
    const search = root.getByRole("searchbox");
    await search.fill("no-matching-person");
    await expect(root.locator('[data-adapttable-part="card"]')).toHaveCount(0);
    await search.fill("");
    await expect(root.locator('[data-adapttable-part="card"]')).toHaveCount(10);
  });
}
