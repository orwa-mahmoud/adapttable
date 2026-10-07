import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { type ColumnDef } from "@adapttable/vue";
import postcss, { type Root, type Rule } from "postcss";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createApp, defineComponent, h, nextTick, shallowRef } from "vue";

import { DataTable, type DataTableProps } from "../src";
import { densityChooser } from "../src/density";

interface Person {
  id: string;
  name: string;
}
const data: readonly Person[] = [
  { id: "a", name: "Ada" },
  { id: "b", name: "Bea" },
];
const columns: readonly ColumnDef<Person>[] = [
  { key: "name", header: "Name", sortable: true },
];
const cleanups: (() => void)[] = [];
let directory: string;
let stylesheet: Root;

beforeAll(() => {
  directory = mkdtempSync(join(tmpdir(), "shadcn-appearance-"));
  const require = createRequire(import.meta.url);
  const cli = join(
    dirname(require.resolve("@tailwindcss/cli/package.json")),
    "dist/index.mjs"
  );
  const output = join(directory, "styles.css");
  execFileSync(
    process.execPath,
    [
      cli,
      "-i",
      join(dirname(fileURLToPath(import.meta.url)), "../src/styles.css"),
      "-o",
      output,
      "--minify",
    ],
    { stdio: "pipe", timeout: 30_000 }
  );
  stylesheet = postcss.parse(readFileSync(output, "utf8"));
});
afterAll(() => {
  if (directory) rmSync(directory, { recursive: true, force: true });
});
afterEach(() => cleanups.splice(0).forEach((cleanup) => cleanup()));

function declarations(rule: Rule, property: string): string[] {
  const values: string[] = [];
  rule.walkDecls(property, (declaration) => {
    values.push(declaration.value);
  });
  return values;
}
function compactPaint(element: Element, property: string): string[] {
  const values: string[] = [];
  stylesheet.walkRules((rule) => {
    if (
      rule.selector.includes("[data-density=compact]") &&
      element.matches(rule.selector)
    )
      values.push(...declarations(rule, property));
  });
  return values;
}
function target<T extends Element>(root: ParentNode, selector: string): T {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`Missing ${selector}`);
  return element;
}
function mount(options: Partial<DataTableProps<Person>>) {
  const props = shallowRef<DataTableProps<Person>>({
    data,
    columns,
    rowKey: (row) => row.id,
    urlSync: false,
    ...options,
  });
  const root = document.createElement("div");
  document.body.append(root);
  const app = createApp(
    defineComponent({ setup: () => () => h(DataTable<Person>, props.value) })
  );
  app.mount(root);
  cleanups.push(() => {
    app.unmount();
    root.remove();
  });
  return { root, props };
}

