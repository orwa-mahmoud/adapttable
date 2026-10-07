import { expect, test } from "@playwright/test";

import { ANGULAR_KITS, angularPart } from "./angular-kit";

for (const kit of ANGULAR_KITS) {
  test(`${kit.key}: the live pinning demo reveals columns, scrolls and restores the arrangement`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1200, height: 814 });
    await page.goto(`/angular-main/?kit=${kit.key}&editing=off`);
    const header = (key: string) =>
      page
        .getByRole("columnheader")
        .and(page.locator(`[data-column-key="${key}"]`));
    const scroll = angularPart(kit, page, "scroll-box");
    await expect(header("person")).toBeVisible();
    await expect(header("email")).toHaveCount(0);
    await expect(header("team")).toHaveCount(0);
    expect(
      await scroll.evaluate(
        (element) => element.scrollWidth - element.clientWidth
      )
    ).toBe(0);

    const menu = angularPart(kit, page, "column-menu-button");
    await menu.click();
    await page
      .getByRole("button", { name: "Pin to start: Person", exact: true })
      .click();
    await expect(header("email")).toHaveCount(1);
    await expect(header("team")).toHaveCount(1);
    await page
      .getByRole("button", { name: "Unpin: Person", exact: true })
      .press("Escape");
    await expect(menu).toBeFocused();
    expect(
      await scroll.evaluate(
        (element) => element.scrollWidth - element.clientWidth
      )
    ).toBeGreaterThan(0);
    const before = (await header("person").boundingBox())!;
    await scroll.evaluate((element) => {
      element.scrollLeft = 100;
    });
    const after = (await header("person").boundingBox())!;
    expect(after.x).toBeCloseTo(before.x, 0);
    await expect(header("person")).toHaveAttribute("data-pinned", "start");
    if (kit.key === "unstyled") {
      const cell = angularPart(kit, page, "row")
        .first()
        .locator('[data-column-key="person"]');
      expect(
        await cell.evaluate(
          (element) => getComputedStyle(element).backgroundColor
        )
      ).not.toBe("rgba(0, 0, 0, 0)");
    }
    await expect
      .poll(() => new URL(page.url()).searchParams.get("live.colPin"))
      .toBe("person:start");
    await page.reload();
    await expect(header("person")).toHaveAttribute("data-pinned", "start");
    await expect(header("email")).toHaveCount(1);
    await expect(header("team")).toHaveCount(1);

    await menu.click();
    await page
      .getByRole("button", { name: "Hide column: Email", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Unpin: Person", exact: true })
      .click();
    await expect(header("email")).toHaveCount(0);
    await page
      .getByRole("button", { name: "Pin to start: Person", exact: true })
      .click();
    await expect(header("email")).toHaveCount(1);
    await page
      .getByRole("button", { name: "Hide column: Email", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Unpin: Person", exact: true })
      .press("Escape");
    await expect
      .poll(() => new URL(page.url()).searchParams.get("live.colHide"))
      .toBe("email");
    await page.reload();
    await expect(header("email")).toHaveCount(0);
    await expect(header("person")).toHaveAttribute("data-pinned", "start");
  });
}

for (const dir of ["ltr", "rtl"]) {
  test(`material: resize keeps its native target inside the ${dir} table and supports pointer and keyboard input`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1200, height: 814 });
    await page.goto(`/angular-main/?kit=material&editing=off&dir=${dir}`);
    const scroll = angularPart({ key: "material" }, page, "scroll-box");
    const handle = page.getByRole("button", {
      name: "Resize column: Load",
      exact: true,
    });
    await expect(handle).toBeVisible();
    const bounds = (await handle.boundingBox())!;
    const area = (await scroll.boundingBox())!;
    expect(bounds.width).toBeGreaterThanOrEqual(48);
    expect(bounds.x).toBeGreaterThanOrEqual(area.x);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(
      area.x + area.width + 1
    );
    expect(
      await scroll.evaluate(
        (element) => element.scrollWidth - element.clientWidth
      )
    ).toBe(0);
    const header = page
      .getByRole("columnheader")
      .and(page.locator('[data-column-key="load"]'));
    const before = (await header.boundingBox())!.width;
    await page.mouse.move(
      bounds.x + bounds.width / 2,
      bounds.y + bounds.height / 2
    );
    await page.mouse.down();
    await page.mouse.move(
      bounds.x + bounds.width / 2 + (dir === "rtl" ? -80 : 80),
      bounds.y + bounds.height / 2,
      { steps: 8 }
    );
    await page.mouse.up();
    await expect
      .poll(async () => (await header.boundingBox())!.width)
      .toBeGreaterThan(before);
    await handle.focus();
    await expect(handle).toBeFocused();
    const resized = (await header.boundingBox())!.width;
    await handle.press(dir === "rtl" ? "ArrowLeft" : "ArrowRight");
    await expect
      .poll(async () => (await header.boundingBox())!.width)
      .toBeGreaterThan(resized);
  });
}

for (const dark of [false, true]) {
  test(`unstyled: selected rows keep opaque pinned cells in ${dark ? "dark" : "light"} mode`, async ({
    page,
  }) => {
    await page.goto(
      "/angular-main/?kit=unstyled&editing=off&selection=on&live.colPin=person%3Astart"
    );
    const rows = angularPart({ key: "unstyled" }, page, "row");
    await expect(rows.first()).toBeVisible();
    if (dark)
      await page
        .getByRole("button", { name: "Toggle dark mode", exact: true })
        .click();
    const first = rows.first();
    const pinned = first.locator('[data-column-key="person"]');
    const nextPinned = rows.nth(1).locator('[data-column-key="person"]');
    const unselected = await nextPinned.evaluate(
      (element) => getComputedStyle(element).backgroundColor
    );
    await first.getByRole("checkbox").check();
    await expect(first).toHaveAttribute("aria-selected", "true");
    const selected = await pinned.evaluate(
      (element) => getComputedStyle(element).backgroundColor
    );
    expect(selected).not.toBe("rgba(0, 0, 0, 0)");
    expect(selected).not.toBe(unselected);
    await expect(first).toHaveCSS("background-color", selected);
    await first.hover();
    await expect(pinned).toHaveCSS("background-color", selected);
    await rows.nth(1).hover();
    expect(
      await nextPinned.evaluate(
        (element) => getComputedStyle(element).backgroundColor
      )
    ).not.toBe(unselected);
  });
}
