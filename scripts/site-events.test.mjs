import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";

import {
  analyticsTag,
  CLARITY_PROJECT_ID,
  clarityTag,
  copyEventName,
  DEMO_OPTION,
  demoChoiceEvent,
  GA_MEASUREMENT_ID,
  onTableAction,
  PARAM_LIMIT,
  reportErrors,
  SITE_EVENT,
  SITE_SURFACE,
  track,
  trackCopy,
  trackOnce,
  watchCtaClicks,
} from "./site-events.mjs";

/** A minimal browser: a document that dispatches to listeners, a navigator, a fake gtag. */
function fakeBrowser({ webdriver = false, withGtag = true } = {}) {
  const calls = [];
  const listeners = new Map();
  const document = {
    addEventListener(type, listener) {
      listeners.set(type, [...(listeners.get(type) ?? []), listener]);
    },
    removeEventListener(type, listener) {
      listeners.set(
        type,
        (listeners.get(type) ?? []).filter((each) => each !== listener)
      );
    },
  };
  globalThis.window = globalThis;
  globalThis.document = document;
  Object.defineProperty(globalThis, "navigator", {
    value: { webdriver },
    configurable: true,
    writable: true,
  });
  if (withGtag) globalThis.gtag = (...args) => calls.push(args);
  else delete globalThis.gtag;
  const dispatch = (type, target) => {
    for (const listener of listeners.get(type) ?? [])
      listener({ type, target });
  };
  return { calls, dispatch };
}

/** An element whose `closest` answers for the selectors it is inside. */
function element(inside = {}) {
  return { closest: (selector) => inside[selector] ?? null };
}

const TABLE_ROOT = '[data-adapttable-part="root"]';

describe("site events", () => {
  let browser;
  beforeEach(() => {
    browser = fakeBrowser();
  });
  afterEach(() => {
    delete globalThis.gtag;
    delete globalThis.document;
  });

  it("sends a named event with its parameters through gtag", () => {
    track(SITE_EVENT.kitSwitch, { kit: "mui" });
    assert.deepEqual(browser.calls, [["event", "kit_switch", { kit: "mui" }]]);
  });

  it("does nothing when gtag is missing", () => {
    fakeBrowser({ withGtag: false });
    assert.doesNotThrow(() => track(SITE_EVENT.kitSwitch, { kit: "mui" }));
  });

  it("does nothing in an automated browser", () => {
    const automated = fakeBrowser({ webdriver: true });
    track(SITE_EVENT.kitSwitch, { kit: "mui" });
    assert.deepEqual(automated.calls, []);
  });

  it("trims every string parameter to the parameter limit", () => {
    track(SITE_EVENT.copyCode, { item: "x".repeat(250), count: 3 });
    const [, , params] = browser.calls[0];
    assert.equal(params.item.length, PARAM_LIMIT);
    assert.equal(params.count, 3);
  });

  it("sends a once-per-page-view event a single time per key", () => {
    trackOnce("search:grid", SITE_EVENT.docsSearch, { search_term: "grid" });
    trackOnce("search:grid", SITE_EVENT.docsSearch, { search_term: "grid" });
    trackOnce("search:pivot", SITE_EVENT.docsSearch, { search_term: "pivot" });
    assert.deepEqual(
      browser.calls.map(([, , params]) => params.search_term),
      ["grid", "pivot"]
    );
  });

  it("tells an install command from other code", () => {
    for (const command of [
      "npx @adapttable/cli init",
      "npx @adapttable/cli init --kit mui",
      "pnpm add @adapttable/mantine @mantine/core",
      "npm i @adapttable/react",
      "npm install -D @adapttable/vue-unstyled @adapttable/vue",
      "yarn add @adapttable/antd",
      "bun add @adapttable/radix",
    ])
      assert.equal(copyEventName(command), SITE_EVENT.copyInstall, command);
    for (const code of [
      'import { DataTable } from "@adapttable/mui";',
      "npm install react",
      "pnpm add lodash @adapttable/react",
      "npx create-vite",
    ])
      assert.equal(copyEventName(code), SITE_EVENT.copyCode, code);
  });

  it("reports a copied install command with the command as its item", () => {
    trackCopy(SITE_SURFACE.docs, "npm install @adapttable/vue", "bash");
    trackCopy(SITE_SURFACE.docs, "const rows = [];", "App.tsx");
    trackCopy(
      SITE_SURFACE.docs,
      "pnpm add @adapttable/mui\npnpm dev\n",
      "bash"
    );
    assert.deepEqual(browser.calls, [
      [
        "event",
        "copy_install",
        { surface: "docs", item: "npm install @adapttable/vue" },
      ],
      ["event", "copy_code", { surface: "docs", item: "App.tsx" }],
      [
        "event",
        "copy_install",
        { surface: "docs", item: "pnpm add @adapttable/mui" },
      ],
    ]);
  });

  it("names a main-demo choice as a kit switch or an option", () => {
    assert.deepEqual(demoChoiceEvent("kit", "mui"), [
      SITE_EVENT.kitSwitch,
      { kit: "mui" },
    ]);
    assert.deepEqual(demoChoiceEvent("mode", "backend"), [
      SITE_EVENT.demoOption,
      { item: `${DEMO_OPTION.data}=backend` },
    ]);
    assert.deepEqual(demoChoiceEvent("density", "compact"), [
      SITE_EVENT.demoOption,
      { item: "density=compact" },
    ]);
  });

  it("hears pointer and keyboard actions inside a live table only", () => {
    const heard = [];
    const stop = onTableAction(() => heard.push("action"));
    browser.dispatch("pointerdown", element({ [TABLE_ROOT]: {} }));
    browser.dispatch("keydown", element({ [TABLE_ROOT]: {} }));
    browser.dispatch("pointerdown", element());
    browser.dispatch("pointerdown", null);
    stop();
    browser.dispatch("pointerdown", element({ [TABLE_ROOT]: {} }));
    assert.deepEqual(heard, ["action", "action"]);
  });

  it("reports a followed on-site button by its stable key", () => {
    const stop = watchCtaClicks(SITE_SURFACE.landing);
    const button = { dataset: { cta: "try_demo" } };
    browser.dispatch("click", element({ "[data-cta]": button }));
    browser.dispatch("click", element());
    stop();
    assert.deepEqual(browser.calls, [
      ["event", "cta_click", { surface: "landing", item: "try_demo" }],
    ]);
  });
});

