import type { ConfirmRequest, ExportAllControls } from "@adapttable/vue";
import {
  CONTEXT_MENU_CONTROL,
  type ContextMenuModel,
  featureSlotFillsOf,
  renderFeatureSlot,
  resolveLabels,
} from "@adapttable/vue/adapter";
import { renderToString } from "@vue/server-renderer";
import { afterEach, expect, it, vi } from "vitest";
import {
  createApp,
  createSSRApp,
  defineComponent,
  h,
  KeepAlive,
  nextTick,
  shallowRef,
} from "vue";

import { DataTable, type DataTableProps } from "../src";
import { ShadcnCommandDialog } from "../src/actions/CommandDialog";
import { bulkActions } from "../src/bulk-actions";
import { cellNavigation } from "../src/cell-navigation";
import { commandPalette } from "../src/command-palette";
import { contextMenu } from "../src/context-menu";
import { shadcnInput, shadcnSelect } from "../src/controls";
import { exportCsv as legacyExportCsv } from "../src/export";
import { exportCsv } from "../src/export-csv";
import { exportPdf } from "../src/export-pdf";
import { exportXlsx } from "../src/export-xlsx";
import { print } from "../src/print";
import { sidePanel } from "../src/side-panel";

const stops: (() => void)[] = [];
afterEach(() => {
  for (const stop of stops.splice(0)) {
    stop();
  }
  document.body.replaceChildren();
});
async function flush() {
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 25));
  await nextTick();
}
function element<T extends HTMLElement>(selector: string): T {
  const found = document.querySelector<T>(selector);
  if (!found) throw new Error(`Missing ${selector}`);
  return found;
}
const part = (name: string) => `[data-adapttable-part="${name}"]`;
async function key(target: HTMLElement, key: string) {
  target.dispatchEvent(
    new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true })
  );
  await flush();
}
const base = {
  data: [{ id: "a", name: "Ada" }],
  columns: [{ key: "name" }],
  rowKey: (row: { id: string }) => row.id,
  urlSync: false,
  forceMobile: false,
};
function mount(render: () => ReturnType<typeof h>) {
  const host = document.createElement("div");
  document.body.append(host);
  const app = createApp({ render });
  app.mount(host);
  stops.push(() => app.unmount());
  return host;
}
it("uses real Dialog/Primitive targets while binding preserves disabled active commands and rejected close", async () => {
  const open = shallowRef(false);
  const accept = shallowRef(false);
  const run = vi.fn();
  const disabled = vi.fn();
  const changed = vi.fn((value: boolean) => {
    if (value || accept.value) open.value = value;
  });
  const feature = commandPalette({
    button: true,
    open,
    onOpenChange: changed,
    commands: [
      {
        key: "blocked",
        label: "Custom blocked",
        disabled: true,
        onSelect: disabled,
      },
      { key: "run", label: "Custom run", onSelect: run },
    ],
  });
  const host = mount(() =>
    h(DataTable<{ id: string; name: string }>, {
      ...base,
      features: [feature],
      classNames: {
        commandInput: "consumer-command-input",
        commandItem: "consumer-command-item",
        commandPalette: "consumer-palette",
      },
    })
  );
  await flush();
  const trigger = element<HTMLButtonElement>(part("command-palette-button"));
  trigger.focus();
  trigger.click();
  await flush();
  const input = element<HTMLInputElement>(part("command-input"));
  const dialog = element(part("command-palette"));
  expect(input.tagName).toBe("INPUT");
  expect(input.getAttribute("data-slot")).toBe("input");
  expect(input.classList.contains("consumer-command-input")).toBe(true);
  expect(dialog.getAttribute("role")).toBe("dialog");
  expect(dialog.classList.contains("consumer-palette")).toBe(true);
  expect(host.contains(dialog)).toBe(false);
  expect(document.activeElement).toBe(input);
  input.value = "Custom";
  input.dispatchEvent(new Event("input", { bubbles: true }));
  await flush();
  const active = () =>
    document.getElementById(input.getAttribute("aria-activedescendant") ?? "");
  expect(active()?.textContent).toBe("Custom blocked");
  expect(active()?.getAttribute("aria-disabled")).toBe("true");
  await key(input, "Enter");
  expect(disabled).not.toHaveBeenCalled();
  await key(input, "Escape");
  expect(open.value).toBe(true);
  expect(document.activeElement).toBe(input);
  accept.value = true;
  await key(input, "ArrowDown");
  await key(input, "Enter");
  expect(run).toHaveBeenCalledTimes(1);
  expect(open.value).toBe(false);
  expect(document.activeElement).toBe(trigger);
});
it("retires command portals through KeepAlive and resumes the controlled owner without stealing external focus", async () => {
  const visible = shallowRef(true);
  const open = shallowRef(false);
  const feature = commandPalette({
    open,
    button: true,
    onOpenChange: (value) => {
      open.value = value;
    },
  });
  const Table = defineComponent({
    render: () =>
      h(DataTable<{ id: string; name: string }>, {
        ...base,
        features: [feature],
      }),
  });
  const Other = defineComponent({ render: () => h("p", "Paused") });
  mount(() =>
    h("div", [
      h("input", { id: "external-focus" }),
      h(KeepAlive, null, {
        default: () => (visible.value ? h(Table) : h(Other)),
      }),
    ])
  );
  await flush();
  element<HTMLButtonElement>(part("command-palette-button")).click();
  await flush();
  expect(document.querySelectorAll(part("command-palette"))).toHaveLength(1);
  visible.value = false;
  await nextTick();
  const outside = element<HTMLInputElement>("#external-focus");
  outside.focus();
  await flush();
  expect(document.querySelector(part("command-palette"))).toBeNull();
  expect(document.activeElement).toBe(outside);
  visible.value = true;
  await flush();
  expect(document.querySelectorAll(part("command-palette"))).toHaveLength(1);
  expect(document.activeElement).toBe(element(part("command-input")));
  await key(element(part("command-input")), "Escape");
  expect(open.value).toBe(false);
  expect(document.querySelector(part("command-palette"))).toBeNull();
});
it("uses styled Tabs with controlled selection, live RTL and Native Select values", async () => {
  const open = shallowRef<string | null>("a");
  const accept = shallowRef(false);
  const direction = shallowRef<"ltr" | "rtl">("ltr");
  const choice = shallowRef("one");
  const changed = vi.fn((value: string | null) => {
    if (accept.value) open.value = value;
  });
  const feature = sidePanel({
    open,
    onOpenChange: changed,
    panels: [
      {
        key: "a",
        label: "Alpha",
        content: () =>
          shadcnSelect({
            attrs: { "aria-label": "Panel choices" },
            value: choice.value,
            options: [
              { value: "one", label: "One" },
              { value: "two", label: "Two" },
            ],
            onChange: (value) => {
              choice.value = value;
            },
          }),
      },
      { key: "b", label: "Beta", content: "Beta body" },
    ],
  });
  mount(() =>
    h(DataTable<{ id: string; name: string }>, {
      ...base,
      dir: direction.value,
      features: [feature],
      classNames: {
        sidePanelTab: "consumer-tab",
        sidePanelBody: "consumer-panel",
      },
    })
  );
  await flush();
  const tabs = [
    ...document.querySelectorAll<HTMLButtonElement>(part("side-panel-tab")),
  ];
  tabs[0]?.focus();
  await key(tabs[0]!, "ArrowRight");
  expect(open.value).toBe("a");
  expect(changed).toHaveBeenLastCalledWith("b");
  accept.value = true;
  direction.value = "rtl";
  await flush();
  tabs[0]?.focus();
  await key(tabs[0]!, "ArrowLeft");
  expect(open.value).toBe("b");
  const panel = element('[role="tabpanel"][data-state="active"]');
  expect(panel.id).toBe(tabs[1]?.getAttribute("aria-controls"));
  expect(panel.textContent).toBe("Beta body");
  expect(panel.classList.contains("consumer-panel")).toBe(true);
  open.value = "a";
  await flush();
  const select = element<HTMLSelectElement>('[aria-label="Panel choices"]');
  expect(select.getAttribute("data-slot")).toBe("native-select");
  select.value = "two";
  select.dispatchEvent(new Event("change", { bubbles: true }));
  await flush();
  expect(choice.value).toBe("two");
  select.focus();
  await key(select, "Escape");
  expect(open.value).toBeNull();
  expect(document.querySelector(part("side-panel"))).toBeNull();
});

