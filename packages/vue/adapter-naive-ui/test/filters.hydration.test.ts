import { execFile } from "node:child_process";
import { resolve } from "node:path";
import { promisify } from "node:util";

import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { type Component, createSSRApp, shallowRef } from "vue";

import { escape, find, part, settle, tick } from "./filter-helpers";
import {
  filterHydrationOverlay,
  filterHydrationTable,
} from "./filter-hydration-fixture";

interface ServerMarkup {
  html: string;
  css: string;
}
let markup: Record<string, ServerMarkup>;
beforeAll(async () => {
  // Naive detects the server when its CSS renderer is imported. Use a real
  // Node process, then hydrate its exact markup and collected styles in jsdom.
  const { stdout, stderr } = await promisify(execFile)(
    process.execPath,
    [
      "--experimental-strip-types",
      resolve(import.meta.dirname, "filter-hydration-server.ts"),
      process.env.ADAPTTABLE_HYDRATION_CONFIG ??
        resolve(import.meta.dirname, "../vitest.config.ts"),
    ],
    { maxBuffer: 4 * 1024 * 1024, timeout: 20000 }
  );
  expect(stderr).toBe("");
  markup = JSON.parse(stdout);
}, 25000);

const cleanups: (() => void)[] = [];
afterEach(() => {
  cleanups
    .splice(0)
    .reverse()
    .forEach((cleanup) => cleanup());
});

async function hydrate(
  component: Component,
  key: string,
  selector: string,
  retainedSelectors: string[] = []
) {
  const { html, css } = markup[key]!;
  expect(css).toContain('cssr-id="');
  const styles = document.createElement("template");
  styles.innerHTML = css;
  const nodes = [...styles.content.childNodes];
  document.head.append(styles.content);
  const styleIds = [...document.head.querySelectorAll("style[cssr-id]")].map(
    (node) => node.getAttribute("cssr-id")
  );
  const host = document.createElement("div");
  host.innerHTML = html;
  document.body.append(host);
  const original = find(host, selector);
  const retained = retainedSelectors.map((target) => ({
    target,
    node: find(host, target),
  }));
  const warn = vi.spyOn(console, "warn");
  const error = vi.spyOn(console, "error");
  const client = createSSRApp(component);
  cleanups.push(() => {
    client.unmount();
    host.remove();
    nodes.forEach((node) => node.parentNode?.removeChild(node));
  });
  client.mount(host);
  await tick();
  expect(nodes.every((node) => node.parentNode === document.head)).toBe(true);
  expect(
    [...document.head.querySelectorAll("style[cssr-id]")].map((node) =>
      node.getAttribute("cssr-id")
    )
  ).toEqual(styleIds);
  expect(find(host, selector)).toBe(original);
  for (const { target, node } of retained)
    expect(find(host, target)).toBe(node);
  const assertHydration = () => {
    expect(warn.mock.calls).toEqual([]);
    expect(error.mock.calls).toEqual([]);
  };
  assertHydration();
  return { host, original, assertHydration };
}

describe("Naive filter SSR hydration", () => {
  it.each([
    { mode: "popover", mobile: false },
    { mode: "popover", mobile: true },
    { mode: "drawer", mobile: false },
    { mode: "drawer", mobile: true },
  ] as const)(
    "hydrates $mode filters and header filters with retained native targets (mobile=$mobile)",
    async ({ mode, mobile }) => {
      const component = filterHydrationTable(mode, mobile);
      const {
        host,
        original: trigger,
        assertHydration,
      } = await hydrate(
        component,
        `table-${mode}-${String(mobile)}`,
        `button${part("filters-button")}`,
        [
          `input${part("search")}`,
          mobile ? `.n-card${part("card")}` : "tbody tr",
          ...(!mobile ? [part("filter-header-trigger")] : []),
        ]
      );
      const search = find<HTMLInputElement>(host, `input${part("search")}`);
      const row = find(host, mobile ? `.n-card${part("card")}` : "tbody tr");
      const surfacePart =
        mode === "drawer" ? "filters-panel" : "filters-popover";
      expect(document.body.querySelector(part(surfacePart))).toBeNull();
      trigger.focus();
      trigger.click();
      await tick();
      const dialog = find(document.body, part(surfacePart));
      expect(dialog.classList.contains(`n-${mode}`)).toBe(true);
      expect(dialog.getAttribute("role")).toBe("dialog");
      const select = find<HTMLInputElement>(dialog, 'input[role="combobox"]');
      select.click();
      await tick();
      expect(select.getAttribute("aria-expanded")).toBe("true");
      await escape(select);
      expect(select.getAttribute("aria-expanded")).toBe("false");
      expect(find(document.body, part(surfacePart))).toBe(dialog);
      await escape(select);
      await settle();
      expect(document.body.querySelector(part(surfacePart))).toBeNull();
      expect(document.activeElement).toBe(trigger);
      expect(find(host, `input${part("search")}`)).toBe(search);
      expect(find(host, mobile ? `.n-card${part("card")}` : "tbody tr")).toBe(
        row
      );
      if (!mobile) {
        const header = find<HTMLButtonElement>(
          host,
          part("filter-header-trigger")
        );
        header.focus();
        header.click();
        await tick();
        const headerDialog = find(document.body, part("filter-header-popover"));
        expect(headerDialog.classList.contains("n-popover")).toBe(true);
        const input = find<HTMLInputElement>(headerDialog, "input");
        input.focus();
        await escape(input);
        await settle();
        expect(
          document.body.querySelector(part("filter-header-popover"))
        ).toBeNull();
        expect(document.activeElement).toBe(header);
      }
      assertHydration();
    }
  );

  it.each([false, true])(
    "keeps a hydrated controlled overlay and focus stable when the host rejects close (modal=%s)",
    async (modal) => {
      const accept = shallowRef(false);
      const close = vi.fn();
      const component = filterHydrationOverlay(
        modal,
        () => accept.value,
        close
      );
      const beforeOverflow = document.documentElement.style.overflow;
      const { original: trigger, assertHydration } = await hydrate(
        component,
        `overlay-${String(modal)}`,
        "button"
      );
      trigger.focus();
      trigger.click();
      await tick();
      const surfacePart = modal ? "filters-panel" : "filters-popover";
      const dialog = find(document.body, part(surfacePart));
      const select = find<HTMLInputElement>(dialog, 'input[role="combobox"]');
      select.focus();
      select.click();
      await tick();
      await escape(select);
      expect(select.getAttribute("aria-expanded")).toBe("false");
      expect(close).not.toHaveBeenCalled();
      await escape(select);
      expect(close).toHaveBeenCalledExactlyOnceWith("escape");
      expect(find(document.body, part(surfacePart))).toBe(dialog);
      expect(find(dialog, 'input[role="combobox"]')).toBe(select);
      expect(dialog.contains(document.activeElement)).toBe(true);
      if (modal) {
        expect(document.documentElement.style.overflow).toBe("hidden");
        find(document.body, ".n-drawer-mask").click();
        await tick();
        expect(close).toHaveBeenLastCalledWith("outside");
        trigger.focus();
        expect(dialog.contains(document.activeElement)).toBe(true);
      }
      accept.value = true;
      await escape(select);
      await settle();
      expect(document.body.querySelector(part(surfacePart))).toBeNull();
      expect(document.activeElement).toBe(trigger);
      expect(document.documentElement.style.overflow).toBe(beforeOverflow);
      assertHydration();
    }
  );
});