describe("analytics tags", () => {
  it("installs GA4 with the one measurement id and exposes gtag to the page", () => {
    const tag = analyticsTag();
    assert.ok(tag.includes(`gtag/js?id=${GA_MEASUREMENT_ID}`));
    assert.ok(tag.includes(`gtag('config', '${GA_MEASUREMENT_ID}')`));
    assert.ok(tag.includes("window.gtag = function"));
  });

  it("reports an error's message without its stack", () => {
    const handlers = {};
    const reported = [];
    reportErrors(
      {
        addEventListener: (type, handler) => {
          handlers[type] = handler;
        },
        gtag: (...args) => reported.push(args),
      },
      SITE_EVENT.webException,
      PARAM_LIMIT
    );
    const error = new TypeError("x is not a function");
    handlers.error({ message: error.message, error });
    handlers.error({ message: "ResizeObserver loop completed", error: null });
    handlers.unhandledrejection({ reason: new RangeError("bad range") });
    handlers.unhandledrejection({ reason: "plain" });
    assert.deepEqual(
      reported.map(([, name, params]) => [
        name,
        params.exception_type,
        params.exception_message,
        params.fatal,
      ]),
      [
        ["web_exception", "TypeError", "x is not a function", true],
        [
          "web_exception",
          "ResizeObserverLoop",
          "ResizeObserver loop completed",
          false,
        ],
        ["web_exception", "RangeError", "bad range", false],
        ["web_exception", "UnhandledRejection", "", false],
      ]
    );
    assert.ok(!JSON.stringify(reported).includes(error.stack));
  });

  it("installs the error reporter in the tag", () => {
    assert.ok(
      analyticsTag().includes(
        `(${reportErrors.toString()})(window, 'web_exception', ${PARAM_LIMIT});`
      )
    );
  });

  it("installs Clarity with its one project id", () => {
    assert.ok(clarityTag().includes(`clarity.ms/tag/${CLARITY_PROJECT_ID}`));
  });
});