interface Row {
  id: string;
  name: string;
}
const rows: Row[] = [
  { id: "a", name: "Ada" },
  { id: "b", name: "Bea" },
];

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
function mountExport(options: () => Partial<DataTableProps<Row>>) {
  const host = document.createElement("div");
  document.body.append(host);
  const app = createApp({
    render: () =>
      h(DataTable<Row>, {
        data: rows,
        columns: [{ key: "name" }],
        rowKey: (row) => row.id,
        urlSync: false,
        forceMobile: false,
        ...options(),
      }),
  });
  app.mount(host);
  stops.push(() => app.unmount());
  return host;
}
function exportPart<T extends HTMLElement>(root: ParentNode, name: string): T {
  const target = root.querySelector<T>(`[data-adapttable-part="${name}"]`);
  if (!target) throw new Error(`Missing ${name}`);
  return target;
}
it("exports the current controlled selection and keeps print host-owned", async () => {
  const job = deferred<void>();
  const request = vi.fn(() => job.promise);
  const printed = vi.fn();
  const selected = shallowRef<readonly string[]>(["b"]);
  const features = [
    exportCsv<Row>({ scope: "selected", request }),
    print(printed, true),
  ];
  const host = mountExport(() => ({ selectedIds: selected.value, features }));
  await flush();
  exportPart(host, "export-csv-button").click();
  await flush();
  expect(request).toHaveBeenCalledWith(
    expect.objectContaining({ scope: "selected", rows: [rows[1]] })
  );
  expect(
    exportPart<HTMLButtonElement>(host, "export-csv-button").disabled
  ).toBe(true);
  exportPart(host, "print-button").click();
  expect(printed).toHaveBeenCalledTimes(1);
  job.resolve();
  await flush();
  expect(exportPart(host, "export-announcer").textContent).toContain(
    "Export complete"
  );
  selected.value = ["a"];
  await flush();
  exportPart(host, "export-csv-button").click();
  await flush();
  expect(request).toHaveBeenLastCalledWith(
    expect.objectContaining({ rows: [rows[0]] })
  );
});
it("uses shadcn-styled Progress for server jobs, cancels stale completion and retries a failed job", async () => {
  const first = deferred<{ url: string }>();
  const retry = deferred<{ url: string }>();
  const controls: ExportAllControls[] = [];
  const request = vi.fn((_query: unknown, control: ExportAllControls) => {
    controls.push(control);
    if (controls.length === 1) return first.promise;
    if (controls.length === 2) return Promise.reject(new Error("Try again"));
    return retry.promise;
  });
  const features = [exportCsv<Row>({ scope: "all", onExportAll: request })];
  const host = mountExport(() => ({ features }));
  await flush();
  exportPart(host, "export-csv-button").click();
  await flush();
  controls[0]?.setProgress?.(36);
  controls[0]?.setMessage?.("36 rows");
  await flush();
  const progress = exportPart(host, "export-progress-bar");
  expect(progress.getAttribute("role")).toBe("progressbar");
  expect(progress.getAttribute("aria-valuenow")).toBe("36");
  expect(host.textContent).toContain("36 rows");
  exportPart(host, "export-progress-cancel").click();
  await flush();
  expect(controls[0]?.signal.aborted).toBe(true);
  first.resolve({ url: "/stale.csv" });
  await flush();
  expect(host.querySelector("a[download]")).toBeNull();
  exportPart(host, "export-progress-dismiss").click();
  await flush();
  expect(document.activeElement).toBe(exportPart(host, "export-csv-button"));
  exportPart(host, "export-csv-button").click();
  await flush();
  expect(host.textContent).toContain("Try again");
  exportPart(host, "export-progress-retry").click();
  await flush();
  retry.resolve({ url: "/ready.csv" });
  await flush();
  expect(
    exportPart<HTMLAnchorElement>(
      host,
      "export-progress-download"
    ).getAttribute("href")
  ).toBe("/ready.csv");
});
it("runs a bulk action only after the host confirms and never mutates host rows", async () => {
  let confirmation: ConfirmRequest | undefined;
  const job = deferred<void>();
  const run = vi.fn(() => job.promise);
  const features = [
    bulkActions([
      {
        key: "archive",
        label: "Archive",
        onClick: run,
        confirm: {
          title: "Archive rows",
          message: () => "Archive the selected row?",
          confirmLabel: "Archive",
        },
      },
    ]),
  ];
  const host = mountExport(() => ({
    features,
    selectable: true,
    defaultSelectedIds: ["a"],
    confirm: (request) => {
      confirmation = request;
    },
  }));
  await flush();
  exportPart(host, "bulk-button").click();
  await flush();
  expect(run).not.toHaveBeenCalled();
  expect(confirmation?.title).toBe("Archive rows");
  confirmation?.onConfirm();
  await flush();
  expect(run).toHaveBeenCalledWith(
    ["a"],
    expect.objectContaining({ allMatching: false })
  );
  expect(exportPart<HTMLButtonElement>(host, "bulk-button").disabled).toBe(
    true
  );
  job.resolve();
  await flush();
  expect(rows.map((row) => row.id)).toEqual(["a", "b"]);
});

