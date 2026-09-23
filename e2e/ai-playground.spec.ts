import { expect, type Page, test } from "@playwright/test";

import {
  builtAdapters,
  CANONICAL_AI_ADAPTER,
} from "../apps/showcase/matrix.mjs";

/**
 * Feature 21: every published kit mounts a real table and its own assistant
 * panel. There is no model in the demo — a fixed script maps each example to
 * ONE capability call, which runs through the ordinary session executor. So
 * every assertion here is about the TABLE changing, not about the reply text.
 */
const kits = builtAdapters().map((adapter) => adapter.key);

const part = (name: string) => `[data-adapttable-part="${name}"]`;

async function mountedTable(page: Page) {
  const table = page.getByRole("table");
  const cards = page.getByRole("list", { name: "Data table" });
  await expect(table.or(cards).first()).toBeVisible();
  return table.or(cards).first();
}

/**
 * The demo's own table controls, now a button above the table rather than a
 * disclosure below it.
 */
/** The demo's settings, which open in a drawer over the page. */
async function openDemoOptions(page: Page): Promise<void> {
  const drawer = page.getByTestId("ai-demo-options-drawer");
  if (await drawer.isVisible()) return;
  await page.getByTestId("ai-demo-options").click();
  await expect(drawer).toBeVisible();
}

/** Close the drawer, so the table underneath is reachable again. */
async function closeDemoOptions(page: Page): Promise<void> {
  const drawer = page.getByTestId("ai-demo-options-drawer");
  if (!(await drawer.isVisible())) return;
  await page.keyboard.press("Escape");
  await expect(drawer).toBeHidden();
}

/**
 * Land on a kit's AI page with the conversation open. The page loads with the
 * assistant closed — the table is what the reader came for — so the launcher
 * is the way in, exactly as a reader takes it.
 */
async function openDemo(page: Page, kit: string): Promise<void> {
  await page.goto(`/${kit}/ai/`);
  await expect(page.locator(".ai-demo")).toBeVisible();
  await mountedTable(page);
  await openAssistant(page);
}

/** Open the conversation through its launcher, or leave an open one alone. */
async function openAssistant(page: Page): Promise<void> {
  const surface = page.locator(part("assistant-surface"));
  if ((await surface.count()) === 0) {
    await page.locator(part("assistant-launcher")).click();
  }
  await expect(surface).toBeVisible();
}

/** Send text the way a reader does: type it, press Enter. */
async function ask(page: Page, text: string): Promise<void> {
  const input = page.locator(part("assistant-input"));
  await input.fill(text);
  await input.press("Enter");
}

async function lastReply(page: Page): Promise<string> {
  const texts = page.locator(part("assistant-message-text"));
  return (await texts.last().innerText()).trim();
}

async function receipts(page: Page): Promise<string[]> {
  // What a turn did is evidence, opened from the mark on the reply it belongs
  // to. Every open one is read, because a turn can draw more than one card.
  const marks = page.locator(part("assistant-receipts-toggle-button"));
  for (let i = 0; i < (await marks.count()); i += 1) {
    const mark = marks.nth(i);
    if ((await mark.getAttribute("aria-expanded")) !== "true") {
      await mark.click();
    }
  }
  return page.locator(part("assistant-receipt-summary")).allInnerTexts();
}

/**
 * What the inspector says this table currently wires.
 *
 * It sits open in the documentation column now rather than behind a
 * disclosure, and lists capabilities in a select rather than a row of pills.
 */
async function catalogText(page: Page): Promise<string> {
  const select = page.getByTestId("ai-catalog");
  await expect(select).toBeVisible();
  // `textContent`, not `innerText`: Firefox reports no rendered text for the
  // options inside a select, and the assertion would read an empty string
  // rather than the catalog.
  return ((await select.textContent()) ?? "").trim();
}

const MOCK_BACKEND = "http://127.0.0.1:8787";

