import { expect, type Page, test, type TestInfo } from "@playwright/test";

import { VUE_KIT_PAGES } from "../apps/showcase/matrix.mjs";

const part = (name: string) => `[data-adapttable-part="${name}"]`;

async function capture(
  page: Page,
  info: TestInfo,
  name: string
): Promise<void> {
  const path = info.outputPath(`${name}.png`);
  await page.screenshot({ path, fullPage: true, animations: "disabled" });
  await info.attach(name, { path, contentType: "image/png" });
}

const nativeStatus: Readonly<Record<string, string>> = {
  "element-plus": ".el-tag",
  vuetify: ".v-chip",
  "naive-ui": ".n-tag",
  "reka-ui": ".vue-kit-preview__status",
  "shadcn-vue": ".vue-kit-preview__status",
  "nuxt-ui": '[data-order-status="Review"]',
  quasar: ".q-badge",
} as const;

for (const kit of VUE_KIT_PAGES) {
  test(`${kit.path}: compact orders, native status and visible presentation choices`, async ({
    page,
  }, info) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(
      `/${kit.dir}/?theme=light&lang=en&layout=auto&presentation-proof=keep`
    );
    const table = page.getByRole("table", { name: "Order desk", exact: true });
    await expect(table).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Orders", exact: true })
    ).toBeVisible();
    for (const [group, chosen, alternate] of [
      ["Appearance", "Light", "Dark"],
      ["Language", "English", "العربية"],
      ["Layout", "Responsive", "Cards"],
    ] as const) {
      const choices = page.getByRole("group", { name: group, exact: true });
      await expect(
        choices.getByRole("button", { name: chosen, exact: true })
      ).toHaveAttribute("aria-pressed", "true");
      await expect(
        choices.getByRole("button", { name: alternate, exact: true })
      ).toHaveAttribute("aria-pressed", "false");
      await expect(choices.getByRole("combobox")).toHaveCount(0);
    }
    const bounds = await table.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.y).toBeLessThan(340);
    const statusSelector = nativeStatus[kit.path];
    if (!statusSelector)
      throw new Error(`Missing status selector for ${kit.path}`);
    await expect(table.locator(statusSelector).first()).toBeVisible();
    await expect(page.getByTestId("selection-status")).toHaveText("0 selected");
    await capture(page, info, `${kit.path}-compact-orders-light`);

    await page.getByRole("searchbox").fill("Cedar");
    await expect(table.locator("tbody [data-row-id]")).toHaveCount(1);
    await expect(page).toHaveURL(/Cedar/);
    await page
      .getByRole("group", { name: "Appearance", exact: true })
      .getByRole("button", { name: "Dark", exact: true })
      .click();
    await expect(page.locator("body")).toHaveAttribute(
      "data-workspace-theme",
      "dark"
    );
    await expect(page.getByRole("searchbox")).toHaveValue("Cedar");
    await expect(table.locator("tbody [data-row-id]")).toHaveCount(1);
    await expect(page).toHaveURL(/presentation-proof=keep/);
    await capture(page, info, `${kit.path}-compact-orders-dark`);

    const layout = page.getByRole("group", { name: "Layout", exact: true });
    await layout.getByRole("button", { name: "Cards", exact: true }).click();
    await expect(page.locator(part("card"))).toHaveCount(1);
    await expect(
      page.locator(`${part("card")} [data-order-status]`).first()
    ).toBeVisible();
    await page
      .getByRole("group", { name: "Language", exact: true })
      .getByRole("button", { name: "العربية", exact: true })
      .click();
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(
      page.getByRole("button", { name: "العربية", exact: true })
    ).toHaveAttribute("aria-pressed", "true");
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.locator(part("card"))).toHaveCount(1);
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth
      )
    ).toBeLessThanOrEqual(1);
    await capture(page, info, `${kit.path}-compact-orders-mobile-rtl`);

    await page.goBack();
    await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
    await expect(page.getByRole("searchbox")).toHaveValue("Cedar");
    await page.goForward();
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    expect(errors).toEqual([]);
  });
  if (
    ["element-plus", "vuetify", "reka-ui", "shadcn-vue", "nuxt-ui"].includes(
      kit.path
    )
  ) {
    test(`${kit.path}: native column menu pins and retains the visible column demo`, async ({
      page,
    }, info) => {
      await page.setViewportSize({ width: 1024, height: 900 });
      await page.goto(`/${kit.dir}/?theme=light&lang=en&layout=auto`);
      const surface = page.locator(".vue-kit-preview__table");
      const columns = surface.getByRole("button", {
        name: "Columns",
        exact: true,
      });
      await columns.click();
      const panel = page.locator(part("column-menu-panel"));
      await expect(panel).toBeVisible();
      await panel
        .getByRole("button", { name: "Pin to start: Customer", exact: true })
        .click();
      await page.keyboard.press("Escape");
      await expect(panel).toBeHidden();
      await expect(columns).toBeFocused();
      const customer = surface.getByRole("cell", {
        name: "Atelier North",
        exact: true,
      });
      await expect(customer).toHaveAttribute("data-pinned", "start");
      await expect(
        surface.getByRole("columnheader", { name: /Region/ })
      ).toBeVisible();
      await expect(
        surface.getByRole("columnheader", { name: /Owner/ })
      ).toBeVisible();
      const scroll = surface.locator(part("scroll-box"));
      const header = surface.locator('th[data-column-key="customer"]');
      await expect(header).toHaveAttribute("data-pinned", "start");
      const before = await customer.boundingBox();
      expect(before).not.toBeNull();
      const geometry = await scroll.evaluate((element) => ({
        edge: element.getBoundingClientRect().left + element.clientLeft,
        available: element.scrollWidth - element.clientWidth,
      }));
      // Customer follows Order, so it moves normally until it reaches the edge.
      const threshold = before!.x - geometry.edge;
      expect(threshold).toBeGreaterThan(0);
      expect(geometry.available).toBeGreaterThan(threshold + 20);
      const firstScroll = await scroll.evaluate(
        (element, position) => {
          element.scrollLeft = position;
          return element.scrollLeft;
        },
        (threshold + geometry.available) / 2
      );
      expect(firstScroll).toBeGreaterThan(threshold);
      const expectPinnedAtEdge = async () => {
        for (const target of [header, customer]) {
          await expect
            .poll(async () =>
              Math.abs((await target.boundingBox())!.x - geometry.edge)
            )
            .toBeLessThanOrEqual(1);
        }
      };
      await expectPinnedAtEdge();
      const finalScroll = await scroll.evaluate((element) => {
        element.scrollLeft = element.scrollWidth;
        return element.scrollLeft;
      });
      expect(finalScroll).toBeGreaterThan(firstScroll + 9);
      await expectPinnedAtEdge();
      await expect
        .poll(() =>
          new URL(page.url()).searchParams.get(`kit-${kit.path}-orders.colPin`)
        )
        .toBe("customer:start");
      await capture(page, info, `${kit.path}-native-columns-pinned`);
      await page.reload();
      await expect(customer).toHaveAttribute("data-pinned", "start");
      await expect(
        surface.getByRole("columnheader", { name: /Region/ })
      ).toBeVisible();
    });
  }
}

