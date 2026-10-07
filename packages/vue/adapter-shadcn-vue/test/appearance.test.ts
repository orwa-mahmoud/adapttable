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
import { Button } from "../src/components/button";
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
function matchingPaint(element: Element, property: string): string[] {
  const values: string[] = [];
  stylesheet.walkRules((rule) => {
    // Neither pseudo-elements nor keyframe offsets select the control itself.
    if (
      rule.selector.includes("::") ||
      (rule.parent?.type === "atrule" && rule.parent.name === "keyframes")
    )
      return;
    const paint = declarations(rule, property);
    if (paint.length && element.matches(rule.selector)) values.push(...paint);
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
  it.each(["light", "dark"])(
    "resets native sortable-button paint without host preflight (%s)",
    async (theme) => {
      const view = mount({ forceMobile: false });
      view.root.classList.toggle("dark", theme === "dark");
      await nextTick();
      const button = target(view.root, '[data-adapttable-part="sort-button"]');
      expect(matchingPaint(button, "background-color").at(-1)).toBe("#0000");
      expect(matchingPaint(button, "color").at(-1)).toBe("inherit");
      const hostButton = document.createElement("button");
      view.root.append(hostButton);
      expect(matchingPaint(hostButton, "background-color")).toEqual([]);
      expect(matchingPaint(hostButton, "color")).toEqual([]);
    }
  );

  it.each(["light", "dark"])(
    "keeps the current page's compiled foreground and background paired (%s)",
    async (theme) => {
      const view = mount({
        forceMobile: false,
        paginationMode: "paged",
        defaults: { limit: 1 },
      });
      view.root.classList.toggle("dark", theme === "dark");
      await nextTick();
      const current = () => target(view.root, '[aria-current="page"]');
      const expectCurrentPaint = () => {
        expect(matchingPaint(current(), "background-color").at(-1)).toBe(
          "var(--primary,#18181b)"
        );
        expect(matchingPaint(current(), "color").at(-1)).toBe(
          "var(--primary-foreground,#fafafa)"
        );
      };
      expect(current().textContent).toBe("1");
      expectCurrentPaint();
      const previous = current();
      target<HTMLButtonElement>(
        view.root,
        '[data-adapttable-part="page-next"]'
      ).click();
      await nextTick();
      expect(current().textContent).toBe("2");
      expectCurrentPaint();
      expect(matchingPaint(previous, "color").at(-1)).toBe("inherit");
    }
  );

  it("preserves copied Button variants and caller color overrides", () => {
    const root = document.createElement("div");
    document.body.append(root);
    const variants = [
      "default",
      "destructive",
      "outline",
      "secondary",
      "ghost",
      "link",
    ] as const;
    const app = createApp({
      render: () =>
        h("div", [
          ...variants.map((variant) => h(Button, { variant }, () => variant)),
          h(
            Button,
            {
              variant: "ghost",
              class: "bg-destructive text-white",
              disabled: true,
            },
            () => "Custom"
          ),
        ]),
    });
    app.mount(root);
    cleanups.push(() => {
      app.unmount();
      root.remove();
    });
    const paint = (variant: string, property: string) =>
      matchingPaint(target(root, `[data-variant="${variant}"]`), property).at(
        -1
      );
    expect(paint("default", "background-color")).toBe("var(--primary,#18181b)");
    expect(paint("default", "color")).toBe("var(--primary-foreground,#fafafa)");
    expect(paint("destructive", "background-color")).toBe(
      "var(--destructive,#dc2626)"
    );
    expect(paint("destructive", "color")).toBe("var(--color-white)");
    expect(paint("outline", "background-color")).toBe("var(--background,#fff)");
    expect(paint("outline", "color")).toBe("inherit");
    expect(paint("secondary", "background-color")).toBe(
      "var(--secondary,#f4f4f5)"
    );
    expect(paint("secondary", "color")).toBe(
      "var(--secondary-foreground,#18181b)"
    );
    expect(paint("ghost", "background-color")).toBe("#0000");
    expect(paint("link", "background-color")).toBe("#0000");
    expect(paint("link", "color")).toBe("var(--primary,#18181b)");
    const custom = target(root, "button:disabled");
    expect(matchingPaint(custom, "background-color").at(-1)).toBe(
      "var(--destructive,#dc2626)"
    );
    expect(matchingPaint(custom, "color").at(-1)).toBe("var(--color-white)");
    expect(matchingPaint(custom, "pointer-events").at(-1)).toBe("none");
    expect(matchingPaint(custom, "opacity").at(-1)).toBe(".5");
  });

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