async function installMockAgentBackend(page: Page): Promise<void> {
  await page.route(MOCK_BACKEND, async (route) => {
    if (route.request().method() === "OPTIONS") {
      await route.fulfill({ status: 204 });
      return;
    }
    const body = JSON.parse(route.request().postData() ?? "{}") as {
      kind?: string;
    };
    if (body.kind === "hello") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          schemaVersion: "adapttable.agent.v1",
          ok: true,
          text: "Mock backend ready.",
        }),
      });
      return;
    }
    if (body.kind === "turn") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          schemaVersion: "adapttable.agent.v1",
          text: "Filtered to Core team.",
          toolCalls: [
            {
              id: `mock-filter-${String(Date.now())}`,
              name: "view.setFilters",
              args: { filters: { team: ["Core"] } },
            },
          ],
        }),
      });
      return;
    }
    await route.fulfill({
      status: 400,
      contentType: "application/json",
      body: JSON.stringify({ error: "unknown request" }),
    });
  });
}

async function connectMockBackend(page: Page): Promise<void> {
  await installMockAgentBackend(page);
  await page.locator(part("assistant-settings")).click();
  await page.getByLabel("Your endpoint").fill(MOCK_BACKEND);
  await page.getByRole("button", { name: "Connect", exact: true }).click();
}

/** The rows only — reading the panel too would make the transcript count. */
async function visibleTableText(page: Page): Promise<string> {
  const region = page
    .locator(".ai-demo__stage > :not(.ai-demo__assistant)")
    .last();
  return (await region.innerText()).replace(/\s+/g, " ");
}

/** One person's row in the table, found by name. */
function tableRow(page: Page, person: string) {
  return page.getByRole("row").filter({ hasText: person });
}

for (const kit of kits) {
  test(`${kit} AI page mounts a real table and its own assistant`, async ({
    page,
  }) => {
    await openDemo(page, kit);

    await expect(page.locator(part("assistant-title"))).toHaveText(
      "Table assistant"
    );
    // The badge names the state in words, translated — never a raw token.
    await expect(page.locator(part("assistant-connection"))).toHaveText(
      "Ready"
    );
    // This demo opens with nothing said: the panel's own words are the
    // page's, and a backend never sees them. The conversation starts with
    // whatever the reader types.
    await expect(page.locator(part("assistant-message-text"))).toHaveCount(0);
    // The shortcuts live in the composer, one press away, rather than as a
    // wall of cards a reader clears before they can type.
    await expect(page.locator(part("assistant-examples-menu"))).toBeVisible();

    const catalog = await catalogText(page);
    expect(catalog).toContain("view.setFilters");
    expect(catalog).toContain("view.hideColumn");
    expect(catalog).toContain("view.setColumnOrder");
    expect(catalog).toContain("edit.cells");
    expect(catalog).not.toMatch(/pivot/i);
  });

  test(`${kit} runs a scripted request against the real table`, async ({
    page,
  }) => {
    await openDemo(page, kit);
    const before = await visibleTableText(page);
    expect(before).toContain("Jonah");

    await page.locator(part("assistant-examples-menu")).click();
    // By its title: two shortcuts mention the Core team, and only one of them
    // is the filter this asserts on.
    await page
      .locator(part("assistant-examples-item"))
      .filter({ hasText: "Filter rows" })
      .click();

    await expect
      .poll(async () => visibleTableText(page))
      .not.toContain("Jonah");
    // The reply is not the evidence — the rows are.
    expect(await visibleTableText(page)).toContain("Chioma");
    // The card names the change in the reader's terms, and the technical
    // capability key stays out of the ordinary conversation.
    const applied = await receipts(page);
    expect(applied.join(" ")).toContain("Filter applied");
    expect(applied.join(" ")).toContain("Team is Core");
    expect(applied.join(" ")).not.toContain("view.setFilters");
  });

  test(`${kit} runs a table bulk action after approval`, async ({ page }) => {
    await openDemo(page, kit);
    const jonah = tableRow(page, "Jonah Okonkwo");
    const sefa = tableRow(page, "Sefa Demir");
    await expect(jonah).toContainText("Active");
    await expect(sefa).toContainText("Active");

    await page.locator(part("assistant-examples-menu")).click();
    await page
      .locator(part("assistant-examples-item"))
      .filter({ hasText: "Run a bulk action" })
      .click();

    // The action carries a confirmation, so the assistant asks first — in the
    // conversation, through this kit's own approval controls.
    const approve = page.locator(part("agent-approval-approve"));
    await expect(approve).toBeVisible();
    await expect(page.locator(part("assistant-approval"))).toBeVisible();
    // Nothing has run yet: the rows are selected, not changed.
    await expect(jonah).toContainText("Active");
    await expect(sefa).toContainText("Active");

    await approve.click();

    await expect(jonah).toContainText("On leave");
    await expect(sefa).toContainText("On leave");
    // Only the selection: the row beside them is untouched.
    await expect(tableRow(page, "Chioma Eze")).toContainText("Active");
  });
}

