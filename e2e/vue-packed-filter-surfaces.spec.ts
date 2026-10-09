import { expect, type Page, test } from "@playwright/test";

import { VUE_BROWSER_ROUTE } from "../scripts/build-vue-browser-consumer.mjs";

const part = (name: string) => `[data-adapttable-part="${name}"]`;
const hostSelector = "dialog[data-adapttable-filter-dialog]";
const variants = [
  {
    name: "desktop",
    query: "",
    width: 1280,
    height: 900,
    dir: "ltr",
    cancel: "Cancel",
    done: "Done",
  },
  {
    name: "mobile Arabic RTL",
    query: "?mobile&rtl",
    width: 390,
    height: 844,
    dir: "rtl",
    cancel: "إلغاء",
    done: "تم",
  },
] as const;

async function visit(page: Page, variant: (typeof variants)[number]) {
  await page.setViewportSize({ width: variant.width, height: variant.height });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const response = await page.goto(`${VUE_BROWSER_ROUTE}${variant.query}`);
  expect(response?.status()).toBe(200);
  await expect(page.locator("html")).toHaveAttribute("dir", variant.dir);
  await expect(page.locator("html")).toHaveAttribute(
    "lang",
    variant.dir === "rtl" ? "ar" : "en"
  );
  return errors;
}

for (const variant of variants) {
  test(`packed drawer top layer, foreground, scrim and focus: ${variant.name}`, async ({
    page,
  }, testInfo) => {
    const errors = await visit(page, variant);
    const trigger = page.locator(part("filters-button"));
    await trigger.focus();
    await page.keyboard.press("Enter");
    const host = page.locator(hostSelector);
    const panel = host.locator(part("filters-panel"));
    const backdrop = host.locator(part("filters-backdrop"));
    await expect(host).toBeVisible();
    await expect(host).toHaveAttribute("dir", variant.dir);
    expect(await host.evaluate((element) => element.matches(":modal"))).toBe(
      true
    );
    await expect(panel).toHaveCount(1);
    await expect(panel).toBeVisible();
    expect(await panel.evaluate((element) => element.tagName)).toBe("DIV");
    await expect(page.locator(part("filters-backdrop"))).toHaveCount(1);
    expect(await backdrop.evaluate((element) => element.tagName)).toBe(
      "BUTTON"
    );
    await expect(backdrop).toHaveAccessibleName(variant.cancel);
    await expect(panel.locator(part("filters-done"))).toHaveText(variant.done);
    expect(
      await host.evaluate((element) => ({
        background: getComputedStyle(element, "::backdrop").backgroundColor,
        blur: getComputedStyle(element, "::backdrop").backdropFilter,
      }))
    ).toEqual({ background: "rgba(0, 0, 0, 0)", blur: "none" });
    await expect(backdrop).toHaveCSS("background-color", "rgba(0, 0, 0, 0.2)");
    await expect(panel).toHaveCSS("background-color", /^rgb\(\d+, \d+, \d+\)$/);
    expect(
      await panel.evaluate((element) =>
        element.contains(document.activeElement)
      )
    ).toBe(true);
    const geometry = await panel.boundingBox();
    expect(geometry).not.toBeNull();
    if (!geometry) throw new Error("Missing foreground geometry");
    expect(geometry.x).toBeGreaterThanOrEqual(0);
    expect(geometry.y).toBeGreaterThanOrEqual(0);
    expect(geometry.x + geometry.width).toBeLessThanOrEqual(variant.width);
    expect(geometry.y + geometry.height).toBeLessThanOrEqual(variant.height);
    expect(
      variant.dir === "rtl" ? geometry.x : geometry.x + geometry.width
    ).toBe(variant.dir === "rtl" ? 0 : variant.width);
    expect(
      await panel.evaluate((element) => {
        const box = element.getBoundingClientRect();
        return element.contains(
          document.elementFromPoint(
            box.x + box.width / 2,
            box.y + box.height / 2
          )
        );
      })
    ).toBe(true);
    await page.keyboard.press("Tab");
    expect(
      await host.evaluate((element) => element.contains(document.activeElement))
    ).toBe(true);
    await page.keyboard.press("Shift+Tab");
    expect(
      await host.evaluate((element) => element.contains(document.activeElement))
    ).toBe(true);
    await testInfo.attach(`packed-filter-${variant.name}`, {
      body: await page.screenshot(),
      contentType: "image/png",
    });
    await page.keyboard.press("Escape");
    await expect(host).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await trigger.click();
    await page.locator(part("filters-done")).click();
    await expect(host).toHaveCount(0);
    await expect(trigger).toBeFocused();
    expect(errors).toEqual([]);
  });

  test(`packed drawer rejects panel-origin drag and accepts real scrim pointer: ${variant.name}`, async ({
    page,
  }) => {
    const errors = await visit(page, variant);
    const trigger = page.locator(part("filters-button"));
    await trigger.click();
    const host = page.locator(hostSelector);
    const panel = host.locator(part("filters-panel"));
    const box = await panel.boundingBox();
    expect(box).not.toBeNull();
    if (!box) throw new Error("Missing drawer geometry");
    const outsideX = variant.dir === "rtl" ? variant.width - 4 : 4;
    expect(
      await page.evaluate(
        ({ x, selector }) =>
          document.elementFromPoint(x, 30)?.matches(selector),
        { x: outsideX, selector: part("filters-backdrop") }
      )
    ).toBe(true);
    await page.mouse.move(box.x + box.width / 2, box.y + box.height - 30);
    await page.mouse.down();
    await page.mouse.move(outsideX, 30, { steps: 5 });
    await page.mouse.up();
    await expect(host).toBeVisible();
    await page.mouse.click(outsideX, 30);
    await expect(host).toHaveCount(0);
    await trigger.click();
    await expect(host).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(trigger).toBeFocused();
    expect(errors).toEqual([]);
  });
}

