import type { CellRange } from "@adapttable/vue/adapter";
import { createApp, createSSRApp, h, nextTick, shallowRef } from "vue";
import { renderToString } from "vue/server-renderer";
import { createVuetify } from "vuetify";
import { aliases, mdi } from "vuetify/iconsets/mdi-svg";

import { DataTable, type DataTableProps } from "../src";
import {
  cellNavigation,
  columnSelectionCheckbox,
} from "../src/cell-navigation";
import { findInTable } from "../src/find-in-table";
import { selectionStats, statusBar } from "../src/status-bar";

interface Person {
  id: string;
  name: string;
  score: number;
}
const people: readonly Person[] = [
  { id: "ada", name: "Ada", score: 10 },
  { id: "grace", name: "Grace", score: 30 },
];
const cleanups: (() => void)[] = [];
function vuetify() {
  return createVuetify({
    ssr: true,
    icons: { defaultSet: "mdi", aliases, sets: { mdi } },
  });
}
function fixture(overrides: Partial<DataTableProps<Person>> = {}) {
  const props = shallowRef<DataTableProps<Person>>({
    data: people,
    columns: [
      { key: "name", header: "Name" },
      { key: "score", header: "Score", editable: true, editor: "number" },
    ],
    rowKey: (row) => row.id,
    urlSync: false,
    forceMobile: false,
    searchable: false,
    features: [
      cellNavigation(),
      columnSelectionCheckbox(),
      findInTable({ button: true }),
      selectionStats(),
      statusBar(),
    ],
    ...overrides,
  });
  const host = document.createElement("div");
  document.body.append(host);
  const app = createApp({
    setup: () => () => h(DataTable<Person>, props.value),
  }).use(vuetify());
  app.mount(host);
  cleanups.push(() => {
    app.unmount();
    host.remove();
  });
  return { host, props };
}
afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
});
function node<T extends HTMLElement>(host: ParentNode, selector: string): T {
  const result = host.querySelector<T>(selector);
  if (!result) throw new Error(`Missing ${selector}`);
  return result;
}
function part(name: string): string {
  return `[data-adapttable-part="${name}"]`;
}
async function settle(): Promise<void> {
  await nextTick();
  await nextTick();
}
async function key(
  target: HTMLElement,
  name: string,
  options: KeyboardEventInit = {}
): Promise<void> {
  target.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: name,
      bubbles: true,
      cancelable: true,
      ...options,
    })
  );
  await settle();
}

it("uses binding-owned grid ranges and genuine Vuetify status surfaces", async () => {
  const changed = vi.fn<(range: CellRange | null) => void>();
  const { host } = fixture({
    classNames: { selectionStats: "host-stats" },
    features: [
      cellNavigation({ onRangeChange: changed }),
      selectionStats(),
      statusBar(),
    ],
  });
  await settle();
  const first = node(host, '[data-grid-cell="0:0"]');
  first.focus();
  await key(first, "ArrowRight");
  const score = node(host, '[data-grid-cell="0:1"]');
  expect(document.activeElement).toBe(score);
  await key(score, "ArrowDown", { shiftKey: true });
  expect(changed).toHaveBeenLastCalledWith({
    anchor: { row: 0, col: 1 },
    head: { row: 1, col: 1 },
  });
  expect(host.querySelectorAll(part("status-bar"))).toHaveLength(1);
  expect(node(host, part("status-bar")).classList.contains("v-sheet")).toBe(
    true
  );
  const stats = node(host, part("selection-stats"));
  expect(stats.tagName).toBe("OUTPUT");
  expect(stats.classList.contains("host-stats")).toBe(true);
  expect(stats.getAttribute("aria-live")).toBe("polite");
  expect(stats.textContent).toContain("40");
  expect(stats.querySelector(".v-chip")).not.toBeNull();
  expect(node(host, part("grid-announcer")).getAttribute("aria-live")).toBe(
    "polite"
  );
});

it("selects and clears a column with a real Vuetify checkbox and one range request", async () => {
  const changed = vi.fn();
  const { host } = fixture({
    features: [
      cellNavigation({ onRangeChange: changed }),
      columnSelectionCheckbox(),
    ],
  });
  await settle();
  const checkbox = node<HTMLInputElement>(
    host,
    'input[aria-label="Select column: Name"]'
  );
  expect(checkbox.closest(".v-checkbox-btn")).not.toBeNull();
  changed.mockClear();
  checkbox.click();
  await settle();
  expect(changed).toHaveBeenCalledOnce();
  expect(checkbox.checked).toBe(true);
  expect(host.querySelectorAll('td[aria-selected="true"]')).toHaveLength(2);
  checkbox.click();
  await settle();
  expect(checkbox.checked).toBe(false);
  expect(changed).toHaveBeenCalledTimes(2);
});

it("keeps native find-input focus while typing and hands the matched cell back to grid navigation", async () => {
  const { host } = fixture();
  await settle();
  const trigger = node<HTMLButtonElement>(host, part("find-button"));
  expect(trigger.classList.contains("v-btn")).toBe(true);
  trigger.focus();
  trigger.click();
  await settle();
  const field = node(host, part("find-input"));
  expect(field.classList.contains("v-text-field")).toBe(true);
  const input = node<HTMLInputElement>(field, "input");
  expect(document.activeElement).toBe(input);
  for (const query of ["a", "ad"]) {
    input.value = query;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await settle();
    expect(node(field, "input")).toBe(input);
    expect(document.activeElement).toBe(input);
    expect(input.value).toBe(query);
  }
  expect(host.querySelectorAll("[data-cell-match]")).toHaveLength(1);
  await key(input, "Escape");
  expect(host.querySelector(part("find-bar"))).toBeNull();
  expect(document.activeElement).toBe(node(host, '[data-grid-cell="0:0"]'));
});