test("Vue workspace exposes binary preferences and grouping without losing the view", async ({
  page,
}) => {
  await page.goto(
    "/vue/unstyled/workspace/?view=orders&lang=en&layout=auto&theme=light"
  );
  const layout = page.getByRole("group", { name: "Layout", exact: true });
  await layout.getByRole("button", { name: "Cards", exact: true }).click();
  await expect(page).toHaveURL(/layout=cards/);
  await expect(
    layout.getByRole("button", { name: "Cards", exact: true })
  ).toHaveAttribute("aria-pressed", "true");
  await layout.getByRole("button", { name: "Responsive", exact: true }).click();
  const grouping = page.getByRole("group", {
    name: "Group by region",
    exact: true,
  });
  await grouping
    .getByRole("button", { name: "By region", exact: true })
    .click();
  await expect(
    grouping.getByRole("button", { name: "By region", exact: true })
  ).toHaveAttribute("aria-pressed", "true");
  await grouping
    .getByRole("button", { name: "Ungrouped", exact: true })
    .click();
  await expect(
    grouping.getByRole("button", { name: "Ungrouped", exact: true })
  ).toHaveAttribute("aria-pressed", "true");
  await page
    .getByRole("group", { name: "Language", exact: true })
    .getByRole("button", { name: "العربية", exact: true })
    .click();
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await page.goBack();
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
  await expect(page).toHaveURL(/view=orders/);
});

