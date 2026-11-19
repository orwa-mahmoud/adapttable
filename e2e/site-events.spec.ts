import { type BrowserContext, expect, type Page, test } from "@playwright/test";

import { SITE_EVENT, SITE_SURFACE } from "../scripts/site-events.mjs";

/**
 * The site reports what a visitor does through `window.gtag`, which only the
 * production tag on the real site defines. Each test stands in for that tag
 * with a recorder and lifts the automated-browser guard, then uses the
 * controls a visitor uses and reads back the events they sent.
 */
interface SentEvent {
  name: string;
  params: Record<string, unknown>;
}

const DOCS_URL = "http://localhost:4323";
const TABLE_ROOT = '[data-adapttable-part="root"]';

async function recordEvents(
  page: Page,
  context: BrowserContext
): Promise<SentEvent[]> {
  const sent: SentEvent[] = [];
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.exposeFunction(
    "__recordSiteEvent",
    (command: string, name: string, params: Record<string, unknown>) => {
      if (command === "event") sent.push({ name, params: params ?? {} });
    }
  );
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => false });
    const record = (window as unknown as Record<string, unknown>)
      .__recordSiteEvent as (...args: unknown[]) => void;
    (window as unknown as Record<string, unknown>).gtag = (
      ...args: unknown[]
    ) => record(...args);
  });
  return sent;
}

/** How long a sent event has to reach the recorder, and how often to look. */
const EVENT_TIMEOUT_MS = 5000;
const EVENT_POLL_MS = 50;

/**
 * The first event with this name and these parameters, once it has been
 * sent; `undefined` when none arrives in time.
 */
async function eventSent(
  sent: SentEvent[],
  name: string,
  params: Record<string, unknown>
): Promise<SentEvent | undefined> {
  const matches = (event: SentEvent) =>
    event.name === name &&
    Object.entries(params).every(([key, value]) => event.params[key] === value);
  const deadline = Date.now() + EVENT_TIMEOUT_MS;
  while (!sent.some(matches) && Date.now() < deadline)
    await new Promise((settle) => setTimeout(settle, EVENT_POLL_MS));
  return sent.find(matches);
}

test("the React main demo reports kit, option, copy, table use and buttons", async ({
  page,
  context,
}) => {
  const sent = await recordEvents(page, context);
  await page.goto("/");
  await page.locator(TABLE_ROOT).first().waitFor();

  await page.locator(".adapterbar .adtab:not(.is-on)").first().click();
  expect(await eventSent(sent, SITE_EVENT.kitSwitch, {})).toBeDefined();
  const kit = sent.find((event) => event.name === SITE_EVENT.kitSwitch)?.params
    .kit;
  await expect(page).toHaveURL(new RegExp(`kit=${String(kit)}`));

  await page
    .getByRole("group", { name: "density" })
    .getByRole("button", { name: "Compact" })
    .click();
  expect(
    await eventSent(sent, SITE_EVENT.demoOption, { item: "density=compact" })
  ).toBeDefined();

  await page.getByRole("button", { name: "Copy install command" }).click();
  expect(
    await eventSent(sent, SITE_EVENT.copyInstall, {
      surface: SITE_SURFACE.demoMain,
      item: "npx @adapttable/cli init",
    })
  ).toBeDefined();

  const table = page.locator(TABLE_ROOT).first();
  await table.locator("input").first().click();
  await table.locator("input").first().press("a");
  expect(
    await eventSent(sent, SITE_EVENT.demoInteract, {
      surface: SITE_SURFACE.demoMain,
    })
  ).toBeDefined();
  expect(
    sent.filter((event) => event.name === SITE_EVENT.demoInteract)
  ).toHaveLength(1);

  await page.locator(".trial-cta__docs").click();
  expect(
    await eventSent(sent, SITE_EVENT.ctaClick, {
      surface: SITE_SURFACE.demoMain,
      item: "trial_docs",
    })
  ).toBeDefined();
});

