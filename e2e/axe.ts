import { readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { expect, type Page } from "@playwright/test";

/**
 * Inject the same `axe-core` the adapter unit suites already depend on, then
 * run it against a selector. No extra Playwright package — the adapters pin
 * the engine.
 */
const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function resolveAxeSource(): string {
  try {
    return createRequire(
      join(REPO_ROOT, "packages/react/adapter-unstyled/package.json")
    ).resolve("axe-core/axe.min.js");
  } catch {
    const pnpm = join(REPO_ROOT, "node_modules/.pnpm");
    const dir = readdirSync(pnpm).find((name) => name.startsWith("axe-core@"));
    if (dir) {
      return join(pnpm, dir, "node_modules/axe-core/axe.min.js");
    }
    throw new Error("axe-core is not installed");
  }
}

const AXE_SOURCE = resolveAxeSource();

export interface AxeNode {
  target: string[];
}

export interface AxeViolation {
  id: string;
  impact: string | null;
  description: string;
  help: string;
  nodes: AxeNode[];
}

export interface AxeResults {
  violations: AxeViolation[];
}

const BLOCKING = new Set(["serious", "critical"]);

/**
 * Scan `selector` (the kit demo surface) and return blocking axe findings.
 *
 * `color-contrast` stays off, same as every adapter's jsdom axe suite: kit
 * dimmed tokens (pagination captions, secondary meta) fail WCAG on purpose
 * in several libraries, and this audit is the name/role/state net, not a
 * token redesign.
 */
export async function scanAxe(
  page: Page,
  selector: string
): Promise<AxeViolation[]> {
  await page.addScriptTag({ path: AXE_SOURCE });
  const results = await page.evaluate(async (rootSelector) => {
    const root = document.querySelector(rootSelector);
    if (!root) {
      throw new Error(`axe: no element matches ${rootSelector}`);
    }
    const axe = (
      window as unknown as {
        axe: {
          run: (
            context: { include: Element[]; exclude: string[][] },
            options: {
              reporter: string;
              rules: { "color-contrast": { enabled: boolean } };
            }
          ) => Promise<AxeResults>;
        };
      }
    ).axe;
    return axe.run(
      {
        include: [root],
        // antd injects an aria-hidden measure row with focusable descendants
        // so it can size columns. That node is the kit's, not ours.
        exclude: [[".ant-table-measure-row"]],
      },
      {
        reporter: "v2",
        rules: { "color-contrast": { enabled: false } },
      }
    );
  }, selector);
  return results.violations.filter((violation) =>
    BLOCKING.has(violation.impact ?? "")
  );
}

/** Fail the spec when axe reports a serious or critical violation. */
export async function expectNoBlockingAxe(
  page: Page,
  selector: string
): Promise<void> {
  const blocking = await scanAxe(page, selector);
  const summary = blocking.map(
    (violation) =>
      `[${violation.impact}] ${violation.id}: ${violation.help} (${violation.nodes
        .map((node) => node.target.join(" "))
        .join("; ")})`
  );
  expect(summary).toEqual([]);
}
