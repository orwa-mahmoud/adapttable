import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { promisify } from "node:util";

import { expect, type Page, type TestInfo } from "@playwright/test";

const execute = promisify(execFile);
const OBSERVATION_MS = 500;
const GET_WINDOW_FOCUS = "getwindowfocus";

export const x11DiagnosticEnabled =
  Boolean(process.env.CI) && process.env.FULLSCREEN_X11_DIAGNOSTIC === "1";

type Xdotool = (args: string[]) => Promise<string>;
type Harness = <T>(action: () => Promise<T>) => Promise<T>;

async function pressX11Escape(
  page: Page,
  token: string,
  windowId: string,
  title: string,
  exactTitle: string,
  xdotool: Xdotool
): Promise<void> {
  expect(await page.title()).toBe(token);
  expect(await xdotool(["search", "--onlyvisible", "--name", exactTitle])).toBe(
    windowId
  );
  expect(await xdotool(["getwindowname", windowId])).toBe(title);
  await xdotool(["windowfocus", "--sync", windowId]);
  // Default getwindowfocus resolves a focused child to its WM_CLASS
  // ancestor. Retain the raw focus as well for diagnosis.
  expect(await xdotool([GET_WINDOW_FOCUS])).toBe(windowId);
  await xdotool([GET_WINDOW_FOCUS, "-f"]);
  await expect.poll(() => page.evaluate(() => document.hasFocus())).toBe(true);
  // https://manpages.ubuntu.com/manpages/noble/man1/xdotool.1.html
  // A standalone key command has no window stack or --window: this
  // delivers XTest to current focus, not XSendEvent to a target ID.
  await xdotool(["key", "Escape"]);
  await xdotool([GET_WINDOW_FOCUS]);
}

async function prepareX11(
  page: Page,
  token: string,
  xdotool: Xdotool,
  harness: Harness
): Promise<() => Promise<void>> {
  return harness(async () => {
    expect(x11DiagnosticEnabled, "CI must explicitly enable X11 input").toBe(
      true
    );
    expect(process.platform).toBe("linux");
    expect(process.env.DISPLAY, "Xvfb display must be present").toBeTruthy();
    await page.evaluate((title) => {
      document.title = title;
    }, token);
    await page.bringToFront();
    await xdotool(["version"]);

    // Search every visible match, never take the first result or limit the
    // search. The UUID is set on this page and is unique to this test.
    let windowId = "";
    let title = "";
    await expect(async () => {
      const matches = (
        await xdotool(["search", "--onlyvisible", "--name", token])
      ).split("\n");
      expect(matches).toHaveLength(1);
      windowId = matches[0] ?? "";
      expect(windowId).toMatch(/^\d+$/);
      title = await xdotool(["getwindowname", windowId]);
      expect(title === token || title.startsWith(`${token} - `)).toBe(true);
    }).toPass({ timeout: 3_000 });
    const exactTitle = `^${title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`;

    return () =>
      harness(() =>
        pressX11Escape(page, token, windowId, title, exactTitle, xdotool)
      );
  });
}

/** Passive evidence only: no keyboard cancellation or fullscreen mutation. */
export async function observeFullscreenInput(
  page: Page,
  testInfo: TestInfo,
  selectors: { root: string; overlay?: string },
  runtime: { channel: string | undefined; headless: boolean }
) {
  const token = `adapttable-fullscreen-${randomUUID()}`;
  const prefix = `${token}:`;
  const events: string[] = [];
  const snapshots: unknown[] = [];
  const commands: unknown[] = [];
  const harnessErrors: string[] = [];
  const onConsole = (message: { text(): string }): void => {
    const text = message.text();
    if (text.startsWith(prefix)) events.push(text.slice(prefix.length));
  };
  page.on("console", onConsole);
  await page.evaluate(
    ({ prefix, selectors }) => {
      const report = (event: Event, phase: string): void => {
        const active = document.activeElement;
        console.info(
          prefix +
            JSON.stringify({
              at: performance.timeOrigin + performance.now(),
              type: event.type,
              phase,
              key: event instanceof KeyboardEvent ? event.key : null,
              trusted: event.isTrusted,
              defaultPrevented: event.defaultPrevented,
              fullscreen:
                document.fullscreenElement !== null &&
                document.fullscreenElement ===
                  document.querySelector(selectors.root),
              focused: {
                tag: active?.tagName,
                id: active?.id,
                part: active?.getAttribute("data-adapttable-part"),
              },
            })
        );
      };
      const observe = (event: Event): void => {
        report(event, "capture");
        // Capture also sees events that an overlay stops from bubbling. The
        // later sample records defaultPrevented after its handlers have run.
        setTimeout(() => report(event, "after-dispatch"), 0);
      };
      for (const type of [
        "keydown",
        "keyup",
        "fullscreenchange",
        "fullscreenerror",
      ]) {
        window.addEventListener(type, observe, {
          capture: true,
          passive: true,
        });
      }
    },
    { prefix, selectors }
  );

  const snapshot = async (label: string): Promise<void> => {
    snapshots.push({
      label,
      ...(await page.evaluate(({ root, overlay }) => {
        const active = document.activeElement;
        const panel = overlay ? document.querySelector(overlay) : null;
        const style = panel ? getComputedStyle(panel) : null;
        return {
          at: performance.timeOrigin + performance.now(),
          fullscreen:
            document.fullscreenElement !== null &&
            document.fullscreenElement === document.querySelector(root),
          fullscreenElement: document.fullscreenElement?.tagName ?? null,
          documentFocused: document.hasFocus(),
          focused: {
            tag: active?.tagName,
            id: active?.id,
            part: active?.getAttribute("data-adapttable-part"),
          },
          overlayVisible: overlay
            ? Boolean(
                panel?.getClientRects().length &&
                style?.visibility !== "hidden" &&
                style?.display !== "none"
              )
            : null,
        };
      }, selectors)),
    });
  };

  const xdotool = async (args: string[]): Promise<string> => {
    try {
      const { stdout, stderr } = await execute("xdotool", args, {
        timeout: 2_500,
        maxBuffer: 64 * 1024,
      });
      commands.push({
        at: Date.now(),
        args,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
      });
      return stdout.trim();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      commands.push({ at: Date.now(), args, error: message });
      throw new Error(`X11 diagnostic harness: ${message}`, { cause: error });
    }
  };

  const harness = async <T>(action: () => Promise<T>): Promise<T> => {
    try {
      return await action();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      harnessErrors.push(message);
      throw new Error(`X11 diagnostic harness failed: ${message}`, {
        cause: error,
      });
    }
  };

  return {
    prepareX11: () => prepareX11(page, token, xdotool, harness),
    async pressEscape(
      label: string,
      press: () => Promise<void>
    ): Promise<void> {
      await snapshot(`${label}:before`);
      await press();
      await snapshot(`${label}:delivered`);
      // Observation window, not an eventual assertion. Browser-owned Escape
      // can consume the key without dispatching any DOM keyboard event.
      await delay(OBSERVATION_MS);
      await snapshot(`${label}:after-${String(OBSERVATION_MS)}ms`);
    },
    async attach(name: string): Promise<void> {
      page.off("console", onConsole);
      await testInfo.attach(name, {
        contentType: "application/json",
        body: JSON.stringify(
          {
            browserVersion: page.context().browser()?.version(),
            project: testInfo.project.name,
            ...runtime,
            platform: process.platform,
            display: process.env.DISPLAY,
            observationMs: OBSERVATION_MS,
            selectors,
            snapshots,
            events,
            commands,
            harnessErrors,
          },
          null,
          2
        ),
      });
    },
  };
}