function mountContext() {
  const selected = vi.fn();
  const disabled = vi.fn();
  const host = document.createElement("div");
  document.body.append(host);
  const app = createApp({
    render: () =>
      h(DataTable<{ id: string; name: string }>, {
        data: [{ id: "a", name: "Ada" }],
        columns: [{ key: "name" }],
        rowKey: (row) => row.id,
        urlSync: false,
        forceMobile: false,
        dir: "rtl",
        features: [
          cellNavigation(),
          contextMenu<{ id: string; name: string }>({
            items: () => [
              {
                key: "disabled",
                label: "Unavailable",
                disabled: true,
                onSelect: disabled,
              },
              {
                key: "custom",
                label: "Inspect row",
                separatorBefore: true,
                onSelect: selected,
              },
            ],
          }),
        ],
        classNames: {
          contextMenu: "consumer-context",
          contextMenuItem: "consumer-context-item",
        },
      }),
  });
  app.mount(host);
  stops.push(() => app.unmount());
  return { host, selected, disabled, stop: () => app.unmount() };
}
it("uses shadcn-styled menu items, semantic disabled navigation, portal and return focus", async () => {
  const { host, selected, disabled } = mountContext();
  await flush();
  const cell = element<HTMLElement>('[data-adapttable-part="cell"]');
  cell.focus();
  await press(cell, "F10", { shiftKey: true });
  const menu = element('[data-adapttable-part="context-menu"]');
  expect(host.contains(menu)).toBe(false);
  expect(menu.getAttribute("role")).toBe("menu");
  expect(menu.getAttribute("data-slot")).toBe("context-menu-content");
  expect(menu.classList.contains("consumer-context")).toBe(true);
  expect(menu.getAttribute("dir")).toBe("rtl");
  const disabledItem = [
    ...menu.querySelectorAll<HTMLElement>('[role="menuitem"]'),
  ].find((item) => item.textContent === "Unavailable")!;
  expect(disabledItem.getAttribute("aria-disabled")).toBe("true");
  disabledItem.click();
  await flush();
  expect(disabled).not.toHaveBeenCalled();
  await key(menu, "End");
  expect(document.activeElement?.textContent).toBe("Inspect row");
  await key(document.activeElement as HTMLElement, "Enter");
  expect(selected).toHaveBeenCalledTimes(1);
  expect(
    document.querySelector('[data-adapttable-part="context-menu"]')
  ).toBeNull();
  expect(document.activeElement).toBe(cell);
});
it("dismisses the real portal with Escape and outside pointer, and retires on disposal", async () => {
  const { stop } = mountContext();
  await flush();
  const cell = element<HTMLElement>('[data-adapttable-part="cell"]');
  cell.focus();
  cell.dispatchEvent(
    new MouseEvent("contextmenu", {
      bubbles: true,
      cancelable: true,
      clientX: 30,
      clientY: 45,
    })
  );
  await flush();
  const anchor = element('[data-adapttable-part="context-menu-anchor"]');
  expect(anchor.style.left).toBe("30px");
  expect(anchor.style.top).toBe("45px");
  expect(anchor.querySelector('[data-state="open"]')).not.toBeNull();
  await key(element('[data-adapttable-part="context-menu"]'), "Escape");
  expect(
    document.querySelector('[data-adapttable-part="context-menu"]')
  ).toBeNull();
  expect(document.activeElement).toBe(cell);
  await key(cell, "ContextMenu");
  document.body.dispatchEvent(
    new MouseEvent("pointerdown", {
      bubbles: true,
      cancelable: true,
      button: 0,
    })
  );
  await flush();
  expect(
    document.querySelector('[data-adapttable-part="context-menu"]')
  ).toBeNull();
  await key(cell, "ContextMenu");
  expect(
    document.querySelector('[data-adapttable-part="context-menu"]')
  ).not.toBeNull();
  stop();
  stops.pop();
  await flush();
  expect(
    document.querySelector('[data-adapttable-part="context-menu"]')
  ).toBeNull();
});

