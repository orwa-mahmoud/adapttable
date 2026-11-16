import { expect, test } from "@playwright/test";

for (const { framework, live, lab, kit, label, entry } of [
  {
    framework: "Angular",
    live: "/angular-main/",
    lab: "/angular-all-options/",
    kit: "material",
    label: "Angular Material",
    entry: "/material/",
  },
  {
    framework: "Vue",
    live: "/vue-main/",
    lab: "/vue-all-options/",
    kit: "vuetify",
    label: "Vuetify",
    entry: "/vue/vuetify/",
  },
]) {
  test(`${framework} phone navigation accepts registered destinations and rejects a modified option`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${live}?kit=${kit}`);
    const select = page.getByRole("combobox", {
      name: "Demo page",
      exact: true,
    });
    const originalSelection = await select.inputValue();
    const originalUrl = page.url();
    const title = await page.title();
    const injected = "javascript:document.title='unexpected-navigation'";
    await select.evaluate((element, value) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = "Unregistered destination";
      element.append(option);
    }, injected);
    await select.selectOption(injected);
    await expect(page).toHaveURL(originalUrl);
    await expect(select).toHaveValue(originalSelection);
    await expect(page).toHaveTitle(title);
    await select.selectOption({ label: "Feature Lab" });
    await expect.poll(() => new URL(page.url()).pathname).toBe(lab);
    expect(Object.fromEntries(new URL(page.url()).searchParams)).toEqual({
      kit,
      theme: "light",
    });
    await select.selectOption({ label: "Columns" });
    await expect
      .poll(() => new URL(page.url()).pathname)
      .toBe(`${entry}columns/`);
    await select.selectOption({ label: label });
    await expect.poll(() => new URL(page.url()).pathname).toBe(entry);
    await select.selectOption({ label: "AI" });
    await expect.poll(() => new URL(page.url()).pathname).toBe(`${entry}ai/`);
  });
}

for (const route of ["/angular-main/", "/angular-all-options/", "/ng-zorro/"]) {
  test(`${route}: Angular header has framework-specific destinations and fits a phone`, async ({
    page,
  }, testInfo) => {
    await page.goto(route);
    const header = page.getByRole("banner");
    await expect(
      header.getByRole("combobox", { name: "Framework", exact: true })
    ).toHaveValue("angular");
    await expect(
      header.getByRole("link", { name: "Docs", exact: true })
    ).toHaveAttribute("href", /\/angular\/getting-started\/$/);
    await expect(
      header.getByRole("link", { name: "GitHub", exact: true })
    ).toHaveAttribute("href", "https://github.com/orwa-mahmoud/adapttable");
    const trigger = header.getByRole("button", {
      name: "Adapters",
      exact: true,
    });
    await trigger.click();
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await expect(header.locator(".nav__menu a")).toHaveCount(9);
    await page.keyboard.press("Escape");
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await expect(trigger).toBeFocused();
    for (const width of [1024, 921, 390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      const dimensions = await header.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        return {
          left: rect.left,
          right: rect.right,
          viewport: innerWidth,
          page: document.documentElement.scrollWidth,
        };
      });
      expect(dimensions.left).toBeGreaterThanOrEqual(0);
      expect(dimensions.right).toBeLessThanOrEqual(dimensions.viewport);
      await expect
        .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
        .toBeLessThanOrEqual(width);
      if (width >= 921) {
        await trigger.click();
        await expect(header.locator(".nav__menu")).toBeVisible();
        await expect
          .poll(
            async () =>
              (await header.locator(".nav__menu").boundingBox())!.x +
              (await header.locator(".nav__menu").boundingBox())!.width
          )
          .toBeLessThanOrEqual(width - 16);
        await page.keyboard.press("Escape");
        await expect(header.locator(".nav__menu")).toBeHidden();
      }
      if (width < 920)
        await expect(
          header.getByRole("combobox", { name: "Demo page" })
        ).toBeVisible();
    }
    await page.screenshot({ path: testInfo.outputPath("phone.png") });
    if (route === "/angular-main/") {
      const arabic = page.getByRole("radio", { name: "العربية", exact: true });
      await arabic.check();
      await expect(arabic).toBeChecked();
      await expect(
        page.locator('[data-adapttable-part="root"]')
      ).toHaveAttribute("dir", "rtl");
      await header
        .getByRole("button", { name: "Toggle dark mode", exact: true })
        .click();
      await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
      await expect(page.locator("body")).toHaveCSS(
        "background-color",
        "oklch(0.16 0.007 264)"
      );
      await expect
        .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
        .toBeLessThanOrEqual(320);
      await page.screenshot({
        path: testInfo.outputPath("phone-rtl-dark.png"),
      });
    }
  });
}

test("framework switching retains local Feature Lab kit context in both directions", async ({
  page,
}) => {
  await page.goto("/angular-all-options/?kit=ng-zorro");
  await page
    .getByRole("combobox", { name: "Framework", exact: true })
    .selectOption("react");
  await expect.poll(() => new URL(page.url()).pathname).toBe("/all-options/");
  expect(Object.fromEntries(new URL(page.url()).searchParams)).toEqual({
    kit: "antd",
    theme: "light",
  });
  await expect(
    page.getByRole("combobox", { name: "Framework", exact: true })
  ).toHaveValue("react");
  await expect(page.getByTestId("adapter-antd")).toHaveAttribute(
    "aria-pressed",
    "true"
  );
  await expect(
    page.locator('[data-adapter="antd"] [data-adapttable-part="root"]')
  ).toBeVisible();
  await page
    .getByRole("combobox", { name: "Framework", exact: true })
    .selectOption("angular");
  await expect
    .poll(() => new URL(page.url()).pathname)
    .toBe("/angular-all-options/");
  expect(Object.fromEntries(new URL(page.url()).searchParams)).toEqual({
    kit: "ng-zorro",
    theme: "light",
  });
  await expect(
    page.getByRole("combobox", { name: "Framework", exact: true })
  ).toHaveValue("angular");
});

test("Angular live settings retain borders and stay inside their panel on narrow screens", async ({
  page,
}) => {
  await page.goto("/angular-main/");
  await expect(
    page.getByRole("group", { name: "Data", exact: true })
  ).toBeVisible();
  for (const [group, selected] of [
    ["Data", "Frontend"],
    ["Locale", "English"],
    ["Density", "Comfortable"],
    ["Layout", "Responsive"],
  ] as const) {
    const choices = page.getByRole("group", { name: group, exact: true });
    await expect(choices.getByRole("radio")).toHaveCount(2);
    await expect(
      choices.getByRole("radio", { name: selected, exact: true })
    ).toBeChecked();
  }
  for (const width of [1280, 390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    const controls = await page
      .locator(
        ".controls.angular-options .angular-choice__options, .controls.angular-options select"
      )
      .evaluateAll((selects) =>
        selects.map((select) => {
          const box = select.getBoundingClientRect();
          const panel = select
            .closest(".angular-options")!
            .getBoundingClientRect();
          return {
            left: box.left,
            right: box.right,
            panelLeft: panel.left,
            panelRight: panel.right,
            border: getComputedStyle(select).borderTopWidth,
          };
        })
      );
    expect(controls).toHaveLength(5);
    for (const control of controls) {
      expect(control.left).toBeGreaterThanOrEqual(control.panelLeft);
      expect(control.right).toBeLessThanOrEqual(control.panelRight);
      expect(parseFloat(control.border)).toBeGreaterThan(0);
    }
  }
});

for (const kit of ["material", "angular-cdk"]) {
  test(`${kit}: native table density remains compact and usable`, async ({
    page,
  }) => {
    await page.goto(`/angular-main/?kit=${kit}`);
    const rows = page.locator('[data-adapttable-part="row"]');
    await expect(rows.first()).toBeVisible();
    const comfortable = (await rows.first().boundingBox())!.height;
    // Comfortable is padding around the content, not a fixed height: a cell
    // that draws a person over their role is taller than one line of text.
    const fit = await rows.first().evaluate((row) => {
      const cells = [...row.querySelectorAll("td")];
      const padding = cells.map((cell) => {
        const style = getComputedStyle(cell);
        return Math.max(
          parseFloat(style.paddingTop),
          parseFloat(style.paddingBottom)
        );
      });
      const content = cells.map((cell) => {
        const style = getComputedStyle(cell);
        return (
          cell.getBoundingClientRect().height -
          parseFloat(style.paddingTop) -
          parseFloat(style.paddingBottom)
        );
      });
      const tallest = cells.reduce(
        (most, cell) =>
          Math.max(
            most,
            ...[...cell.querySelectorAll("*")].map(
              (node) => node.getBoundingClientRect().height
            )
          ),
        0
      );
      return {
        padding: Math.max(...padding),
        slack: Math.min(...content) - tallest,
      };
    });
    expect(fit.padding).toBeLessThanOrEqual(10);
    expect(fit.slack).toBeLessThanOrEqual(1);
    const compact = page.getByRole("radio", { name: "Compact", exact: true });
    await compact.focus();
    await expect(compact).toBeFocused();
    await compact.press("Space");
    await expect(compact).toBeChecked();
    // The provider scope is recreated; restore the chosen radio, not its first sibling.
    await expect(compact).toBeFocused();
    await expect(
      page.getByRole("radio", { name: "Comfortable", exact: true })
    ).not.toBeChecked();
    await expect
      .poll(async () => (await rows.first().boundingBox())?.height ?? Infinity)
      .toBeLessThan(comfortable);
    await page
      .getByRole("searchbox", { name: "Search", exact: true })
      .fill("Ada Lovelace");
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText("Ada Lovelace");
    await page
      .getByRole("button", { name: "Toggle dark mode", exact: true })
      .click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(rows.first()).toBeVisible();
  });
}

test("React retains its package cards and compact page heading", async ({
  page,
}) => {
  await page.goto("/");
  const cards = page.locator(".adapterbar");
  await expect(
    cards.getByRole("button", {
      name: "Mantine Rounded, friendly, filled controls",
      exact: true,
    })
  ).toBeVisible();
  await expect(cards.locator(".adtab__l small").first()).toBeVisible();
  await expect(cards.locator(".adtab__dot").first()).toBeVisible();
  const heading = page.getByRole("heading", { level: 1 });
  expect(
    await heading.evaluate((element) =>
      Number.parseFloat(getComputedStyle(element).fontSize)
    )
  ).toBeLessThanOrEqual(22);
  await expect(
    page.getByRole("combobox", { name: "Framework", exact: true })
  ).toHaveValue("react");
});

test("React and Angular retain the original centered content width", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  for (const [route, selector] of [
    ["/", "#demo.shell"],
    ["/angular-main/", "main.angular-demo.shell"],
    ["/angular-all-options/", "main.angular-demo.shell"],
    ["/ng-zorro/ai/", ".mx-ng.shell"],
  ] as const) {
    await page.goto(route);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator(selector)).toBeVisible();
    const container = await page.locator(selector).evaluate((shell) => {
      const box = shell.getBoundingClientRect();
      const style = getComputedStyle(shell);
      return {
        x: box.x,
        width: box.width,
        left: style.paddingLeft,
        right: style.paddingRight,
      };
    });
    expect(container.width).toBe(1140);
    expect(
      Math.abs(container.x - (1920 - container.width) / 2)
    ).toBeLessThanOrEqual(8);
    expect(container.left).toBe("28px");
    expect(container.right).toBe("28px");
  }
});
