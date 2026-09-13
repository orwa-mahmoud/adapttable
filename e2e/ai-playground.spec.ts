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
  return (await select.innerText()).trim();
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
    await expect(page.locator(part("assistant-empty-prompt"))).toContainText(
      "What would you like to do"
    );
    await expect(
      page.locator(part("assistant-suggestion")).first()
    ).toBeVisible();

    const catalog = await catalogText(page);
    expect(catalog).toContain("view.setFilters");
    expect(catalog).toContain("edit.cells");
    expect(catalog).not.toMatch(/pivot/i);
  });

  test(`${kit} runs a scripted request against the real table`, async ({
    page,
  }) => {
    await openDemo(page, kit);
    const before = await visibleTableText(page);
    expect(before).toContain("Jonah");

    await page
      .locator(part("assistant-suggestion"))
      .filter({ hasText: "Core team" })
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
    // Ungrouped by default, so row pinning is live.
    expect(await catalogText(page)).toContain("view.pinRow");

    await openDemoOptions(page);
    await page.getByTestId("ai-toggle-grouping").click();

    await expect
      .poll(async () => catalogText(page))
      .not.toContain("view.pinRow");
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
    // exist is worse than none.
    await expect(page.locator(part("assistant-message-text"))).toHaveCount(0);
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