async function press(
  target: HTMLElement,
  value: string,
  options: KeyboardEventInit
) {
  target.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: value,
      bubbles: true,
      cancelable: true,
      ...options,
    })
  );
  await flush();
}

it("renders mobile host side-panel content and keeps rejected closure controlled", async () => {
  const open = shallowRef<string | null>("detail");
  const content = shallowRef(false);
  const close = vi.fn();
  const host = mount(() =>
    h(DataTable<Row>, {
      ...base,
      forceMobile: true,
      dir: "rtl",
      classNames: {
        sidePanel: "consumer-side",
        sidePanelHeader: "consumer-header",
        sidePanelBody: "consumer-body",
        sidePanelClose: "consumer-close",
      },
      features: [
        sidePanel({
          open,
          onOpenChange: close,
          panels: [
            {
              key: "detail",
              label: "Details",
              content: content.value
                ? () => h("p", "Callable details")
                : "Static details",
            },
          ],
        }),
      ],
    })
  );
  await flush();
  expect(host.textContent).toContain("Static details");
  expect(host.querySelector('[role="tablist"]')).toBeNull();
  expect(element(part("side-panel")).getAttribute("dir")).toBe("rtl");
  expect(element(part("side-panel")).classList.contains("consumer-side")).toBe(
    true
  );
  content.value = true;
  await flush();
  expect(host.textContent).toContain("Callable details");
  const button = element<HTMLButtonElement>(part("side-panel-close"));
  expect(button.getAttribute("data-slot")).toBe("button");
  button.click();
  await flush();
  expect(close).toHaveBeenCalledWith(null);
  expect(host.querySelector(part("side-panel"))).not.toBeNull();
  open.value = null;
  await flush();
  expect(host.querySelector(part("side-panel"))).toBeNull();
});

