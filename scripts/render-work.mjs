#!/usr/bin/env node
/**
 * Row work per interaction — how many body rows each interaction touches, and
 * how long each overlay takes to open the first time.
 *
 * One kit per framework, on the built showcase: React Tailwind, Vue Vuetify
 * and Angular CDK, the live demos whose table draws every control below, and
 * each kit's realtime page for the streamed patch. For each interaction the
 * page counts, over the interaction and until the DOM has been quiet for
 * {@link QUIET_MS}:
 *
 *   - `recreated`: row elements (`data-adapttable-part="row"`) inserted into
 *     the document — a row thrown away and drawn again;
 *   - `written`: rows that stayed in the document and had any node, attribute
 *     or text below them written;
 *   - `rendered` (React only): rows whose element React produced again in a
 *     commit — a mount, or new props — whether or not the DOM changed. Read
 *     from the commit hook React calls for developer tools, which production
 *     builds also call.
 *
 * Vue and Angular production builds expose no render hook, so their numbers
 * are the DOM ones. CSS-only effects (`:hover`) write nothing and count zero.
 *
 * First open is the time from the pointer press on the trigger to the panel's
 * element entering the document, read in the page from the press event's
 * timestamp, median of {@link OPEN_RUNS} fresh page loads.
 *
 *   node scripts/render-work.mjs                    # all three frameworks
 *   node scripts/render-work.mjs --framework vue    # one
 *   node scripts/render-work.mjs --port 4321 --json
 *
 * A server already answering on the port is used as it is. Otherwise this
 * starts `scripts/serve-showcase.mjs` on that port, which builds the showcase
 * when it is stale, and stops it at the end.
 */
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "@playwright/test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const at = args.indexOf(`--${name}`);
  return at === -1 ? fallback : (args[at + 1] ?? fallback);
};
const PORT = String(flag("port", "4321"));
const ORIGIN = `http://localhost:${PORT}`;
const JSON_OUT = args.includes("--json");
const ONLY = flag("framework", undefined);

const VIEWPORT = { width: 1440, height: 1000 };
/** The DOM must be this long without a write before an interaction is over. */
const QUIET_MS = 400;
/** Debounced work (search) lands after this; an interaction lasts at least as long. */
const MIN_MS = 700;
const SETTLE_TIMEOUT_MS = 8000;
const OPEN_RUNS = 3;
const ROW = '[data-adapttable-part="row"]';

const part = (name) => `[data-adapttable-part="${name}"]`;

/**
 * The pages each framework is measured on. `drawer` is the live demo with
 * its filters in a drawer; the React demo switches that with a demo control.
 */
const FRAMEWORKS = [
  {
    key: "react",
    kit: "tailwind",
    live: "/?kit=tailwind",
    drawer: { url: "/?kit=tailwind", control: ["filters container", "Drawer"] },
    realtime: "/tailwind/realtime/",
  },
  {
    key: "vue",
    kit: "vuetify",
    live: "/vue-main/?kit=vuetify",
    drawer: { url: "/vue-main/?kit=vuetify&filters=drawer" },
    realtime: "/vue/vuetify/realtime/",
  },
  {
    key: "angular",
    kit: "angular-cdk",
    live: "/angular-main/?kit=angular-cdk",
    drawer: { url: "/angular-main/?kit=angular-cdk&filters=drawer" },
    realtime: "/angular-cdk/realtime/",
  },
];

/**
 * Installed before any page script runs. Records the row work between
 * `__renderWork.start()` and `__renderWork.stop()`, and the time an awaited
 * part first enters the document after a pointer press.
 */