test("a React kit page reports its code and install copies", async ({
  page,
  context,
}) => {
  const sent = await recordEvents(page, context);
  await page.goto("/mui/rows/");
  await page.locator(".mx-code__copy").first().click();
  expect(
    await eventSent(sent, SITE_EVENT.copyCode, {
      surface: SITE_SURFACE.demoKit,
      item: "rows",
    })
  ).toBeDefined();

  await page.goto("/mui/");
  await page.getByRole("button", { name: "Copy install" }).click();
  expect(
    await eventSent(sent, SITE_EVENT.copyInstall, {
      surface: SITE_SURFACE.demoKit,
    })
  ).toBeDefined();
  const install = sent.find((event) => event.name === SITE_EVENT.copyInstall);
  expect(String(install?.params.item)).toContain("@adapttable/mui");
});

test("the Vue main demo reports the setup copy, an option and a kit switch", async ({
  page,
  context,
}) => {
  const sent = await recordEvents(page, context);
  await page.goto("/vue-main/");
  await page.getByRole("button", { name: "Copy setup command" }).click();
  expect(
    await eventSent(sent, SITE_EVENT.copyInstall, {
      surface: SITE_SURFACE.demoMain,
    })
  ).toBeDefined();

  await page.locator('[data-demo-control="filters"]').selectOption("drawer");
  expect(
    await eventSent(sent, SITE_EVENT.demoOption, { item: "filters=drawer" })
  ).toBeDefined();

  await page.waitForURL(/filters=drawer/);
  await page.locator('[data-demo-control^="kit-"]:not(.is-on)').first().click();
  expect(await eventSent(sent, SITE_EVENT.kitSwitch, {})).toBeDefined();
});

test("the Angular main demo reports the setup copy and an option", async ({
  page,
  context,
}) => {
  const sent = await recordEvents(page, context);
  await page.goto("/angular-main/");
  await page.getByRole("button", { name: "Copy setup command" }).click();
  expect(
    await eventSent(sent, SITE_EVENT.copyInstall, {
      surface: SITE_SURFACE.demoMain,
    })
  ).toBeDefined();

  await page.locator('[data-demo-control="filters"]').selectOption("drawer");
  expect(
    await eventSent(sent, SITE_EVENT.demoOption, { item: "filters=drawer" })
  ).toBeDefined();
});

test("Vue and Angular kit pages report their code copies", async ({
  page,
  context,
}) => {
  const sent = await recordEvents(page, context);
  for (const path of ["/vue/element-plus/columns/", "/material/columns/"]) {
    sent.length = 0;
    await page.goto(path);
    await page.getByRole("button", { name: "Copy", exact: true }).click();
    expect(
      await eventSent(sent, SITE_EVENT.copyCode, {
        surface: SITE_SURFACE.demoKit,
        item: "columns",
      }),
      path
    ).toBeDefined();
  }
});

test.describe("landing page and docs", () => {
  test.use({ baseURL: DOCS_URL });

  test("the landing page reports the install copy, a button and the framework", async ({
    page,
    context,
  }) => {
    const sent = await recordEvents(page, context);
    await page.goto("/");
    await page
      .getByRole("button", { name: "Copy install command" })
      .first()
      .click();
    expect(
      await eventSent(sent, SITE_EVENT.copyInstall, {
        surface: SITE_SURFACE.landing,
        item: "npx @adapttable/cli init",
      })
    ).toBeDefined();

    await page.locator("[data-landing-framework]").selectOption("vue");
    expect(
      await eventSent(sent, SITE_EVENT.frameworkSwitch, { framework: "vue" })
    ).toBeDefined();

    await page.locator('[data-cta="docs"]').click();
    expect(
      await eventSent(sent, SITE_EVENT.ctaClick, {
        surface: SITE_SURFACE.landing,
        item: "docs",
      })
    ).toBeDefined();
  });

  test("a docs page reports a code-block copy and a framework switch", async ({
    page,
    context,
  }) => {
    const sent = await recordEvents(page, context);
    await page.goto("/react/getting-started/");
    await page.locator(".expressive-code .copy button").first().click();
    await expect
      .poll(() =>
        sent.some(
          (event) =>
            (event.name === SITE_EVENT.copyInstall ||
              event.name === SITE_EVENT.copyCode) &&
            event.params.surface === SITE_SURFACE.docs
        )
      )
      .toBe(true);

    await page
      .locator("[data-framework-select]:visible")
      .first()
      .selectOption("vue");
    expect(
      await eventSent(sent, SITE_EVENT.frameworkSwitch, { framework: "vue" })
    ).toBeDefined();
  });
});