describe("compiled shadcn appearance contracts", () => {
  it.each(["ltr", "rtl"] as const)(
    "keeps native pinned cells on opaque row and header theme paint (%s)",
    async (dir) => {
      const view = mount({
        forceMobile: false,
        dir,
        columnLayout: {
          hidden: [],
          order: [],
          pinned: { name: "start" },
          widths: { name: 240 },
        },
      });
      await nextTick();
      const row = target(view.root, '[data-row-id="a"]');
      const cell = target<HTMLElement>(
        row,
        '[data-adapttable-part="cell"][data-pinned="start"]'
      );
      const header = target<HTMLElement>(
        view.root,
        '[data-adapttable-part="header-cell"][data-pinned="start"]'
      );
      expect(cell.style.position).toBe("sticky");
      const paint = (element: Element) => {
        const values: string[] = [];
        stylesheet.walkRules((rule) => {
          if (
            [".bg-inherit", ".bg-background"].includes(rule.selector) &&
            element.matches(rule.selector)
          )
            values.push(...declarations(rule, "background-color"));
        });
        return values;
      };
      expect(paint(cell)).toContain("inherit");
      expect(
        paint(row).some((value) => value.startsWith("var(--background,"))
      ).toBe(true);
      expect(
        paint(header).some((value) => value.startsWith("var(--background,"))
      ).toBe(true);
      const hover = [...row.classList].find((name) =>
        name.startsWith("hover:bg-[color-mix")
      );
      expect(hover).toContain("var(--muted,");
      expect(hover).toContain("var(--background,");
      expect(hover).not.toContain("transparent");
      view.props.value = { ...view.props.value, selectedIds: ["a"] };
      await nextTick();
      expect(
        target(row, '[data-adapttable-part="cell"][data-pinned="start"]')
      ).toBe(cell);
      expect(row.getAttribute("aria-selected")).toBe("true");
      expect(row.classList.contains("aria-selected:bg-muted")).toBe(true);
    }
  );

  it("lets caller row, header and cell color utilities override kit defaults", async () => {
    const view = mount({
      forceMobile: false,
      classNames: {
        tr: "bg-red-500 hover:bg-blue-500",
        th: "bg-yellow-500",
        td: "bg-green-500",
      },
    });
    await nextTick();
    const row = target(view.root, '[data-row-id="a"]');
    const cell = target(row, '[data-adapttable-part="cell"]');
    const header = target(view.root, '[data-adapttable-part="header-cell"]');
    expect(row.classList.contains("bg-red-500")).toBe(true);
    expect(
      [...row.classList].some((name) => name.startsWith("hover:bg-[color-mix"))
    ).toBe(false);
    expect(cell.classList.contains("bg-green-500")).toBe(true);
    expect(cell.classList.contains("bg-inherit")).toBe(false);
    expect(header.classList.contains("bg-yellow-500")).toBe(true);
    expect(header.classList.contains("bg-background")).toBe(false);
  });

  it("paints selected and unselected desktop rows from their rendered ARIA state", async () => {
    const view = mount({ forceMobile: false, selectedIds: ["a"] });
    await nextTick();
    const first = target(view.root, '[data-row-id="a"]');
    const second = target(view.root, '[data-row-id="b"]');
    const paintRules: Rule[] = [];
    stylesheet.walkRules((rule) => {
      if (
        rule.selector.includes("[aria-selected=true]") &&
        declarations(rule, "background-color").some((value) =>
          value.startsWith("var(--muted,")
        )
      )
        paintRules.push(rule);
    });
    expect(paintRules.length).toBeGreaterThan(0);
    const highlighted = (row: Element) =>
      paintRules.some((rule) => row.matches(rule.selector));
    expect(first.getAttribute("aria-selected")).toBe("true");
    expect(first.hasAttribute("data-selected")).toBe(false);
    expect(second.hasAttribute("data-selected")).toBe(false);
    expect(highlighted(first)).toBe(true);
    expect(highlighted(second)).toBe(false);
    view.props.value = { ...view.props.value, selectedIds: ["b"] };
    await nextTick();
    expect(highlighted(first)).toBe(false);
    expect(highlighted(second)).toBe(true);
  });

  it.each(["ltr", "rtl"] as const)(
    "tightens real mobile Cards and controls while retaining narrow-viewport tap minima (%s)",
    async (dir) => {
      const view = mount({
        forceMobile: true,
        dir,
        density: "comfortable",
        features: [densityChooser()],
      });
      const card = target(view.root, "article[data-slot=card]");
      const fields = target(card, "dl");
      const field = target(card, '[data-adapttable-part="card-row"]');
      const button = target(
        view.root,
        '[data-adapttable-part="sort-direction"]'
      );
      const input = target(view.root, '[data-adapttable-part="search"]');
      const select = target(
        view.root,
        '[data-adapttable-part="density-toggle"]'
      );
      expect(compactPaint(card, "padding")).toEqual([]);
      expect(compactPaint(button, "block-size")).toEqual([]);
      view.props.value = { ...view.props.value, density: "compact" };
      await nextTick();
      expect(target(view.root, "article[data-slot=card]")).toBe(card);
      expect(compactPaint(card, "padding")).toEqual([".75rem"]);
      expect(compactPaint(card, "gap")).toEqual([".5rem"]);
      expect(compactPaint(fields, "gap")).toEqual([".5rem"]);
      expect(compactPaint(field, "column-gap")).toEqual([".5rem"]);
      expect(compactPaint(button, "block-size")).toEqual(["2rem"]);
      expect(compactPaint(button, "padding-inline")).toEqual([".625rem"]);
      expect(compactPaint(input, "padding-block").at(-1)).toBe(".125rem");
      expect(compactPaint(select, "padding-inline-start")).toEqual([".625rem"]);
      const tapMinima: Element[] = [];
      stylesheet.walkAtRules("media", (media) => {
        if (media.params !== "(max-width:640px)") return;
        media.walkRules((rule) => {
          if (!declarations(rule, "min-block-size").includes("2.75rem")) return;
          tapMinima.push(
            ...[button, input, select].filter((element) =>
              element.matches(rule.selector)
            )
          );
        });
      });
      expect(tapMinima).toEqual([button, input, select]);
      view.props.value = { ...view.props.value, density: "comfortable" };
      await nextTick();
      expect(compactPaint(card, "padding")).toEqual([]);
      expect(compactPaint(select, "padding-inline-start")).toEqual([]);
    }
  );
});
