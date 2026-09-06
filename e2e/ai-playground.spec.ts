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

async function openDemo(page: Page, kit: string): Promise<void> {
  await page.goto(`/${kit}/ai/`);
  await expect(page.locator(".ai-demo")).toBeVisible();
  await mountedTable(page);
  await expect(page.locator(part("assistant-surface"))).toBeVisible();
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

async function catalogText(page: Page): Promise<string> {
  await page.locator(".ai-demo__dev summary").click();
  return (await page.getByTestId("ai-catalog").innerText()).trim();
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
          actions: [
            {
              key: "view.setFilters",
              args: { filters: { team: ["Core"] } },
              idempotencyKey: `mock-filter-${String(Date.now())}`,
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
  const region = page.locator(".ai-demo__stage > :not(.ai-demo__panel)").last();
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
    expect(await receipts(page)).toContain("view.setFilters: done");
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

  test("parks an edit for approval and reports it as staged", async ({
    page,
  }) => {
    await ask(page, "Raise Priya Nair's salary to 185.");

    const approve = page.locator(part("agent-approval-approve"));
    await expect(approve).toBeVisible();
    await expect(page.locator(part("agent-approval"))).toContainText("185");
    await approve.click();

    // The staging callback IS a host callback, so the session calls it
    // applied. Telling the reader "done" while the table shows an unsaved row
    // is the lie this asserts against.
    await expect
      .poll(async () => receipts(page))
      .toContain("edit.cells: staged");
    await expect(page.locator(part("assistant-receipt-save"))).toContainText(
      "Save in the table"
    );
    await expect(page.locator(part("batch-edit-bar"))).toContainText("unsaved");
  });

  test("offers only what the table currently wires", async ({ page }) => {
    // Grouping armed makes the table a nested list, so row pinning is inert
    // and its examples must not be offered.
    expect(await catalogText(page)).not.toContain("view.pinRow");

    await page.locator(".ai-demo__settings summary").click();
    await page.getByTestId("ai-toggle-grouping").click();

    await expect.poll(async () => catalogText(page)).toContain("view.pinRow");
  });

  test("pins a column and a row through the assistant", async ({ page }) => {
    await page.locator(".ai-demo__settings summary").click();
    await page.getByTestId("ai-toggle-grouping").click();
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

    await page.locator(".ai-demo__settings summary").click();
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
    await page.locator(".ai-demo__settings summary").click();
    await page
      .locator(".ai-demo__toggles")
      .getByRole("button", { name: "RTL" })
      .click();

    await expect(page.locator(".ai-demo")).toHaveAttribute("dir", "rtl");
    await expect(page.locator(part("assistant-surface"))).toBeVisible();
    await ask(page, "Show only the Core team.");
    await expect
      .poll(async () => visibleTableText(page))
      .not.toContain("Jonah");
  });
});
