/**
 * The AI page in every framework: where each kit's page lives, and the
 * reader's moves on it — open the conversation, send a request, choose where
 * approvals are reviewed. React, Vue and Angular draw the same page from one
 * definition, so one set of moves drives all three.
 */
import { expect, type Locator, type Page } from "@playwright/test";

import { builtAdapters, pathOf } from "../apps/showcase/matrix.mjs";

/** A framework that has AI pages. */
export type AiFramework = "react" | "vue" | "angular";

/** One kit's AI page. */
export interface AiKit {
  readonly framework: AiFramework;
  readonly key: string;
  /** The page's address, without a query. */
  readonly route: string;
}

/** Every built kit's AI page, React, Vue and Angular. */
export const AI_KITS: readonly AiKit[] = (
  ["react", "vue", "angular"] as const
).flatMap((framework) =>
  builtAdapters(framework).map((adapter) => ({
    framework,
    key: adapter.key,
    route:
      framework === "vue"
        ? `/vue/${pathOf(adapter)}/ai/`
        : `/${adapter.key}/ai/`,
  }))
);

/** A data-adapttable-part selector. */
export const part = (name: string): string =>
  `[data-adapttable-part="${name}"]`;

/** The table, or its phone cards, once it has mounted. */
export async function mountedTable(page: Page): Promise<Locator> {
  const table = page.getByRole("table");
  const cards = page.getByRole("list", { name: "Data table" });
  const mounted = table.or(cards).first();
  await expect(mounted).toBeVisible();
  return mounted;
}

/** Open the conversation through its launcher, or leave an open one alone. */
export async function openAssistant(page: Page): Promise<void> {
  const surface = page.locator(part("assistant-surface"));
  if ((await surface.count()) === 0) {
    await page.locator(part("assistant-launcher")).click();
  }
  await expect(surface).toBeVisible();
}

/** Land on a kit's AI page with the conversation open. */
export async function openAiDemo(
  page: Page,
  kit: AiKit,
  query = ""
): Promise<void> {
  await page.goto(`${kit.route}${query}`);
  await expect(page.locator(".ai-demo")).toBeVisible();
  await mountedTable(page);
  await openAssistant(page);
}

/** Send text the way a reader does: type it, press Enter. */
export async function ask(page: Page, text: string): Promise<void> {
  const input = page.locator(part("assistant-input"));
  await input.fill(text);
  await input.press("Enter");
}

/** The latest message's text. */
export async function lastReply(page: Page): Promise<string> {
  const texts = page.locator(part("assistant-message-text"));
  return (await texts.last().innerText()).trim();
}

/**
 * Open the demo's settings drawer from the keyboard, which reaches the
 * trigger wherever the floating assistant sits.
 */
export async function openDemoOptions(page: Page): Promise<void> {
  const drawer = page.getByTestId("ai-demo-options-drawer");
  if (await drawer.isVisible()) return;
  await page.getByTestId("ai-demo-options").focus();
  await page.keyboard.press("Enter");
  await expect(drawer).toBeVisible();
}

/** Close the drawer, so the table underneath is reachable again. */
export async function closeDemoOptions(page: Page): Promise<void> {
  const drawer = page.getByTestId("ai-demo-options-drawer");
  if (!(await drawer.isVisible())) return;
  await page.keyboard.press("Escape");
  await expect(drawer).toBeHidden();
}

/** Where a waiting change is reviewed, chosen in the drawer. */
export async function chooseApprovalLocation(
  page: Page,
  location: "widget" | "table" | "modal"
): Promise<void> {
  await openDemoOptions(page);
  await page.getByTestId(`ai-presentation-${location}`).check();
  await closeDemoOptions(page);
}

/** One person's row or card, found by name. */
export function staffRow(page: Page, person: string): Locator {
  return page
    .locator(`.ai-demo ${part("row")}, .ai-demo ${part("card")}`)
    .filter({ hasText: person });
}

/** The rows the table shows, as text. */
export async function visibleTableText(page: Page): Promise<string> {
  const region = page
    .locator(".ai-demo__stage > :not(.ai-demo__assistant)")
    .last();
  return (await region.innerText()).replace(/\s+/g, " ");
}
