import { expect, type Locator, type Page, test } from "@playwright/test";

import { builtAdapters } from "../apps/showcase/matrix.mjs";
import { getLabels } from "../packages/shared/i18n/src/catalog";

async function startDrag(page: Page, source: Locator): Promise<void> {
  await source.scrollIntoViewIfNeeded();
  const box = await source.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    box!.x + box!.width / 2 + 12,
    box!.y + box!.height / 2 + 12,
    { steps: 5 }
  );
}

async function dropOn(page: Page, target: Locator): Promise<void> {
  const box = await target.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2, {
    steps: 10,
  });
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2, {
    steps: 2,
  });
  await expect(target).toHaveAttribute("data-active");
  await page.mouse.up();
}

for (const framework of ["vue", "angular"] as const) {
  for (const kit of builtAdapters(framework)) {
    for (const locale of ["en", "ar"]) {
      test(`${framework} ${kit.key} ${locale}: pointer dragging exposes insertion and removal targets and commits the drop`, async ({
        page,
      }, info) => {
        const stateKey = `${framework === "vue" ? "vue-live" : "live"}.groupBy`;
        if (locale === "ar")
          await page.addInitScript(() =>
            localStorage.setItem("adapttable-demo-theme", "dark")
          );
        await page.goto(
          `/${framework}-main/?kit=${kit.key}&locale=${locale}&grouping=on&${stateKey}=team`
        );
        const grouping = () => new URL(page.url()).searchParams.get(stateKey);
        const panel = page.locator('[data-adapttable-part="grouping-panel"]');
        const zones = panel.locator(
          '[data-adapttable-part="grouping-drop-zone"]'
        );
        const handles = panel.locator(
          '[data-adapttable-part="grouping-chip-handle"]'
        );
        await expect(handles).toHaveCount(1);
        await startDrag(
          page,
          page.locator('th[data-column-key="status"]').getByRole("button", {
            name: new RegExp(`^${getLabels(locale).sortBy}:`),
          })
        );
        await expect(zones.first()).toHaveAttribute("data-dragging");
        for (const zone of await zones.all()) {
          const feedback = await zone.evaluate((element) => {
            const css = getComputedStyle(element);
            return {
              height: element.getBoundingClientRect().height,
              width: element.getBoundingClientRect().width,
              border: parseFloat(css.borderTopWidth),
              opacity: css.opacity,
              color: css.borderTopColor,
            };
          });
          expect(feedback.height).toBeGreaterThanOrEqual(28);
          expect(feedback.width).toBeGreaterThanOrEqual(8);
          expect(feedback.border).toBeGreaterThanOrEqual(1);
          expect(feedback.opacity).toBe("1");
          expect(feedback.color).not.toBe("rgba(0, 0, 0, 0)");
        }
        await dropOn(page, zones.last());
        await expect.poll(grouping).toBe("team,status");
        await expect(handles).toHaveCount(2);
        await startDrag(page, handles.last());
        const remove = panel.locator(
          '[data-adapttable-part="grouping-remove-zone"]'
        );
        await expect(remove).toBeVisible();
        expect((await remove.boundingBox())!.height).toBeGreaterThanOrEqual(44);
        await dropOn(page, zones.first());
        await expect.poll(grouping).toBe("status,team");
        await startDrag(page, handles.first());
        await expect(remove).toBeVisible();
        await page.screenshot({ path: info.outputPath("drag-feedback.png") });
        await dropOn(page, remove);
        await expect.poll(grouping).toBe("team");
        await expect(handles).toHaveCount(1);
        await expect(remove).toHaveCount(0);
        await expect(
          panel.locator(
            '[data-adapttable-part="grouping-drop-zone"][data-active]'
          )
        ).toHaveCount(0);
        // A drag released outside the strip cancels without changing grouping.
        await startDrag(page, handles.first());
        await expect(remove).toBeVisible();
        await page.mouse.move(20, 80, { steps: 10 });
        await page.mouse.up();
        await expect(remove).toHaveCount(0);
        await page.reload();
        await expect.poll(grouping).toBe("team");
        await expect(handles).toHaveCount(1);
      });
    }
  }
}