it("shows an empty command search, dismisses outside, and removes the feature without retained controls", async () => {
  const enabled = shallowRef(true);
  const host = mount(() =>
    h(DataTable<Row>, {
      ...base,
      forceMobile: true,
      dir: "rtl",
      features: enabled.value ? [commandPalette({ button: true })] : [],
      classNames: {
        commandEmpty: "consumer-empty",
        commandPaletteButton: "consumer-command-trigger",
      },
    })
  );
  await flush();
  const button = element<HTMLButtonElement>(part("command-palette-button"));
  expect(button.getAttribute("data-slot")).toBe("button");
  button.click();
  await flush();
  const input = element<HTMLInputElement>(part("command-input"));
  input.value = "no command has this name";
  input.dispatchEvent(new Event("input", { bubbles: true }));
  await flush();
  expect(element(part("command-palette")).getAttribute("dir")).toBe("rtl");
  expect(
    element(part("command-empty")).classList.contains("consumer-empty")
  ).toBe(true);
  document.body.dispatchEvent(
    new MouseEvent("pointerdown", {
      bubbles: true,
      cancelable: true,
      button: 0,
    })
  );
  await flush();
  expect(document.querySelector(part("command-palette"))).toBeNull();
  button.click();
  await flush();
  enabled.value = false;
  await flush();
  expect(document.querySelector(part("command-palette"))).toBeNull();
  expect(host.querySelector(part("command-palette-button"))).toBeNull();
});

it.each([
  { factory: exportCsv, label: "Export CSV" },
  { factory: exportPdf, label: "Export PDF" },
  { factory: exportXlsx, label: "Export XLSX" },
])(
  "keeps $label opt-in and host-owned with deterministic shadcn SSR",
  async ({ factory, label }) => {
    expect(legacyExportCsv).toBe(exportCsv);
    const render = (enabled: boolean) =>
      renderToString(
        createSSRApp({
          render: () =>
            h(DataTable<Row>, {
              ...base,
              forceMobile: true,
              features: enabled ? [factory(), print(vi.fn(), true)] : [],
            }),
        })
      );
    const first = await render(true);
    expect(first).toBe(await render(true));
    expect(first).toContain('data-adapttable-part="export-csv-button"');
    expect(first).toContain('data-adapttable-part="print-button"');
    expect(first).toContain('data-slot="button"');
    expect(first).toContain(label);
    const absent = await render(false);
    expect(absent).not.toContain('data-adapttable-part="export-csv-button"');
    expect(absent).not.toContain('data-adapttable-part="print-button"');
    const enabled = shallowRef(false);
    const request = vi.fn(() => Promise.resolve());
    const host = mount(() =>
      h(DataTable<Row>, {
        ...base,
        features: [
          enabled.value ? factory<Row>({ request }) : factory(false),
          print(vi.fn()),
        ],
      })
    );
    await flush();
    expect(host.querySelector(part("export-csv-button"))).toBeNull();
    expect(host.querySelector(part("print-button"))).toBeNull();
    enabled.value = true;
    await flush();
    const button = element<HTMLButtonElement>(part("export-csv-button"));
    expect(button.textContent).toBe(label);
    expect(button.getAttribute("data-slot")).toBe("button");
    button.click();
    await flush();
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({ rows: base.data })
    );
    expect(request).toHaveBeenCalledTimes(1);
  }
);