test("Angular live settings expose binary choices and preserve URL history", async ({
  page,
}, info) => {
  await page.goto(
    "/angular-main/?kit=material&locale=en&density=comfortable&mobile=off&presentation-proof=keep"
  );
  for (const [group, options] of [
    ["Data", ["Frontend", "Server"]],
    ["Locale", ["English", "العربية"]],
    ["Density", ["Comfortable", "Compact"]],
    ["Layout", ["Responsive", "Cards"]],
  ] as const) {
    const choices = page.getByRole("group", { name: group, exact: true });
    for (const name of options)
      await expect(
        choices.getByRole("radio", { name, exact: true })
      ).toBeVisible();
    await expect(choices.getByRole("combobox")).toHaveCount(0);
  }
  await page.getByRole("radio", { name: "Compact", exact: true }).check();
  await expect(page).toHaveURL(/density=compact/);
  await page.getByRole("radio", { name: "Cards", exact: true }).check();
  await expect(page).toHaveURL(/mobile=on/);
  await expect(
    page.getByRole("radio", { name: "Cards", exact: true })
  ).toBeChecked();
  await expect(
    page.getByRole("radio", { name: "Cards", exact: true })
  ).toBeFocused();
  await page.getByRole("radio", { name: "العربية", exact: true }).check();
  await expect(page).toHaveURL(/locale=ar/);
  await expect(
    page.getByRole("radio", { name: "العربية", exact: true })
  ).toBeChecked();
  await expect(
    page.getByRole("radio", { name: "العربية", exact: true })
  ).toBeFocused();
  await expect(page.locator(part("root")).first()).toHaveAttribute(
    "dir",
    "rtl"
  );
  await expect(page).toHaveURL(/presentation-proof=keep/);
  await capture(page, info, "angular-live-binary-rtl");
  await page.goBack();
  await expect(
    page.getByRole("radio", { name: "English", exact: true })
  ).toBeChecked();
  await expect(page.locator(part("root")).first()).toHaveAttribute(
    "dir",
    "ltr"
  );
});

test("Angular lab keeps binary choices visible and larger choices in selects", async ({
  page,
}, info) => {
  await page.goto("/angular-all-options/?kit=ng-zorro&locale=en");
  await page
    .getByRole("button", { name: "Configure options", exact: true })
    .click();
  const controls = page.getByRole("dialog", {
    name: "Feature Lab controls",
    exact: true,
  });
  await expect(controls).toBeVisible();
  await expect(
    controls.getByRole("radio", { name: "Paged", exact: true })
  ).toBeVisible();
  await expect(
    controls.getByRole("radio", { name: "Infinite", exact: true })
  ).toBeVisible();
  await expect(
    controls.getByRole("radio", { name: "Live demo", exact: true })
  ).toBeVisible();
  await expect(
    controls.getByRole("radio", { name: "Checklist & facets", exact: true })
  ).toBeVisible();
  await expect(
    controls.getByRole("combobox", { name: "Dataset", exact: true })
  ).toBeVisible();
  await expect(
    controls.getByRole("combobox", { name: "Editing mode", exact: true })
  ).toBeVisible();
  await capture(page, info, "angular-lab-settings");
  await controls.getByRole("button", { name: "Done", exact: true }).click();
  await expect(controls).toBeHidden();
});

test("Angular feature pages offer English and Arabic and a filter layout selector", async ({
  page,
}, info) => {
  await page.goto("/material/filtering/?locale=en&presentation-proof=keep");
  const locale = page.getByRole("group", { name: "Locale", exact: true });
  await expect(locale.getByRole("radio")).toHaveCount(2);
  const filterLayout = page.getByRole("combobox", {
    name: "Filter layout",
    exact: true,
  });
  await expect(filterLayout).toBeVisible();
  await filterLayout.selectOption("drawer");
  await expect(filterLayout).toHaveValue("drawer");
  await locale.getByRole("radio", { name: "العربية", exact: true }).check();
  await expect(page.locator(part("root")).first()).toHaveAttribute(
    "dir",
    "rtl"
  );
  await expect(page).toHaveURL(/presentation-proof=keep/);
  await capture(page, info, "angular-matrix-locale-rtl");
});
