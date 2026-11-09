import { expect, type Locator, test } from "@playwright/test";

import { builtAdapters } from "../apps/showcase/matrix.mjs";
import { getLabels } from "../packages/shared/i18n/src";

async function settle(surface: Locator): Promise<void> {
  await expect
    .poll(() =>
      surface.evaluate(
        (element) =>
          ![element, ...element.querySelectorAll("*")].some((node) =>
            node
              .getAnimations()
              .some(
                (animation) =>
                  animation.playState === "running" &&
                  animation.effect?.getComputedTiming().iterations !== Infinity
              )
          )
      )
    )
    .toBe(true);
}

for (const kit of builtAdapters("angular")) {
  test(`${kit.key}: backend mode preserves frontend choices and restores their controls`, async ({
    page,
  }) => {
    const preferences = [
      "grouping",
      "editing",
      "row-mutations",
      "row-reorder",
      "row-pinning",
      "cell-span",
      "extra-rows",
      "row-style",
      "side-panel",
    ];
    const query = new URLSearchParams({ kit: kit.key });
    for (const preference of preferences) query.set(preference, "on");
    await page.goto(`/angular-main/?${query}`);
    const controls = page.locator(".controls.angular-options").first();
    const editing = controls.getByRole("checkbox", {
      name: "Editing",
      exact: true,
    });
    const grouping = controls.getByRole("checkbox", {
      name: "Grouping",
      exact: true,
    });
    await expect(editing).toBeChecked();
    await controls.getByRole("radio", { name: "Backend", exact: true }).check();
    await expect(editing).toBeDisabled();
    await expect(editing).not.toBeChecked();
    await expect(grouping).toBeDisabled();
    for (const preference of preferences)
      expect(new URL(page.url()).searchParams.get(preference)).toBe("on");
    await controls
      .getByRole("radio", { name: "Frontend", exact: true })
      .check();
    await expect(editing).toBeEnabled();
    await expect(editing).toBeChecked();
    await expect(grouping).toBeChecked();
  });
}

for (const kit of builtAdapters("vue")) {
  test(`${kit.key}: applying lab options restores keyboard focus to the launcher`, async ({
    page,
  }) => {
    await page.goto(`/vue-all-options/?kit=${kit.key}`);
    const trigger = page.getByRole("button", {
      name: "Configure options",
      exact: true,
    });
    await trigger.click();
    const options = page.getByRole("dialog", {
      name: "Feature Lab controls",
      exact: true,
    });
    await options
      .getByRole("checkbox", { name: "Grouping", exact: true })
      .check();
    await options
      .getByRole("button", { name: "Apply options", exact: true })
      .click();
    await expect(options).toBeHidden();
    await expect(trigger).toBeFocused();
    await expect(
      page.locator('[data-adapttable-part="grouping-panel"]')
    ).toBeVisible();
    expect(new URL(page.url()).searchParams.get("grouping")).toBe("on");
  });
}

for (const entry of [
  { route: "vue-main", kit: "vue-unstyled" },
  { route: "angular-main", kit: "unstyled" },
  { route: "angular-main", kit: "aria" },
]) {
  for (const locale of ["en", "ar"]) {
    test(`${entry.kit}: ${locale} drawer backdrop stays translucent on hover and closes accessibly`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto(
        `/${entry.route}/?kit=${entry.kit}&filters=drawer&locale=${locale}`
      );
      const labels = getLabels(locale);
      const trigger = page
        .getByRole("button", { name: labels.filters, exact: true })
        .first();
      await trigger.click();
      const backdrop = page
        .locator('[data-adapttable-part="filters-backdrop"]')
        .filter({ visible: true })
        .first();
      await expect(backdrop).toBeVisible();
      await page.mouse.move(locale === "ar" ? 1260 : 20, 300);
      const alpha = await backdrop.evaluate((element) => {
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = 1;
        const context = canvas.getContext("2d");
        if (!context)
          throw new Error("Canvas color measurement is unavailable.");
        context.fillStyle = getComputedStyle(element).backgroundColor;
        context.fillRect(0, 0, 1, 1);
        return context.getImageData(0, 0, 1, 1).data[3]! / 255;
      });
      expect(alpha).toBeGreaterThan(0.1);
      expect(alpha).toBeLessThan(0.6);
      await page.keyboard.press("Escape");
      await expect(backdrop).toBeHidden();
      await expect(trigger).toBeFocused();
    });
  }
}

