import { expect, test } from "@playwright/test";

import { builtAdapters, pathOf } from "../apps/showcase/matrix.mjs";

for (const framework of ["react", "angular", "vue"] as const) {
  for (const kit of builtAdapters(framework)) {
    const route = `${framework === "vue" ? "/vue" : ""}/${pathOf(kit)}/mobile-cards/`;
    test(`${framework}/${kit.key}: edit, select and resize without losing the draft`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(`${route}?locale=en`);
      const root = page.locator(".mx-demo");
      const card = root.locator('[data-adapttable-part="card"]').first();
      await expect(card).toBeVisible();
      await page
        .getByRole("button", { name: "Automatic", exact: true })
        .click();
      const selection = card.getByRole("checkbox").first();
      const label = selection.locator("xpath=ancestor::label[1]");
      if (await label.count()) await label.click();
      else await selection.check();
      const target = (await label.count()) ? label : selection;
      const box = await target.boundingBox();
      expect(box?.width).toBeGreaterThanOrEqual(44);
      expect(box?.height).toBeGreaterThanOrEqual(44);
      await expect(selection).toBeChecked();
      await card.getByRole("button", { name: /^(Edit|Edit row)$/ }).click();
      const name = card
        .locator('input:not([type="checkbox"]):not([type="hidden"])')
        .first();
      await name.fill("Ada mobile draft");
      const secondText = card
        .locator(
          'input:not([type="checkbox"]):not([type="hidden"]):not([readonly])'
        )
        .last();
      await secondText.focus();
      await expect(secondText).toBeFocused();
      const focusedValue = await secondText.inputValue();
      const editButtons = card.locator(
        '[data-adapttable-part="row-edit-save"], [data-adapttable-part="row-edit-cancel"]'
      );
      await expect(editButtons).toHaveCount(2);
      expect(
        await editButtons.evaluateAll((buttons) =>
          buttons.every((button) => {
            const rect = button.getBoundingClientRect();
            return rect.width >= 44 && rect.height >= 44;
          })
        )
      ).toBe(true);
      await page.setViewportSize({ width: 1280, height: 900 });
      await expect(card).toHaveCount(0);
      await expect
        .poll(() =>
          page.evaluate(() => {
            const active = document.activeElement;
            return active instanceof HTMLInputElement &&
              active.closest('[data-adapttable-part="edit-cell-editor"]')
              ? active.value
              : null;
          })
        )
        .toBe(focusedValue);
      await expect
        .poll(() =>
          root
            .locator("input")
            .evaluateAll((inputs) =>
              inputs.some(
                (input) =>
                  input instanceof HTMLInputElement &&
                  input.value === "Ada mobile draft"
              )
            )
        )
        .toBe(true);
      await page.setViewportSize({ width: 390, height: 844 });
      await expect(name).toHaveValue("Ada mobile draft");
      await expect(selection).toBeChecked();
      await expect(secondText).toBeFocused();
      const layout = page.getByRole("button", {
        name: "Scrollable table",
        exact: true,
      });
      await layout.click();
      await expect(layout).toBeFocused();
      await page
        .getByRole("button", { name: "Phone cards", exact: true })
        .click();
      await card.locator('[data-adapttable-part="row-edit-save"]').click();
      await expect(card).toContainText("Ada mobile draft");
      await expect(
        card.locator('[data-adapttable-part="row-edit-save"]')
      ).toHaveCount(0);
      // Clicking the explicit layout chooser must leave focus on that control.
      const scrollChoice = page.getByRole("button", {
        name: "Scrollable table",
        exact: true,
      });
      await scrollChoice.click();
      await expect(scrollChoice).toBeFocused();
      await page
        .getByRole("button", { name: "Phone cards", exact: true })
        .click();
      await expect(card).toContainText("Ada mobile draft");
      await expect(selection).toBeChecked();
      await page.setViewportSize({ width: 1280, height: 900 });
      await scrollChoice.click();
      const search = root.locator(
        'input[data-adapttable-part="search"], [data-adapttable-part="search"] input'
      );
      await search.fill("Ada mobile draft");
      await expect
        .poll(() =>
          root
            .locator('[data-adapttable-part="row"]')
            .filter({ hasText: "Ada mobile draft" })
            .count()
        )
        .toBe(1);
      // Query changes intentionally clear uncontrolled selection. Select the filtered row,
      // then verify that presentation changes preserve that new selection.
      const filteredSelection = root
        .locator("tbody tr")
        .filter({ hasText: "Ada mobile draft" })
        .getByRole("checkbox")
        .first();
      await expect(filteredSelection).not.toBeChecked();
      if (!(await filteredSelection.isChecked())) {
        const filteredLabel = filteredSelection.locator(
          "xpath=ancestor::label[1]"
        );
        if (await filteredLabel.count()) await filteredLabel.click();
        else await filteredSelection.check();
      }
      await page.setViewportSize({ width: 390, height: 844 });
      await page
        .getByRole("button", { name: "Phone cards", exact: true })
        .click();
      await expect(card).toContainText("Ada mobile draft");
      await expect(selection).toBeChecked();
      await expect(search).toHaveValue("Ada mobile draft");
    });
    if (framework === "react")
      test(`${framework}/${kit.key}: long Arabic content at 320px and enlarged text`, async ({
        page,
      }, info) => {
        await page.setViewportSize({ width: 320, height: 740 });
        await page.goto(`${route}?locale=ar&dir=rtl&theme=dark`);
        const root = page.locator(".mx-demo");
        const card = root.locator('[data-adapttable-part="card"]').first();
        await expect(card).toBeVisible();
        await card
          .locator('[data-adapttable-part="row-edit-begin"]')
          .first()
          .click();
        const name = card
          .locator('input:not([type="checkbox"]):not([type="hidden"])')
          .first();
        await name.fill("");
        await card.locator('[data-adapttable-part="row-edit-save"]').click();
        await expect(
          card.locator('[aria-invalid="true"]').first()
        ).toBeVisible();
        await name.fill("اسم طويل لاختبار التفاف النص داخل البطاقة".repeat(6));
        await card.locator('[data-adapttable-part="row-edit-save"]').click();
        await expect(card).toContainText("اسم طويل");
        await page
          .getByRole("button", { name: "Custom card", exact: true })
          .click();
        await page.addStyleTag({
          content: "html { font-size: 200% !important; }",
        });
        expect(
          await page.evaluate(
            () =>
              document.documentElement.scrollWidth -
              document.documentElement.clientWidth
          )
        ).toBeLessThanOrEqual(1);
        await card.screenshot({
          path: info.outputPath("react-custom-ar-text200.png"),
        });
      });
    if (framework !== "react")
      test(`${framework}/${kit.key}: custom bodies, validation and recovery at 320px in Arabic`, async ({
        page,
      }, info) => {
        await page.setViewportSize({ width: 320, height: 740 });
        await page.goto(`${route}?locale=ar&dir=rtl&theme=dark`);
        const root = page.locator(".mx-demo");
        const card = root.locator('[data-adapttable-part="card"]').first();
        await expect(card).toBeVisible();
        await page
          .getByRole("button", { name: "Custom card", exact: true })
          .click();
        await expect(card.locator("[data-demo-custom-card]")).toBeVisible();
        await card.locator('[data-adapttable-part="row-edit-begin"]').click();
        const name = card
          .locator('input:not([type="checkbox"]):not([type="hidden"])')
          .first();
        await name.fill("");
        await card.locator('[data-adapttable-part="row-edit-save"]').click();
        await expect(
          card.locator('[aria-invalid="true"]').first()
        ).toBeVisible();
        await name.fill(
          "اسم طويل للغاية لاختبار التفاف النص داخل البطاقة دون فقدان أدوات التحرير".repeat(
            3
          )
        );
        await card.locator('[data-adapttable-part="row-edit-save"]').click();
        await expect(
          card.locator('[data-adapttable-part="row-edit-save"]')
        ).toHaveCount(0);
        await page
          .getByRole("button", { name: "Bounded list", exact: true })
          .click();
        const region = root
          .locator(
            framework === "vue"
              ? '[data-adapttable-part="scroll-box"]'
              : '[data-adapttable-part="cards"]'
          )
          .first();
        await expect(region).toHaveCSS("max-height", "240px");
        await expect(region).toHaveAttribute("tabindex", "0");
        await expect
          .poll(() =>
            region.evaluate(
              (element) => element.scrollHeight - element.clientHeight
            )
          )
          .toBeGreaterThan(0);
        await region.focus();
        await page.keyboard.press("ArrowDown");
        await expect
          .poll(() => region.evaluate((element) => element.scrollTop))
          .toBeGreaterThan(0);
        await region.evaluate((element) => {
          element.scrollTop = 0;
        });
        await region.hover();
        await page.mouse.wheel(0, 300);
        await expect
          .poll(() => region.evaluate((element) => element.scrollTop))
          .toBeGreaterThan(0);
        await page
          .getByRole("button", { name: "Bounded list", exact: true })
          .click();
        await page.getByRole("button", { name: "Paged", exact: true }).click();
        await expect(
          page.getByRole("button", { name: "Infinite scroll", exact: true })
        ).toHaveAttribute("aria-pressed", "false");
        await expect(
          page.getByRole("button", { name: "Paged", exact: true })
        ).toHaveAttribute("aria-pressed", "true");
        await page
          .getByRole("button", { name: "Infinite scroll", exact: true })
          .click();
        await expect(
          page.getByRole("button", { name: "Infinite scroll", exact: true })
        ).toHaveAttribute("aria-pressed", "true");
        await page.addStyleTag({
          content: "html { font-size: 200% !important; }",
        });
        expect(
          await page.evaluate(
            () =>
              document.documentElement.scrollWidth -
              document.documentElement.clientWidth
          )
        ).toBeLessThanOrEqual(1);
        await card.screenshot({
          path: info.outputPath("custom-ar-320-text200.png"),
        });
        for (const state of ["Empty", "Loading", "Error", "Rows"]) {
          await page.getByRole("button", { name: state, exact: true }).click();
          if (state === "Rows") await expect(card).toBeVisible();
          else if (state === "Error")
            await expect(
              root.locator('[data-adapttable-part="error"]')
            ).toBeVisible();
          else if (state === "Empty") await expect(card).toHaveCount(0);
          else
            await expect(
              root
                .locator(
                  '[data-adapttable-part="refresh-indicator"], [data-adapttable-part="loading"]'
                )
                .first()
            ).toBeVisible();
        }
      });
  }
}
