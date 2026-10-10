import { expect, test } from "@playwright/test";

const route = "/vue/nuxt-ui/workspace/";
const part = (name: string) => `[data-adapttable-part="${name}"]`;

for (const rtl of [false, true]) {
  test(`Nuxt saved views save, reopen and restore native focus (rtl=${rtl})`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(route);
    if (rtl) await page.locator('[data-test="rtl"]').click();
    const trigger = page.locator(part("views-button"));
    await expect(trigger).toHaveAttribute("data-slot", "base");
    await trigger.focus();
    await trigger.press("ArrowDown");
    const panel = page.locator(part("views-panel"));
    await expect(panel).toBeVisible();
    await expect(panel).toHaveAttribute("role", "dialog");
    await expect(panel).toHaveAttribute("data-slot", "content");
    await expect(panel).toHaveAttribute("dir", rtl ? "rtl" : "ltr");
    await expect(trigger).toHaveAttribute(
      "aria-controls",
      (await panel.getAttribute("id")) ?? ""
    );
    await expect(
      panel.getByRole("button", { name: "Original", exact: true })
    ).toBeVisible();
    const input = panel.getByRole("textbox", {
      name: "View name",
      exact: true,
    });
    await expect(input).toHaveAttribute("data-slot", "base");
    await input.fill("Browser view");
    await input.press("Enter");
    await expect(
      panel.getByRole("button", { name: "Browser view", exact: true })
    ).toBeVisible();
    await expect(input).toHaveValue("");
    await expect(page.locator('[data-test="events"]')).toHaveText(
      "saved:Browser view"
    );
    const bounds = await panel.boundingBox();
    if (!bounds) throw new Error("Saved-view menu has no browser geometry");
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(390);
    await input.press("Escape");
    await expect(panel).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await expect(trigger).not.toHaveAttribute("aria-controls");
    await trigger.press("Enter");
    await expect(
      panel.getByRole("button", { name: "Browser view", exact: true })
    ).toBeVisible();
    await expect(trigger).toHaveAttribute(
      "aria-controls",
      (await panel.getAttribute("id")) ?? ""
    );
    const outside = page.locator('[data-test="rtl"]');
    await outside.click();
    await expect(panel).toHaveCount(0);
    await expect(outside).toBeFocused();
  });

  test(`Nuxt row moves use native keyboard menus and confirm exactly once (rtl=${rtl})`, async ({
    page,
  }) => {
    await page.goto(route);
    if (rtl) await page.locator('[data-test="rtl"]').click();
    const trigger = page.locator(
      `[data-row-id="a"] ${part("row-move-menu-trigger")}`
    );
    const events = page.locator('[data-test="events"]');
    await expect(trigger).toHaveAttribute("data-slot", "base");
    await expect(trigger).toHaveAttribute("aria-haspopup", "menu");
    await trigger.focus();
    await trigger.press("ArrowDown");
    const menu = page.locator(part("row-move-menu-content"));
    await expect(menu).toBeVisible();
    await expect(menu).toHaveAttribute("role", "menu");
    await expect(trigger).toHaveAttribute(
      "aria-controls",
      (await menu.getAttribute("id")) ?? ""
    );
    const design = menu.getByRole("menuitem", { name: "Design", exact: true });
    await expect(design).toBeFocused();
    await design.press("Home");
    await expect(design).toBeFocused();
    await design.press("Enter");
    const confirmation = page.locator(part("row-move-confirmation"));
    await expect(menu).toHaveCount(0);
    await expect(confirmation).toBeVisible();
    await expect(confirmation).toHaveAttribute("role", "dialog");
    await expect(confirmation).toHaveAttribute("data-slot", "content");
    await expect(confirmation).toContainText("Core");
    await expect(confirmation).toContainText("Design");
    const cancel = confirmation.locator(part("row-move-cancel"));
    const confirm = confirmation.locator(part("row-move-confirm"));
    await expect(cancel).toBeFocused();
    await cancel.press("Tab");
    await expect(confirm).toBeFocused();
    await confirm.press("Shift+Tab");
    await expect(cancel).toBeFocused();
    await cancel.press("Escape");
    await expect(confirmation).toHaveCount(0);
    await expect(events).not.toContainText("group-move");
    await expect(trigger).toBeFocused();
    await trigger.press("ArrowUp");
    await expect(design).toBeFocused();
    await design.press("Enter");
    await expect(cancel).toBeFocused();
    await confirm.click();
    await expect(confirmation).toHaveCount(0);
    await expect
      .poll(
        async () =>
          ((await events.textContent()) ?? "").match(/group-move/g)?.length ?? 0
      )
      .toBe(1);
    await expect(page.locator('[data-row-id="a"]').first()).toBeVisible();
    await expect(page.locator('[data-test="rows"]')).toContainText("a:Design");
    await expect(page.locator('[data-test="rows"]')).toContainText("b:Core");
  });
}

test("Nuxt mobile reorder writes the host order once using native bounded controls", async ({
  page,
}) => {
  await page.goto(route);
  await page.locator('[data-test="mobile"]').click();
  const cards = page.locator(`${part("card")}[data-row-id]`);
  await expect(cards).toHaveCount(3);
  await expect
    .poll(() =>
      cards.evaluateAll((nodes) =>
        nodes.map((node) => node.getAttribute("data-row-id"))
      )
    )
    .toEqual(["a", "b", "c"]);
  const row = page.locator(`${part("card")}[data-row-id="a"]`);
  const up = row.locator(part("row-reorder-up"));
  const down = row.locator(part("row-reorder-down"));
  await expect(up).toHaveAttribute("data-slot", "base");
  await expect(down).toHaveAttribute("data-slot", "base");
  await expect(up).toBeDisabled();
  await expect(down).toBeEnabled();
  await down.click();
  await expect
    .poll(
      async () =>
        (
          (await page.locator('[data-test="events"]').textContent()) ?? ""
        ).match(/reorder/g)?.length ?? 0
    )
    .toBe(1);
  await expect
    .poll(() =>
      cards.evaluateAll((nodes) =>
        nodes.map((node) => node.getAttribute("data-row-id"))
      )
    )
    .toEqual(["b", "a", "c"]);
  await expect(cards.first().locator(part("row-reorder-up"))).toBeDisabled();
  await expect(cards.last().locator(part("row-reorder-down"))).toBeDisabled();
});
