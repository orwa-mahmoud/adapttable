/** Local matrix agents must use real table state and one native approval owner. */
import { expect, type Page, test } from "@playwright/test";

import { builtAdapters, pathOf } from "../apps/showcase/matrix.mjs";

const part = (page: Page, name: string) =>
  page.locator(`[data-adapttable-part="${name}"]`);

async function send(page: Page, text: string): Promise<void> {
  const input = part(page, "assistant-input");
  await input.fill(text);
  await input.press("Enter");
}

async function surface(
  page: Page,
  value: string,
  label: string,
  tracksExpansion: boolean
): Promise<void> {
  const group = page.getByRole("group", {
    name: "Approval surface",
    exact: true,
  });
  const field = page.getByRole("combobox", {
    name: "Approval surface",
    exact: true,
  });
  await expect(group.or(field)).toBeVisible();
  if (await group.count()) {
    await group.getByRole("button", { name: label, exact: true }).click();
    return;
  }
  if (await field.evaluate((element) => element instanceof HTMLSelectElement)) {
    await field.selectOption(value);
    return;
  }
  const native = field
    .locator(
      "xpath=ancestor::*[contains(concat(' ', normalize-space(@class), ' '), ' el-select ') or contains(concat(' ', normalize-space(@class), ' '), ' v-field ')]"
    )
    .first();
  if (await native.count()) await native.click();
  else await field.click();
  if (tracksExpansion)
    await expect(field).toHaveAttribute("aria-expanded", "true");
  await page.getByRole("option", { name: label, exact: true }).click();
  if (tracksExpansion)
    await expect(field).toHaveAttribute("aria-expanded", "false");
}

for (const kit of builtAdapters("vue")) {
  for (const width of [1440, 390]) {
    const rowPart = width === 390 ? "card" : "row";
    test(`${kit.key}: ${width}px local AI sorts, answers, resets and cancels`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`/vue/${pathOf(kit)}/ai/?locale=en`);
      const rows = page.locator(`.mx-demo [data-adapttable-part="${rowPart}"]`);
      await part(page, "assistant-launcher").click();
      await send(page, "sort salaries");
      await expect(rows.first()).toContainText("Grace Hopper");
      await part(page, "assistant-receipts-toggle-button").click();
      await expect(part(page, "assistant-receipt")).toHaveAttribute(
        "data-status",
        "executed"
      );
      await part(page, "assistant-receipt-undo-button").click();
      await expect(rows.first()).toContainText("Ada Lovelace");
      await send(page, "choose a person");
      await expect(part(page, "assistant-question-options")).toBeVisible();
      await part(page, "assistant-question-options")
        .getByRole("button", { name: "Katherine Johnson", exact: true })
        .click();
      await expect(rows).toHaveCount(1);
      await expect(rows.first()).toContainText("Katherine Johnson");
      await send(page, "show everyone");
      await expect(rows).toHaveCount(3);
      await send(page, "wait");
      const stop = part(page, "assistant-stop");
      await expect(stop).toBeVisible();
      await stop.click();
      await expect(stop).toHaveCount(0);
      await expect(rows).toHaveCount(3);
      await expect(page.locator("[data-demo-log]")).toHaveText(
        "No host writes yet"
      );
    });

    for (const [value, label] of [
      ["widget", "Assistant"],
      ["table", "Table"],
      ["modal", "Dialog"],
    ] as const) {
      test(`${kit.key}: ${width}px ${value} approval rejects and commits one host write`, async ({
        page,
      }, info) => {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(`/vue/${pathOf(kit)}/ai/?locale=en`);
        await surface(page, value, label, kit.key === "naive-ui");
        const grace = page.locator(
          `.mx-demo [data-adapttable-part="${rowPart}"][data-row-id="grace"]`
        );
        await part(page, "assistant-launcher").click();
        await send(page, "propose Grace's salary as 150");
        if (value === "table") await part(page, "assistant-close").click();
        const approve = part(page, "agent-approval-approve");
        const reject = part(page, "agent-approval-reject");
        await expect(approve).toHaveCount(1);
        await expect(approve).toBeVisible();
        await expect(grace).toContainText("140");
        const capture = info.outputPath(
          `${kit.key}-${width}-${value}-approval.png`
        );
        await page.screenshot({ path: capture });
        await info.attach("native approval", {
          path: capture,
          contentType: "image/png",
        });
        await reject.click();
        await expect(approve).toHaveCount(0);
        await expect(page.locator("[data-demo-log]")).toHaveText(
          "No host writes yet"
        );
        if (value === "table") await part(page, "assistant-launcher").click();
        await send(page, "propose Grace's salary as 150");
        if (value === "table") await part(page, "assistant-close").click();
        await expect(approve).toHaveCount(1);
        await approve.click();
        await expect(approve).toHaveCount(0);
        await expect(grace).toContainText("150");
        await expect(page.locator("[data-demo-log]")).toHaveText(
          "Grace Hopper salary saved: 150"
        );
      });
    }
  }
}