function instrument(rowSelector) {
  const isRow = (node) => node.nodeType === 1 && node.matches(rowSelector);
  const rowsIn = (node) =>
    node.nodeType === 1
      ? [...(isRow(node) ? [node] : []), ...node.querySelectorAll(rowSelector)]
      : [];
  const rowOf = (node) =>
    (node.nodeType === 1 ? node : node.parentElement)?.closest(rowSelector);

  let recording = false;
  let touched = false;
  let added = new Set();
  let written = new Set();
  let lastWrite = 0;
  let pressedAt = 0;
  let awaited;

  new MutationObserver((records) => {
    const now = performance.now();
    lastWrite = now;
    if (awaited && !awaited.at && document.querySelector(awaited.selector)) {
      awaited.at = now;
    }
    if (!recording) return;
    for (const record of records) {
      for (const node of record.addedNodes) {
        for (const row of rowsIn(node)) added.add(row);
      }
      const row = rowOf(record.target);
      if (row) written.add(row);
      if (row || record.addedNodes.length) touched = true;
    }
  }).observe(document, {
    subtree: true,
    childList: true,
    attributes: true,
    characterData: true,
  });

  addEventListener("pointerdown", (event) => (pressedAt = event.timeStamp), {
    capture: true,
  });

  // React's developer-tools hook. A row element React produced again in a
  // commit is a fiber that is new to this commit's tree and either has no
  // previous version (mounted) or carries a props object its previous
  // version did not (rendered). A cloned fiber that bailed out keeps its
  // props object, so it does not count.
  const reactRows = { seen: new WeakMap(), rendered: new Set(), commits: 0 };
  const walk = (fiber, visit) => {
    const stack = [fiber];
    while (stack.length) {
      const node = stack.pop();
      if (!node) continue;
      visit(node);
      if (node.sibling) stack.push(node.sibling);
      if (node.child) stack.push(node.child);
    }
  };
  globalThis.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
    supportsFiber: true,
    renderers: new Map(),
    // React calls every other hook method only when it is a function.
    inject: () => 1,
    onCommitFiberRoot: (_id, root) => {
      const before = reactRows.seen.get(root) ?? new WeakSet();
      const seen = new WeakSet();
      walk(root.current, (fiber) => {
        const props = fiber.memoizedProps;
        if (fiber.tag !== 5 || props?.["data-adapttable-part"] !== "row") {
          return;
        }
        seen.add(fiber);
        const fresh = !before.has(fiber);
        const produced =
          fiber.alternate === null || props !== fiber.alternate.memoizedProps;
        if (recording && fresh && produced) {
          reactRows.rendered.add(fiber.stateNode);
          reactRows.commits += 1;
        }
      });
      reactRows.seen.set(root, seen);
    },
  };

  globalThis.__renderWork = {
    start() {
      touched = false;
      added = new Set();
      written = new Set();
      reactRows.rendered = new Set();
      reactRows.commits = 0;
      lastWrite = performance.now();
      recording = true;
    },
    stop() {
      recording = false;
      const live = [...added].filter((row) => row.isConnected);
      return {
        recreated: live.length,
        written: [...written].filter(
          (row) => row.isConnected && !added.has(row)
        ).length,
        rendered: reactRows.rendered.size,
        renderCommits: reactRows.commits,
        react: globalThis.__REACT_DEVTOOLS_GLOBAL_HOOK__.rendererSeen === true,
        rows: document.querySelectorAll(rowSelector).length,
      };
    },
    quietFor: () => performance.now() - lastWrite,
    rowsTouched: () => touched && (added.size > 0 || written.size > 0),
    awaitPart(selector) {
      awaited = { selector, at: document.querySelector(selector) ? -1 : 0 };
    },
    openedMs() {
      if (!awaited?.at || awaited.at < 0 || !pressedAt) return null;
      return Math.round(awaited.at - pressedAt);
    },
  };
  const hook = globalThis.__REACT_DEVTOOLS_GLOBAL_HOOK__;
  const inject = hook.inject;
  hook.inject = (renderer) => {
    hook.rendererSeen = true;
    return inject(renderer);
  };
}