it("opens a buttonless command palette from the table shortcut", async () => {
  const host = mount(() =>
    h(DataTable<Row>, { ...base, features: [commandPalette()] })
  );
  await flush();
  expect(host.querySelector(part("command-palette-button"))).toBeNull();
  element(part("cell")).dispatchEvent(
    new MouseEvent("pointerdown", { bubbles: true })
  );
  await press(element(part("cell")), "k", { ctrlKey: true });
  expect(element(part("command-palette")).getAttribute("role")).toBe("dialog");
  expect(document.activeElement).toBe(element(part("command-input")));
  await key(element(part("command-input")), "Escape");
  expect(document.querySelector(part("command-palette"))).toBeNull();
});

it.each(["button", "svg"] as const)(
  "uses a safe %s focus fallback in the native command Dialog and ignores retired dismissal",
  async (kind) => {
    const opener =
      kind === "button"
        ? document.createElement("button")
        : document.createElementNS("http://www.w3.org/2000/svg", "svg");
    opener.setAttribute("tabindex", "0");
    document.body.append(opener);
    const open = shallowRef(false);
    const current = shallowRef(true);
    const close = vi.fn(() => {
      open.value = false;
    });
    mount(() =>
      h(ShadcnCommandDialog, {
        open: open.value,
        isCurrent: () => current.value,
        getOpener: () => null,
        onClose: close,
        label: "Commands",
        dir: "ltr",
        children: shadcnInput({
          attrs: { "aria-label": "Search test commands" },
          value: "",
          onChange: vi.fn(),
        }),
      })
    );
    await flush();
    opener.focus();
    expect(document.activeElement).toBe(opener);
    open.value = true;
    await flush();
    const input = element<HTMLInputElement>(
      '[aria-label="Search test commands"]'
    );
    expect(document.activeElement).toBe(input);
    current.value = false;
    await flush();
    await key(input, "Escape");
    expect(close).not.toHaveBeenCalled();
    expect(document.querySelector(part("command-palette"))).not.toBeNull();
    current.value = true;
    await flush();
    await key(input, "Escape");
    expect(close).toHaveBeenCalledTimes(1);
    expect(document.querySelector(part("command-palette"))).toBeNull();
    if (kind === "button") expect(document.activeElement).toBe(opener);
    else expect(document.activeElement).not.toBe(opener);
  }
);

it("renders a standalone danger context action without caller classes and closes before selecting", async () => {
  const at = shallowRef<ContextMenuModel["at"]>({ x: 20, y: 30 });
  const selected = vi.fn();
  const items = [
    { key: "remove", label: "Remove row", danger: true, onSelect: selected },
  ];
  const fills = featureSlotFillsOf([contextMenu<Row>()]);
  const close = () => {
    at.value = null;
  };
  mount(() =>
    h(
      "div",
      renderFeatureSlot(CONTEXT_MENU_CONTROL, fills, {
        model: { at: at.value, items, close },
        labels: resolveLabels(undefined),
        dir: "ltr",
      })
    )
  );
  await flush();
  const item = element<HTMLElement>(part("context-menu-item"));
  expect(item.getAttribute("data-danger")).toBe("");
  expect(item.getAttribute("data-slot")).toBe("context-menu-item");
  item.focus();
  await key(item, "Enter");
  expect(at.value).toBeNull();
  expect(selected).toHaveBeenCalledTimes(1);
  expect(document.querySelector(part("context-menu"))).toBeNull();
});