/** The page's scroll offset once it has stopped moving. */
async function settledScrollY(page: Page): Promise<number> {
  return page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        let last = window.scrollY;
        const check = () => {
          requestAnimationFrame(() => {
            if (window.scrollY === last) resolve(last);
            else {
              last = window.scrollY;
              check();
            }
          });
        };
        check();
      })
  );
}

test.describe(`${CANONICAL_AI_ADAPTER} conversational workflows`, () => {
  test.beforeEach(async ({ page }) => {
    await openDemo(page, CANONICAL_AI_ADAPTER);
  });

  test("sorts, then clears the filter, and the rows follow", async ({
    page,
  }) => {
    await ask(page, "Show only the Core team.");
    await expect
      .poll(async () => visibleTableText(page))
      .not.toContain("Jonah");

    await ask(page, "Clear the filter.");
    await expect.poll(async () => visibleTableText(page)).toContain("Jonah");
    expect(await lastReply(page)).toBe("Filter cleared.");
  });

  test("says what it does not understand instead of guessing", async ({
    page,
  }) => {
    const before = await visibleTableText(page);
    await ask(page, "Delete every row and email the team about it.");

    expect(await lastReply(page)).toContain(
      "This demo understands the example requests"
    );
    // Nothing ran: no receipt, and the table is untouched.
    expect(await receipts(page)).toHaveLength(0);
    expect(await visibleTableText(page)).toBe(before);
  });

  test("parks an edit for approval and applies it", async ({ page }) => {
    await ask(page, "Raise Priya Nair's salary to 185.");

    const approve = page.locator(part("agent-approval-approve"));
    await expect(approve).toBeVisible();
    // Reviewed where it was asked for: inside the conversation, not in a
    // strip above the table.
    await expect(page.locator(part("assistant-approval"))).toContainText("185");
    await expect(page.locator(part("agent-approval"))).toHaveCount(0);
    await approve.click();

    await expect
      .poll(async () => (await receipts(page)).join(" "))
      .toContain("Saved");
    await expect.poll(async () => visibleTableText(page)).toContain("185");
  });

  test("offers only what the table currently wires", async ({ page }) => {
    // Ungrouped by default: pinning is live, and grouping is not offered.
    expect(await catalogText(page)).toContain("view.pinRow");
    expect(await catalogText(page)).not.toContain("view.setGroupBy");

    await openDemoOptions(page);
    await page.getByTestId("ai-toggle-grouping").click();

    // The toggle arms the panel, it does not group by team. Pinning stays
    // until a group is actually applied; setGroupBy is what appears.
    await expect
      .poll(async () => catalogText(page))
      .toContain("view.setGroupBy");
    expect(await catalogText(page)).toContain("view.pinRow");
  });

  test("offers the bulk action only where it can run", async ({ page }) => {
    // Cell editing saves on approve, so the host's handler can run.
    await expect
      .poll(async () => catalogText(page))
      .toContain("bulkAction.markOnLeave");

    // Batch editing stages writes, and a host handler cannot be staged: the
    // action stays on the bar for a person and leaves the agent's catalog.
    await openDemoOptions(page);
    await page.getByTestId("ai-editing-batch").click();
    await expect
      .poll(async () => catalogText(page))
      .not.toContain("bulkAction.markOnLeave");

    await page.getByTestId("ai-commit-immediate").click();
    await expect
      .poll(async () => catalogText(page))
      .toContain("bulkAction.markOnLeave");
  });

  test("closes the demo options on a click outside them", async ({ page }) => {
    const drawer = page.getByTestId("ai-demo-options-drawer");
    await openDemoOptions(page);

    // On the panel's own padding, just inside its edge: this is the dialog
    // element too, and it keeps the panel open.
    const box = await drawer.boundingBox();
    if (!box) throw new Error("the demo options have no box");
    await page.mouse.click(box.x + box.width - 2, box.y + box.height / 2);
    await expect(drawer).toBeVisible();

    // A wheel out in the dark moves the panel, never the page behind it. The
    // page may still be settling from opening the panel, so the baseline is
    // taken once two reads a frame apart agree.
    const resting = await settledScrollY(page);
    await page.mouse.move(box.x / 2, box.y + box.height / 2);
    await page.mouse.wheel(0, 600);
    expect(await page.evaluate(() => window.scrollY)).toBe(resting);

    // Out in the dark beside it, where a reader dismisses a drawer.
    await page.mouse.click(box.x / 2, box.y + box.height / 2);
    await expect(drawer).toBeHidden();
  });

  test("pins a column and a row through the assistant", async ({ page }) => {
    await expect.poll(async () => catalogText(page)).toContain("view.pinRow");

    await ask(page, "Pin Priya Nair to the top.");
    await expect
      .poll(async () =>
        (await page.getByRole("row").nth(1).innerText()).includes("Priya")
      )
      .toBe(true);

    await ask(page, "Unpin Priya Nair.");
    expect(await lastReply(page)).toBe("Unpinned that row.");
  });

  test("reset restores the dataset and the settings", async ({ page }) => {
    await ask(page, "Show only the Core team.");
    await expect
      .poll(async () => visibleTableText(page))
      .not.toContain("Jonah");

    await openDemoOptions(page);
    await page.getByTestId("ai-reset").click();

    await expect.poll(async () => visibleTableText(page)).toContain("Jonah");
    // The transcript goes with it — a conversation about rows that no longer
    // exist is worse than none — and this demo says nothing of its own, so
    // what is left is an empty panel waiting on the reader.
    await expect(page.locator(part("assistant-message-text"))).toHaveCount(0);
    await expect(page.locator(part("assistant-input"))).toBeVisible();
  });

  test("a connected backend answers the same composer", async ({ page }) => {
    await connectMockBackend(page);
    await expect(page.locator(part("assistant-connection"))).toHaveText(
      "Ready"
    );

    await ask(page, "anything at all, the mock answers everything");

    // The scripted resolver would have refused this; the backend did not.
    await expect
      .poll(async () => lastReply(page))
      .toBe("Filtered to Core team.");
    await expect
      .poll(async () => visibleTableText(page))
      .not.toContain("Jonah");
  });

  test("disconnecting returns to the scripted demo", async ({ page }) => {
    await connectMockBackend(page);
    await page.locator(part("assistant-settings")).click();
    await page.getByRole("button", { name: "Disconnect" }).click();

    await ask(page, "anything at all, the mock answers everything");
    expect(await lastReply(page)).toContain(
      "This demo understands the example requests"
    );
  });

  test("reports a backend that cannot be reached", async ({ page }) => {
    await page.route(MOCK_BACKEND, (route) => route.abort("failed"));
    await page.locator(part("assistant-settings")).click();
    await page.getByLabel("Your endpoint").fill(MOCK_BACKEND);
    await page.getByRole("button", { name: "Connect", exact: true }).click();

    await expect(page.locator(".ai-conn__error")).toBeVisible();
    // A failed handshake leaves the demo working rather than half-connected.
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page.locator("dialog.ai-conn-dialog")).toBeHidden();
    await ask(page, "Clear the filter.");
    expect(await lastReply(page)).toBe("Filter cleared.");
  });

  test("becomes a modal sheet on a narrow viewport", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 780 });
    await page.reload();

    const launcher = page.locator(part("assistant-launcher"));
    await expect(launcher).toBeVisible();
    await expect(page.locator(part("assistant-panel"))).toHaveCount(0);

    await launcher.click();
    await expect(page.locator(part("assistant-sheet"))).toBeVisible();
    await expect(page.locator(part("assistant-back"))).toBeVisible();
    await expect(page.locator(part("assistant-input"))).toBeVisible();
  });

  test("reads right-to-left", async ({ page }) => {
    await openDemoOptions(page);
    await page.getByTestId("ai-toggle-rtl").check();
    await closeDemoOptions(page);

    // The direction belongs to the table and its overlays. The documentation
    // around it, the integration code and the inspector stay as they are.
    await expect(page.locator(".ai-demo__stage")).toHaveAttribute("dir", "rtl");
    await expect(page.locator(".ai-demo")).not.toHaveAttribute("dir", "rtl");
    await openAssistant(page);
    await ask(page, "Show only the Core team.");
    await expect
      .poll(async () => visibleTableText(page))
      .not.toContain("Jonah");
  });

  test("mirrors the assistant panel and speaks the locale with it", async ({
    page,
  }) => {
    // Pinned, because the side assertion below is about a floating window on
    // the leading edge. A narrow viewport makes it a full-width sheet, where
    // "which side" has no answer.
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.reload();

    await openDemoOptions(page);
    await page.getByTestId("ai-toggle-rtl").check();
    await closeDemoOptions(page);

    // Before the panel opens, because opening it takes the launcher out of the
    // DOM. Direction without the locale proves the layout and nothing about the
    // translations: an RTL frame around English is not what a reader in Arabic
    // sees. Both strings come from `packages/i18n/src/locales/ar.ts`.
    await expect(page.locator(part("assistant-launcher"))).toHaveAccessibleName(
      "اسأل المساعد"
    );

    await openAssistant(page);

    const surface = page.locator(part("assistant-surface"));

    // The panel itself mirrors, not merely the page around it.
    await expect(surface).toHaveCSS("direction", "rtl");
    await expect(page.locator(part("assistant-input"))).toHaveAttribute(
      "placeholder",
      "اسأل عن هذا الجدول…"
    );

    // The logical end, which in RTL is the left of the viewport. Asserted as a
    // side rather than a pixel so it holds at any width: the panel's own centre
    // sits left of the page's.
    const box = await surface.boundingBox();
    const viewport = page.viewportSize();
    expect(box).not.toBeNull();
    expect(viewport).not.toBeNull();
    if (box && viewport) {
      expect(box.x + box.width / 2).toBeLessThan(viewport.width / 2);
    }

    // And what must NOT mirror. A mirrored code block is unreadable, and the
    // inspector's JSON is a developer surface, not part of the table.
    await expect(page.getByTestId("ai-inspector")).toHaveCSS(
      "direction",
      "ltr"
    );
    await expect(page.locator("pre").first()).toHaveCSS("direction", "ltr");
  });
});

/**
 * The star prompt is a centered modal on a twenty-second timer, and it knows
 * nothing about the assistant. Landing it over an open conversation covers
 * the one workflow this page exists to show, so it waits — and because it
 * waits rather than cancels, it still gets asked once the reader is done.
 *
 * It hides itself from automation, so the test says it is not automation.
 */
test.describe("the star prompt and an open conversation", () => {
  test("waits while the assistant is open, then asks", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "webdriver", { get: () => false });
      // Five seconds left on its timer — enough to open the conversation
      // first, so the prompt comes due with a reader mid-question.
      sessionStorage.setItem(
        "adapttable-star-the-repo-since",
        String(Date.now() - 15_000)
      );
    });
    await page.goto(`/${CANONICAL_AI_ADAPTER}/ai/`);
    await mountedTable(page);
    await openAssistant(page);
    await expect(page.locator(part("assistant-window"))).toBeVisible();

    const star = page.locator(".star-the-repo");
    // Past the moment it was due, and still not on screen.
    await page.waitForTimeout(6000);
    await expect(star).toHaveCount(0);

    await page.locator(part("assistant-close")).click();

    // Deferred, not cancelled.
    await expect(star).toBeVisible();
  });
});
