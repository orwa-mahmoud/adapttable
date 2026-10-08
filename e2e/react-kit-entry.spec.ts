import { readFile } from "node:fs/promises";

import { expect, test } from "@playwright/test";

import { builtAdapters } from "../apps/showcase/matrix.mjs";

for (const kit of builtAdapters("react")) {
  test(`${kit.key}: entry editing, CSV and history use the real directory`, async ({
    page,
  }) => {
    await page.goto(`/${kit.key}/`);
    const root = page.locator('.mx-demo [data-adapttable-part="root"]');
    await expect(root).toBeVisible();
    await root
      .getByRole("button", { name: /Priya Nair/ })
      .first()
      .dblclick();
    const editor = root.getByRole("textbox", {
      name: "Edit cell",
      exact: true,
    });
    await editor.fill("Priya Workspace");
    await editor.press("Enter");
    await expect(
      root.getByText("Priya Workspace", { exact: true })
    ).toBeVisible();

    const download = page.waitForEvent("download");
    await root.getByRole("button", { name: "Export CSV", exact: true }).click();
    const file = await download;
    expect(file.suggestedFilename()).toMatch(/\.csv$/);
    const contents = await readFile(await file.path(), "utf8");
    expect(contents).toContain("Priya Workspace");
    expect(contents).not.toContain("Priya Nair");

    await root.getByRole("button", { name: "Undo", exact: true }).click();
    await expect(root.getByText("Priya Nair", { exact: true })).toBeVisible();
    await expect(
      root.getByText("Priya Workspace", { exact: true })
    ).toHaveCount(0);
    await root.getByRole("button", { name: "Redo", exact: true }).click();
    await expect(
      root.getByText("Priya Workspace", { exact: true })
    ).toBeVisible();
  });

  test(`${kit.key}: native grouping, saved views and fullscreen can repeat`, async ({
    page,
  }) => {
    await page.goto(`/${kit.key}/`);
    const root = page.locator('.mx-demo [data-adapttable-part="root"]');
    await expect(root).toBeVisible();
    const arrangement = page.getByRole("group", {
      name: "Row arrangement",
      exact: true,
    });
    await arrangement
      .getByRole("button", { name: "Grouped", exact: true })
      .click();
    await expect(
      root.locator('[data-adapttable-part="grouping-panel"]')
    ).toBeVisible();
    await expect(
      root.getByRole("button", { name: "Collapse group", exact: true }).first()
    ).toBeVisible();
    await root
      .getByRole("button", { name: "Collapse group", exact: true })
      .first()
      .click();
    await expect(
      root.getByRole("button", { name: "Expand group", exact: true }).first()
    ).toBeVisible();
    await root
      .getByRole("button", { name: "Expand group", exact: true })
      .first()
      .click();
    await arrangement
      .getByRole("button", { name: "Flat", exact: true })
      .click();
    await expect(
      root.locator('[data-adapttable-part="grouping-panel"]')
    ).toHaveCount(0);

    const search = root.getByRole("searchbox", { name: "Search", exact: true });
    await search.fill("Priya");
    await expect(root.getByText("Priya Nair", { exact: true })).toBeVisible();
    await expect
      .poll(() => new URL(page.url()).searchParams.get("live.q"))
      .toBe("Priya");
    const views = root.getByRole("button", {
      name: "Saved views",
      exact: true,
    });
    await views.click();
    await page
      .getByRole("textbox", { name: "View name", exact: true })
      .fill("Directory view");
    await page.getByRole("button", { name: "Save view", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Directory view", exact: true })
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(views).toHaveAttribute("aria-expanded", "false");
    await search.fill("");
    await views.click();
    await page
      .getByRole("button", { name: "Directory view", exact: true })
      .click();
    await expect(search).toHaveValue("Priya");
    await page.reload();
    await expect(search).toHaveValue("Priya");
    const savedUrl = page.url();
    const otherKit = kit.key === "mantine" ? "MUI" : "Mantine";
    await page.getByRole("link", { name: otherKit, exact: true }).click();
    await expect(search).toHaveValue("");
    expect(new URL(page.url()).searchParams.has("live.q")).toBe(false);
    await page.goBack();
    await expect(page).toHaveURL(savedUrl);
    await expect(search).toHaveValue("Priya");
    await page.goForward();
    await expect(search).toHaveValue("");
    await page.goBack();
    await expect(search).toHaveValue("Priya");
    await search.fill("");

    for (let repeat = 0; repeat < 2; repeat++) {
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
    await expect(page.getByRole("link", { name: /^Editing / })).toBeVisible();
    await page.getByRole("link", { name: /^Editing / }).click();
    await expect(page).toHaveURL(new RegExp(`/${kit.key}/editing/`));
    expect(new URL(page.url()).searchParams.has("live.q")).toBe(false);
    await expect(
      page.getByRole("searchbox", { name: "Search", exact: true })
    ).toHaveValue("");
  });

  test(`${kit.key}: enriched entry fits a dark phone and recovers from empty search`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/${kit.key}/`);
    await page
      .getByRole("button", { name: "Toggle dark mode", exact: true })
      .click();
    const root = page.locator('.mx-demo [data-adapttable-part="root"]');
    await expect(root).toBeVisible();
    await expect(root.locator('[data-adapttable-part="card"]')).toHaveCount(5);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth)
    ).toBeLessThanOrEqual(390);
    const search = root.getByRole("searchbox", { name: "Search", exact: true });
    await search.fill("No matching directory person");
    await expect(root.locator('[data-adapttable-part="card"]')).toHaveCount(0);
    await expect(
      root
        .getByText(/No results|No rows/)
        .filter({ visible: true })
        .first()
    ).toBeVisible();
    await search.fill("");
    await expect(root.locator('[data-adapttable-part="card"]')).toHaveCount(5);
    const buttons = root.locator(
      '[data-adapttable-part="toolbar"] button:visible'
    );
    for (const button of await buttons.all()) {
      const box = (await button.boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(390);
    }
  });
}