test("shadcn-vue editable cells have a flat ghost appearance and retain keyboard editing", async ({
  page,
}) => {
  await page.goto("/vue-main/?kit=shadcn-vue");
  const value = page.getByRole("button", { name: "Ada Lovelace", exact: true });
  await expect(value).toBeVisible();
  await expect(value).toHaveCSS("border-top-width", "0px");
  const columns = page.getByRole("button", { name: "Columns", exact: true });
  await expect(columns).toHaveCSS("border-top-style", "solid");
  expect(
    await columns.evaluate((element) =>
      Number.parseFloat(getComputedStyle(element).borderTopWidth)
    )
  ).toBeGreaterThan(0);
  await value.press("F2");
  const editor = page.getByRole("textbox", { name: "Edit cell", exact: true });
  await expect(editor).toHaveValue("Ada Lovelace");
  await editor.press("Escape");
  await expect(value).toBeFocused();
});

for (const locale of ["en", "ar"]) {
  test(`vuetify: ${locale} drawer slides at full size and restores focus on close`, async ({
    page,
  }) => {
    await page.goto(`/vue-main/?kit=vuetify&filters=drawer&locale=${locale}`);
    const labels = getLabels(locale);
    const trigger = page.getByRole("button", {
      name: labels.filters,
      exact: true,
    });
    await trigger.click();
    const overlay = page.locator(".adapttable-vuetify-filter-drawer-overlay");
    const panel = overlay.locator('[data-adapttable-part="filters-panel"]');
    await expect(panel).toBeVisible();
    expect(
      await overlay.evaluate((element) =>
        getComputedStyle(element)
          .getPropertyValue("--adapttable-drawer-offset")
          .trim()
      )
    ).toBe(locale === "ar" ? "-100%" : "100%");
    const scales = await overlay.evaluate(async (element) => {
      const frames = [];
      for (let sample = 0; sample < 10; sample++) {
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => resolve())
        );
        const matrix = new DOMMatrixReadOnly(
          getComputedStyle(element).transform
        );
        frames.push({ x: matrix.a, y: matrix.d });
      }
      return frames;
    });
    for (const scale of scales) {
      expect(scale.x).toBe(1);
      expect(scale.y).toBe(1);
    }
    await settle(overlay);
    const bounds = await panel.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.width).toBeGreaterThan(400);
    await page.keyboard.press("Escape");
    await expect(panel).toBeHidden();
    await expect(trigger).toBeFocused();
    await trigger.click();
    await expect(panel).toBeVisible();
    await settle(overlay);
    await panel
      .getByRole("button", { name: labels.filtersDone, exact: true })
      .click();
    await expect(panel).toBeHidden();
    await expect(trigger).toBeFocused();
  });
}

test("vuetify: reduced-motion mobile drawer closes through Cancel and its backdrop", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/vue-main/?kit=vuetify&filters=drawer&locale=ar");
  const labels = getLabels("ar");
  const trigger = page.getByRole("button", {
    name: labels.filters,
    exact: true,
  });
  const overlay = page.locator(".adapttable-vuetify-filter-drawer-overlay");
  const panel = overlay.locator('[data-adapttable-part="filters-panel"]');
  await trigger.click();
  await expect(panel).toBeVisible();
  await expect(panel).toHaveCSS("transform", "none");
  // The showcase's global motion reset retains a 0.01 ms transition for end events.
  expect(
    await panel.evaluate((element) =>
      Math.max(
        ...getComputedStyle(element)
          .transitionDuration.split(",")
          .map((duration) => Number.parseFloat(duration))
      )
    )
  ).toBeLessThanOrEqual(0.00001);
  await panel.getByRole("button", { name: labels.cancel, exact: true }).click();
  await expect(panel).toBeHidden();
  await expect(trigger).toBeFocused();
  await page.setViewportSize({ width: 1280, height: 900 });
  await trigger.click();
  await expect(panel).toBeVisible();
  await overlay
    .locator('[data-adapttable-part="filters-backdrop"]')
    .click({ position: { x: 1260, y: 300 } });
  await expect(panel).toBeHidden();
});
