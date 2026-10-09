import { readFile } from "node:fs/promises";

import { expect, type Page, test, type TestInfo } from "@playwright/test";

import { builtAdapters } from "../apps/showcase/matrix.mjs";

/** Record how a kit's entry workspace looks, for the review of every kit. */
async function attachEntry(page: Page, testInfo: TestInfo, name: string) {
  const path = testInfo.outputPath(`${name}.png`);
  await page.screenshot({ path, fullPage: true, animations: "disabled" });
  await testInfo.attach(name, {
    path,
    contentType: "image/png",
  });
  const workspacePath = testInfo.outputPath(`${name}-workspace.png`);
  await page
    .locator('.mx-demo [data-adapttable-part="root"]')
    .evaluate((element) => {
      window.scrollBy({
        top: element.getBoundingClientRect().top - 80,
        behavior: "instant",
      });
    });
  await page.screenshot({
    path: workspacePath,
    animations: "disabled",
  });
  await testInfo.attach(`${name}-workspace`, {
    path: workspacePath,
    contentType: "image/png",
  });
}

test("chakra: native entry buttons retain contrast through theme changes", async ({
  page,
}) => {
  await page.goto("/chakra/");
  const views = page
    .locator('.mx-demo [data-adapttable-part="root"]')
    .getByRole("button", { name: "Saved views", exact: true });
  for (const mode of ["light", "dark", "light"]) {
    if (
      mode !== "light" ||
      (await page.locator("html").getAttribute("data-theme")) === "dark"
    ) {
      await page
        .getByRole("button", { name: "Toggle dark mode", exact: true })
        .click();
    }
    await expect(page.locator("html")).toHaveAttribute("data-theme", mode);
    await expect
      .poll(
        () =>
          views.evaluate((button) => {
            const luminance = (color: string) => {
              const rgb = color
                .match(/[\d.]+/g)!
                .slice(0, 3)
                .map(Number);
              const linear = rgb.map((channel) => {
                const value = channel / 255;
                return value <= 0.04045
                  ? value / 12.92
                  : ((value + 0.055) / 1.055) ** 2.4;
              });
              return (
                linear[0]! * 0.2126 + linear[1]! * 0.7152 + linear[2]! * 0.0722
              );
            };
            const foreground = luminance(getComputedStyle(button).color);
            let surface: Element | null = button;
            while (
              surface &&
              getComputedStyle(surface).backgroundColor === "rgba(0, 0, 0, 0)"
            ) {
              surface = surface.parentElement;
            }
            const background = luminance(
              getComputedStyle(surface!).backgroundColor
            );
            return (
              (Math.max(foreground, background) + 0.05) /
              (Math.min(foreground, background) + 0.05)
            );
          }),
        { message: `${mode} native Saved views contrast` }
      )
      .toBeGreaterThanOrEqual(4.5);
  }
});

for (const kit of builtAdapters("react")) {
  test(`${kit.key}: entry editing, CSV and history use the real directory`, async ({
    page,
  }, testInfo) => {
    await page.goto(`/${kit.key}/`);
    const root = page.locator('.mx-demo [data-adapttable-part="root"]');
    await expect(root).toBeVisible();
    await attachEntry(page, testInfo, `${kit.key}-entry-desktop-light`);
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
    const rows = root.locator('[data-adapttable-part="row"][data-row-id]');
    await expect(rows).toHaveCount(5);
    await search.fill("Priya");
    await expect(root.getByText("Priya Nair", { exact: true })).toBeVisible();
    await expect(rows).toHaveCount(1);
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
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText("Priya Nair");
    await page.reload();
    await expect(search).toHaveValue("Priya");
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText("Priya Nair");
    const savedUrl = page.url();
    const otherKit = kit.key === "mantine" ? "MUI" : "Mantine";
    await page.getByRole("button", { name: "Adapters", exact: true }).click();
    await page
      .getByRole("menu", { name: "Adapters", exact: true })
      .getByRole("menuitem", { name: new RegExp(`^${otherKit} `) })
      .click();
    await expect(search).toHaveValue("");
    await expect(rows).toHaveCount(5);
    expect(new URL(page.url()).searchParams.has("live.q")).toBe(false);
    await page.goBack();
    await expect(page).toHaveURL(savedUrl);
    await expect(search).toHaveValue("Priya");
    await expect(rows).toHaveCount(1);
    await page.goForward();
    await expect(search).toHaveValue("");
    await expect(rows).toHaveCount(5);
    await page.goBack();
    await expect(search).toHaveValue("Priya");
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText("Priya Nair");
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
  }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/${kit.key}/`);
    await page
      .getByRole("button", { name: "Toggle dark mode", exact: true })
      .click();
    const root = page.locator('.mx-demo [data-adapttable-part="root"]');
    await expect(root).toBeVisible();
    await expect(root.locator('[data-adapttable-part="card"]')).toHaveCount(5);
    await attachEntry(page, testInfo, `${kit.key}-entry-phone-dark`);
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