async function serving() {
  try {
    const res = await fetch(`${ORIGIN}/`, {
      signal: AbortSignal.timeout(1500),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** The built showcase on {@link PORT}: the one already there, or ours. */
async function showcase() {
  if (await serving()) return null;
  const child = spawn(
    process.execPath,
    [join(ROOT, "scripts/serve-showcase.mjs"), "--port", PORT],
    { cwd: ROOT, stdio: JSON_OUT ? "ignore" : ["ignore", "inherit", "inherit"] }
  );
  const deadline = Date.now() + 600_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`serve-showcase exited with ${child.exitCode}`);
    }
    if (await serving()) return child;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  child.kill();
  throw new Error(`the showcase did not answer on :${PORT} within 10 minutes`);
}

async function openPage(browser, url, problems) {
  const page = await browser.newPage({ viewport: VIEWPORT });
  page.on("pageerror", (error) => problems.push(`${url}: ${error.message}`));
  await page.addInitScript(instrument, ROW);
  await page.goto(`${ORIGIN}${url}`);
  await page.locator(part("root")).first().waitFor();
  await page.locator(ROW).first().waitFor();
  await settle(page, 0);
  return page;
}

/** Wait until the DOM has been quiet for {@link QUIET_MS}, at least `minMs`. */
async function settle(page, minMs) {
  const started = Date.now();
  if (minMs) await page.waitForTimeout(minMs);
  while (Date.now() - started < SETTLE_TIMEOUT_MS) {
    const quiet = await page.evaluate(() => globalThis.__renderWork.quietFor());
    if (quiet >= QUIET_MS) return;
    await page.waitForTimeout(QUIET_MS - quiet + 20);
  }
  throw new Error(`${page.url()} never went quiet`);
}

async function counted(page, act, minMs = MIN_MS) {
  await settle(page, 0);
  await page.evaluate(() => globalThis.__renderWork.start());
  await act();
  await settle(page, minMs);
  return page.evaluate(() => globalThis.__renderWork.stop());
}

const EDITOR = part("edit-cell-editor");
const TEXT_FIELD = [
  `input${EDITOR}:not([type]), input${EDITOR}[type="text"], textarea${EDITOR}`,
  `${EDITOR} input:not([type]), ${EDITOR} input[type="text"], ${EDITOR} textarea`,
].join(", ");

/** The first cell of the second row whose editor is a text field. */
async function editOneCell(page) {
  const activators = page
    .locator(ROW)
    .nth(1)
    .locator(part("edit-cell-activate"));
  const count = await activators.count();
  for (let index = 0; index < count; index++) {
    await activators.nth(index).click();
    const opened = await page
      .locator(EDITOR)
      .first()
      .waitFor({ timeout: 2000 })
      .then(
        () => true,
        (error) => {
          if (error.name === "TimeoutError") return false;
          throw error;
        }
      );
    const field = page.locator(TEXT_FIELD).first();
    if (opened && (await field.isVisible())) {
      await field.focus();
      await page.keyboard.press("End");
      await page.keyboard.type("x");
      await page.keyboard.press("Enter");
      return true;
    }
    await page.keyboard.press("Escape");
  }
  return false;
}

async function dragResize(page) {
  const handle = page.locator(part("resize-handle")).first();
  const box = await handle.boundingBox();
  if (!box) throw new Error("no resize handle on screen");
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  for (let step = 1; step <= 4; step++) await page.mouse.move(x + step * 10, y);
  await page.mouse.up();
}

async function hoverRow(page) {
  await page.mouse.move(2, 2);
  const box = await page.locator(ROW).nth(2).boundingBox();
  if (!box) throw new Error("no third row on screen");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, {
    steps: 4,
  });
}

/** The row work of every interaction on the live demo, in one page. */
async function interactions(browser, framework, problems) {
  const page = await openPage(browser, framework.live, problems);
  const work = {};
  try {
    work.idle = await counted(page, () => page.waitForTimeout(1000), 0);
    work.hover = await counted(page, () => hoverRow(page));
    work.selectRow = await counted(page, () =>
      page.locator(part("selection-cell")).nth(1).locator("input").click()
    );
    work.columnMenu = await counted(page, () =>
      page.locator(part("column-menu-button")).first().click()
    );
    await page.keyboard.press("Escape");
    work.sort = await counted(page, () =>
      page.locator(part("sort-button")).first().click()
    );
    work.page = await counted(page, () =>
      page.locator(part("page-next")).first().click()
    );
    await page.locator(part("search")).first().click();
    work.searchKey = await counted(page, () => page.keyboard.type("a"));
    await page.keyboard.press("Backspace");
    await settle(page, MIN_MS);
    work.resize = await counted(page, () => dragResize(page));
    let edited = false;
    work.editCell = await counted(page, async () => {
      edited = await editOneCell(page);
    });
    if (!edited) {
      problems.push("no text-editable cell in row 2");
      work.editCell = null;
    }
  } finally {
    await page.close();
  }
  return work;
}

/** The rows the next streamed patch frame touches. */
async function streamPatch(browser, framework, problems) {
  const page = await openPage(browser, framework.realtime, problems);
  try {
    await page.evaluate(() => globalThis.__renderWork.start());
    await page.waitForFunction(
      () => globalThis.__renderWork.rowsTouched(),
      undefined,
      { timeout: 15_000, polling: 20 }
    );
    await settle(page, 0);
    return await page.evaluate(() => globalThis.__renderWork.stop());
  } finally {
    await page.close();
  }
}

const OVERLAYS = [
  {
    key: "filtersPopover",
    trigger: "filters-button",
    panel: "filters-popover",
  },
  {
    key: "filtersDrawer",
    trigger: "filters-button",
    panel: "filters-panel",
    drawer: true,
  },
  {
    key: "columnMenu",
    trigger: "column-menu-button",
    panel: "column-menu-panel",
  },
  { key: "savedViews", trigger: "views-button", panel: "views-panel" },
];

async function firstOpen(browser, framework, overlay, problems) {
  const samples = [];
  for (let run = 0; run < OPEN_RUNS; run++) {
    const url = overlay.drawer ? framework.drawer.url : framework.live;
    const page = await openPage(browser, url, problems);
    try {
      const control = overlay.drawer && framework.drawer.control;
      if (control) {
        await page
          .getByRole("group", { name: control[0] })
          .getByRole("button", { name: control[1], exact: true })
          .click();
        await settle(page, 0);
      }
      await page.evaluate(
        (selector) => globalThis.__renderWork.awaitPart(selector),
        part(overlay.panel)
      );
      await page.locator(part(overlay.trigger)).first().click();
      await page.locator(part(overlay.panel)).first().waitFor();
      const ms = await page.evaluate(() => globalThis.__renderWork.openedMs());
      if (ms === null) {
        throw new Error(
          `${framework.key} ${overlay.key}: ${overlay.panel} was already open`
        );
      }
      samples.push(ms);
    } finally {
      await page.close();
    }
  }
  samples.sort((a, b) => a - b);
  return samples[Math.floor(samples.length / 2)];
}

async function measureFramework(browser, framework) {
  const problems = [];
  const work = await interactions(browser, framework, problems);
  work.streamPatch = await streamPatch(browser, framework, problems);
  const opens = {};
  for (const overlay of OVERLAYS) {
    opens[overlay.key] = await firstOpen(browser, framework, overlay, problems);
  }
  return {
    framework: framework.key,
    kit: framework.kit,
    work,
    opens,
    problems,
  };
}

function printTable(results) {
  const keys = Object.keys(results[0].work);
  const cell = (entry, react) => {
    if (!entry) return "n/a";
    const dom = `${entry.recreated}+${entry.written}`;
    return react ? `${dom} r${entry.rendered}` : dom;
  };
  console.log(
    "\nRows per interaction: recreated+written (DOM), rN = rows React rendered\n"
  );
  console.log(
    [
      "interaction".padEnd(14),
      ...results.map((r) => `${r.framework} (${r.kit})`.padEnd(22)),
    ].join("")
  );
  for (const key of keys) {
    console.log(
      [
        key.padEnd(14),
        ...results.map((r) =>
          cell(r.work[key], r.framework === "react").padEnd(22)
        ),
      ].join("")
    );
  }
  console.log("\nFirst open, ms (median of 3 fresh loads)\n");
  for (const overlay of OVERLAYS) {
    console.log(
      [
        overlay.key.padEnd(14),
        ...results.map((r) => String(r.opens[overlay.key]).padEnd(22)),
      ].join("")
    );
  }
  for (const r of results) {
    for (const problem of r.problems)
      console.log(`✗ ${r.framework}: ${problem}`);
  }
}

const selected = FRAMEWORKS.filter((f) => !ONLY || f.key === ONLY);
if (!selected.length) {
  console.error(`✗ --framework ${ONLY}: expected react, vue or angular`);
  process.exit(2);
}
const server = await showcase();
const browser = await chromium.launch();
const results = [];
try {
  for (const framework of selected) {
    results.push(await measureFramework(browser, framework));
  }
} finally {
  await browser.close();
  server?.kill();
}
if (JSON_OUT)
  console.log(
    JSON.stringify({ measuredAt: new Date().toISOString(), results }, null, 2)
  );
else printTable(results);
if (results.some((r) => r.problems.length)) process.exit(1);