it("restores the opener when standalone find closes without grid navigation", async () => {
  const { host } = fixture({ features: [findInTable({ button: true })] });
  await settle();
  const trigger = node<HTMLButtonElement>(host, part("find-button"));
  trigger.focus();
  trigger.click();
  await settle();
  const input = node<HTMLInputElement>(host, `${part("find-input")} input`);
  expect(document.activeElement).toBe(input);
  input.value = "Grace";
  input.dispatchEvent(new Event("input", { bubbles: true }));
  await settle();
  await key(input, "Escape");
  expect(host.querySelector(part("find-bar"))).toBeNull();
  expect(document.activeElement).toBe(trigger);
});

it("walks match controls and removes optional navigation models live", async () => {
  const { host, props } = fixture();
  await settle();
  node<HTMLButtonElement>(host, part("find-button")).click();
  await settle();
  const input = node<HTMLInputElement>(host, `${part("find-input")} input`);
  input.value = "a";
  input.dispatchEvent(new Event("input", { bubbles: true }));
  await settle();
  expect(node(host, part("find-count")).textContent).toContain("1 of 2");
  node<HTMLButtonElement>(host, part("find-next")).click();
  await settle();
  expect(node(host, part("find-count")).textContent).toContain("2 of 2");
  await key(input, "Enter", { shiftKey: true });
  expect(node(host, part("find-count")).textContent).toContain("1 of 2");
  props.value = { ...props.value, features: [] };
  await settle();
  expect(host.querySelector('[role="grid"]')).toBeNull();
  expect(host.querySelector(part("find-bar"))).toBeNull();
  expect(host.querySelector(part("status-bar"))).toBeNull();
});

it("finds inside mobile Vuetify cards without enabling desktop grid navigation", async () => {
  const { host } = fixture({
    forceMobile: true,
    features: [findInTable({ button: true })],
  });
  await settle();
  node<HTMLButtonElement>(host, part("find-button")).click();
  await settle();
  const input = node<HTMLInputElement>(host, `${part("find-input")} input`);
  input.value = "Grace";
  input.dispatchEvent(new Event("input", { bubbles: true }));
  await settle();
  expect(
    host.querySelectorAll("article.v-card [data-cell-match]")
  ).toHaveLength(1);
  expect(host.querySelector('[role="grid"]')).toBeNull();
});

it("mirrors RTL grid keys and delegates fill requests without modifying host rows", async () => {
  const fill = vi.fn();
  const { host } = fixture({
    dir: "rtl",
    onCellFill: fill,
    features: [cellNavigation()],
  });
  await settle();
  const first = node(host, '[data-grid-cell="0:0"]');
  first.focus();
  await key(first, "ArrowLeft");
  const score = node(host, '[data-grid-cell="0:1"]');
  expect(document.activeElement).toBe(score);
  await key(score, "ArrowDown", { shiftKey: true });
  expect(node(host, part("fill-handle")).classList.contains("v-sheet")).toBe(
    true
  );
  await key(node(host, '[data-grid-cell="1:1"]'), "d", { ctrlKey: true });
  expect(fill).toHaveBeenCalledExactlyOnceWith([
    { row: people[1], columnKey: "score", value: "10" },
  ]);
  expect(people[1]?.score).toBe(30);
});

it("server-renders status controls and hydrates navigation admission without mismatches", async () => {
  const root = {
    render: () =>
      h(DataTable<Person>, {
        data: people,
        columns: [{ key: "name", header: "Name" }],
        rowKey: (row) => row.id,
        urlSync: false,
        forceMobile: false,
        features: [
          cellNavigation(),
          columnSelectionCheckbox(),
          findInTable({ button: true }),
          statusBar(),
        ],
        classNames: {
          findButton: "host-find",
          statusBar: "host-status",
          statusItem: "host-item",
        },
      }),
  };
  const html = await renderToString(createSSRApp(root).use(vuetify()));
  expect(html).toContain('data-adapttable-part="find-button"');
  expect(html).toContain("host-find");
  expect(html).toContain("host-status");
  expect(html).toContain("host-item");
  expect(html).toContain("v-chip");
  const host = document.createElement("div");
  host.innerHTML = html;
  document.body.append(host);
  const warnings = vi.spyOn(console, "warn");
  const errors = vi.spyOn(console, "error");
  const client = createSSRApp(root).use(vuetify());
  client.mount(host);
  cleanups.push(() => {
    client.unmount();
    host.remove();
  });
  await settle();
  expect(host.querySelector(".v-checkbox-btn input")).not.toBeNull();
  expect(host.querySelector('table[role="grid"]')).not.toBeNull();
  expect(
    [...warnings.mock.calls, ...errors.mock.calls]
      .flat()
      .some((message) => String(message).includes("mismatch"))
  ).toBe(false);
});