test("packed consumer classes override paint and unrelated dialogs retain their backdrop", async ({
  page,
}) => {
  const errors = await visit(page, variants[0]);
  await page.locator("#custom-colors").click();
  await page.locator(part("filters-button")).click();
  const host = page.locator(hostSelector);
  const panel = host.locator(part("filters-panel"));
  const backdrop = host.locator(part("filters-backdrop"));
  await expect(panel).toHaveClass("custom-panel");
  await expect(backdrop).toHaveClass("custom-scrim");
  await expect(panel).toHaveCSS("background-color", "rgb(245, 240, 220)");
  await expect(backdrop).toHaveCSS("background-color", "rgba(30, 40, 50, 0.6)");
  expect(
    await host.evaluate(
      (element) => getComputedStyle(element, "::backdrop").backgroundColor
    )
  ).toBe("rgba(0, 0, 0, 0)");
  await page.keyboard.press("Escape");
  await page.locator("#open-other").click();
  const other = page.locator("#other-dialog");
  await expect(other).toBeVisible();
  expect(await other.evaluate((element) => element.matches(":modal"))).toBe(
    true
  );
  expect(
    await other.evaluate((element) => ({
      background: getComputedStyle(element, "::backdrop").backgroundColor,
      blur: getComputedStyle(element, "::backdrop").backdropFilter,
    }))
  ).toEqual({ background: "rgba(10, 20, 30, 0.4)", blur: "blur(2px)" });
  await expect(page.locator(part("filters-backdrop"))).toHaveCount(0);
  await other.getByRole("button").click();
  await expect(other).not.toBeVisible();
  expect(errors).toEqual([]);
});

test("packed compact controls support keyboard editing, multi-selection and Escape in desktop and Arabic RTL", async ({
  page,
}) => {
  for (const variant of variants) {
    const errors = await visit(page, variant);
    const compact = page.getByRole("region", { name: "Compact filters" });
    const summary = compact.locator("summary");
    await summary.focus();
    await page.keyboard.press("Enter");
    const menu = compact.locator(part("filter-header-menu"));
    await expect(menu).toBeVisible();
    for (const name of ["Ada", "Grace"]) {
      const checkbox = menu.getByRole("checkbox", { name, exact: true });
      await checkbox.focus();
      await page.keyboard.press("Space");
      await expect(checkbox).toBeChecked();
      await expect(menu).toBeVisible();
      await expect(page.locator("#compact-values")).toContainText(name);
    }
    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();
    await expect(summary).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(
      menu.getByRole("checkbox", { name: "Ada", exact: true })
    ).toBeChecked();
    await expect(
      menu.getByRole("checkbox", { name: "Grace", exact: true })
    ).toBeChecked();
    await page.keyboard.press("Escape");
    const row = compact.locator(part("filter-header-row"));
    const search = row.getByRole("searchbox");
    await search.focus();
    await page.keyboard.press("ControlOrMeta+A");
    await page.keyboard.type("Edited");
    await expect(search).toHaveValue("Edited");
    await expect(page.locator("#compact-values")).toContainText("Edited");
    await page.keyboard.press("Tab");
    const choice = row.getByRole("combobox");
    await expect(choice).toBeFocused();
    // Send a real localized key: Playwright's keyboard.type uses insertText
    // for Arabic, which never reaches a native select's type-ahead handler.
    const key = (await choice.locator('option[value="true"]').innerText())[0]!;
    const keyboard = await page.context().newCDPSession(page);
    await keyboard.send("Input.dispatchKeyEvent", {
      type: "keyDown",
      key,
      text: key,
      unmodifiedText: key,
    });
    await keyboard.send("Input.dispatchKeyEvent", { type: "keyUp", key });
    await keyboard.detach();
    await page.keyboard.press("Tab");
    await expect(choice).toHaveValue("true");
    await expect(page.locator("#compact-values")).toContainText(
      '"active":"true"'
    );
    expect(errors).toEqual([]);
  }
});
