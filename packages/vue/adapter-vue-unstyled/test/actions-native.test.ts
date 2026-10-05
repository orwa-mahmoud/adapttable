import {
  type BulkAction,
  type ConfirmHandler,
  useFrontendData,
  useServerData,
} from "@adapttable/vue/adapter";
import { type ExportAllControls } from "@adapttable/vue/export-csv";
import { describe, expect, it, vi } from "vitest";
import { defineComponent, effectScope, h, KeepAlive, shallowRef } from "vue";

import { DataTable } from "../src";
import { bulkActions } from "../src/bulk-actions";
import { commandPalette } from "../src/command-palette";
import { contextMenu } from "../src/context-menu";
import { exportCsv } from "../src/export-csv";
import { pdfWriter } from "../src/export-pdf";
import { xlsxWriter } from "../src/export-xlsx";
import { print } from "../src/print";
import { sidePanel } from "../src/side-panel";
import {
  click,
  deferred,
  find,
  mountNative,
  part,
  tick,
  write,
} from "./filter-editing-helpers";
const rows = [
  { id: "a", name: "Ada" },
  { id: "g", name: "Grace" },
];
type Row = (typeof rows)[number];
const base = {
  data: rows,
  columns: [{ key: "name", sortable: true }],
  rowKey: (row: Row) => row.id,
  urlSync: false,
  searchable: false,
};
async function key(
  element: Element,
  key: string,
  more: KeyboardEventInit = {}
) {
  element.dispatchEvent(
    new KeyboardEvent("keydown", {
      key,
      bubbles: true,
      cancelable: true,
      ...more,
    })
  );
  await tick();
}
function at<T>(values: ArrayLike<T>, index: number): T {
  const value = values[index];
  if (value === undefined) throw new Error(`Missing item ${index}`);
  return value;
}
function server() {
  const scope = effectScope();
  const source = scope.run(() =>
    useServerData({ rows, total: 9, urlSync: false })
  );
  if (!source) throw new Error("No source");
  return { source, stop: () => scope.stop() };
}
describe("native action controls in the real DataTable", () => {
  it("keeps the base table free of optional action controls", async () => {
    const { host } = mountNative(() => h(DataTable<Row>, base));
    await tick();
    expect(
      host.querySelector(
        `${part("bulk-bar")},${part("command-palette-button")},${part("print-button")},${part("export-csv-button")}`
      )
    ).toBeNull();
  });
  it("runs bulk actions against current selection and all matching rows after host confirmation", async () => {
    const scope = effectScope();
    const source = scope.run(() =>
      useFrontendData({
        data: [
          ...rows,
          ...Array.from({ length: 7 }, (_, i) => ({
            id: `x${i}`,
            name: `Other ${i}`,
          })),
        ],
        columns: base.columns,
        defaults: { limit: 2 },
        urlSync: false,
      })
    );
    if (!source) throw new Error("No source");
    const remote = { source, stop: () => scope.stop() };
    const done = deferred<void>();
    const run = vi.fn(() => done.promise);
    let confirmation: Parameters<ConfirmHandler>[0] | undefined;
    const action: BulkAction = {
      key: "delete",
      label: "Delete selected",
      onClick: run,
      confirm: {
        title: "Delete",
        message: (count) => `Delete ${count}`,
        confirmLabel: "Delete",
        danger: true,
      },
    };
    const { host, stop } = mountNative(() =>
      h(DataTable<Row>, {
        ...base,
        data: undefined,
        source: remote.source.value,
        selectable: true,
        confirm: (request) => {
          confirmation = request;
        },
        features: [bulkActions([action])],
      })
    );
    await tick();
    find<HTMLInputElement>(host, "thead input").click();
    await tick();
    expect(find(host, part("select-all-banner")).textContent).toContain("9");
    await click(host, "select-all-button");
    await click(host, "bulk-button");
    expect(run).not.toHaveBeenCalled();
    expect(confirmation?.message).toBe("Delete 9");
    confirmation?.onConfirm();
    await tick();
    expect(run).toHaveBeenCalledWith(["a", "g"], {
      allMatching: true,
      total: 9,
    });
    expect(find<HTMLButtonElement>(host, part("bulk-button")).disabled).toBe(
      true
    );
    done.resolve();
    await tick();

    expect(host.querySelector(part("bulk-bar"))).toBeNull();
    stop();
    remote.stop();
  });
  it("shows disabled reasons and bulk rejection while the host retains its rows", async () => {
    let disabled = true;
    const run = vi
      .fn()
      .mockRejectedValueOnce(new Error("Host refused"))
      .mockResolvedValue(undefined);
    const action: BulkAction = {
      key: "run",
      label: "Run",
      onClick: run,
      disabledReason: () => (disabled ? "Blocked by host" : undefined),
    };
    const features = shallowRef([bulkActions([action])]);
    const { host } = mountNative(() =>
      h(DataTable<Row>, {
        ...base,
        selectable: true,
        defaultSelectedIds: ["a"],
        features: features.value,
      })
    );
    await tick();
    expect(find<HTMLButtonElement>(host, part("bulk-button")).title).toBe(
      "Blocked by host"
    );
    expect(find<HTMLButtonElement>(host, part("bulk-button")).disabled).toBe(
      true
    );
    disabled = false;
    features.value = [bulkActions([{ ...action }])];
    await tick();
    await click(host, "bulk-button");
    expect(find(host, part("bulk-error")).textContent).toContain(
      "Host refused"
    );
    await click(host, "bulk-button");
    expect(run).toHaveBeenCalledTimes(2);
    expect(host.querySelector(part("bulk-error"))).toBeNull();
    expect(rows).toHaveLength(2);
  });
  it("runs palette commands after removal and restores the button across a remapped shortcut", async () => {
    const run = vi.fn(() =>
      expect(host.querySelector('[role="dialog"]')).toBeNull()
    );
    const { host } = mountNative(() =>
      h(DataTable<Row>, {
        ...base,
        features: [
          commandPalette({
            button: true,
            shortcuts: [{ chord: "mod+j", command: "command-palette" }],
            commands: [{ key: "host", label: "Host action", onSelect: run }],
          }),
        ],
      })
    );
    await tick();
    const trigger = find(host, part("command-palette-button"));
    trigger.focus();
    await click(host, "command-palette-button");
    const input = find<HTMLInputElement>(host, part("command-input"));
    expect(document.activeElement).toBe(input);
    await write(input, "Host");
    expect(host.querySelectorAll('[role="option"]')).toHaveLength(1);
    await key(input, "Enter");
    expect(run).toHaveBeenCalledOnce();
    expect(document.activeElement).toBe(trigger);
    await key(trigger, "j", { ctrlKey: true });
    expect(host.querySelector('[role="dialog"]')).not.toBeNull();
    await key(find(host, part("command-input")), "Escape");
    expect(document.activeElement).toBe(trigger);
  });
  it("traps focus, handles empty results and obeys a controlled rejection", async () => {
    const open = shallowRef(false);
    const requests = vi.fn();
    const run = vi.fn();
    const { host } = mountNative(() =>
      h(DataTable<Row>, {
        ...base,
        features: [
          commandPalette({
            button: true,
            open,
            onOpenChange: requests,
            commands: [
              {
                key: "no",
                label: "Unavailable",
                disabled: true,
                onSelect: run,
              },
            ],
          }),
        ],
      })
    );
    await tick();
    await click(host, "command-palette-button");
    expect(requests).toHaveBeenLastCalledWith(true);
    expect(host.querySelector('[role="dialog"]')).toBeNull();
    open.value = true;
    await tick();
    const input = find<HTMLInputElement>(host, part("command-input"));
    await write(input, "Unavailable");
    await key(input, "Enter");
    expect(run).not.toHaveBeenCalled();
    await key(input, "Tab");
    expect(document.activeElement).toBe(input);
    await write(input, "zzzz");
    expect(find(host, part("command-empty")).textContent).toContain(
      "No matching"
    );
    await key(input, "ArrowDown");
    await key(input, "Escape");
    expect(requests).toHaveBeenLastCalledWith(false);
    expect(host.querySelector('[role="dialog"]')).not.toBeNull();
    open.value = false;
    await tick();
    expect(host.querySelector('[role="dialog"]')).toBeNull();
  });
  it.each([false, true])(
    "opens, navigates and dismisses context menus with restored focus; mobile=%s",
    async (mobile) => {
      const selected = vi.fn();
      const { host } = mountNative(() =>
        h(DataTable<Row>, {
          ...base,
          forceMobile: mobile,
          features: [
            contextMenu<Row>({
              items: (target) => [
                {
                  key: "host",
                  label: `Inspect ${target.kind}`,
                  onSelect: selected,
                },
              ],
            }),
          ],
        })
      );
      await tick();
      const cell = find(host, part(mobile ? "card-value" : "cell"));
      cell.tabIndex = 0;
      cell.focus();
      cell.dispatchEvent(
        new MouseEvent("contextmenu", {
          bubbles: true,
          cancelable: true,
          clientX: 10,
          clientY: 15,
        })
      );
      await tick();
      expect(find(host, '[role="menu"]').textContent).toContain("Inspect cell");
      expect(document.activeElement?.getAttribute("role")).toBe("menuitem");
      await key(find(host, '[role="menuitem"]'), "End");
      expect(document.activeElement?.textContent).toBe("Inspect cell");
      (document.activeElement as HTMLElement).click();
      await tick();
      expect(selected).toHaveBeenCalledOnce();
      expect(host.querySelector('[role="menu"]')).toBeNull();
      expect(document.activeElement).toBe(cell);
      await key(cell, "F10", { shiftKey: true });
      await key(find(host, '[role="menuitem"]'), "Escape");
      expect(document.activeElement).toBe(cell);
    }
  );
  it("scopes nested menus and dispatches current sort handlers", async () => {
    const { host } = mountNative(() =>
      h(DataTable<Row>, {
        ...base,
        features: [
          contextMenu<Row>({
            items: () => [
              { key: "parent", label: "Parent", onSelect: vi.fn() },
            ],
          }),
          sidePanel({
            panels: [
              {
                key: "nested",
                label: "Nested",
                content: () =>
                  h(DataTable<Row>, {
                    ...base,
                    features: [
                      contextMenu<Row>({
                        items: () => [
                          { key: "child", label: "Child", onSelect: vi.fn() },
                        ],
                      }),
                    ],
                  }),
              },
            ],
            open: "nested",
            onOpenChange: vi.fn(),
          }),
        ],
      })
    );
    await tick();
    const cells = host.querySelectorAll(part("cell"));
    cells
      .item(cells.length - 1)
      .dispatchEvent(
        new MouseEvent("contextmenu", { bubbles: true, cancelable: true })
      );
    await tick();
    expect(host.querySelectorAll('[role="menu"]')).toHaveLength(1);
    expect(find(host, '[role="menu"]').textContent).toContain("Child");
    expect(find(host, '[role="menu"]').textContent).not.toContain("Parent");
    await key(find(host, '[role="menuitem"]'), "Escape");
    find(host, part("header-cell")).dispatchEvent(
      new MouseEvent("contextmenu", { bubbles: true, cancelable: true })
    );
    await tick();
    [...host.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')]
      .find((button) => button.textContent === "Sort descending")
      ?.click();
    await tick();
    expect(find(host, part("cell")).textContent).toBe("Grace");
  });
  it("invalidates removed targets and cancels a touch timer when its feature disappears", async () => {
    vi.useFakeTimers();
    try {
      const features = shallowRef([contextMenu<Row>()]);
      const data = shallowRef(rows);
      const { host } = mountNative(() =>
        h(DataTable<Row>, {
          ...base,
          data: data.value,
          features: features.value,
        })
      );
      await tick();
      find(host, part("cell")).dispatchEvent(
        new MouseEvent("contextmenu", { bubbles: true, cancelable: true })
      );
      await tick();
      data.value = [];
      await tick();
      expect(host.querySelector('[role="menu"]')).toBeNull();
      data.value = rows;
      await tick();
      const touch = new Event("pointerdown", { bubbles: true });
      Object.defineProperties(touch, {
        pointerType: { value: "touch" },
        clientX: { value: 2 },
        clientY: { value: 2 },
      });
      find(host, part("cell")).dispatchEvent(touch);
      features.value = [];
      await tick();
      vi.advanceTimersByTime(600);
      await tick();
      expect(host.querySelector('[role="menu"]')).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
  it("uses RTL panel tabs, respects nested Escape, and stacks panels on mobile", async () => {
    const open = shallowRef<string | null>("one");
    const nested = shallowRef(false);
    const { host } = mountNative(() =>
      h(DataTable<Row>, {
        ...base,
        dir: "rtl",
        forceMobile: true,
        features: [
          sidePanel({
            panels: [
              {
                key: "one",
                label: "First",
                content: () =>
                  nested.value
                    ? h("div", { role: "dialog" }, [
                        h("input", { "data-test": "nested" }),
                      ])
                    : h("p", "One"),
              },
              { key: "two", label: "Second", content: h("p", "Two") },
            ],
            open,
            onOpenChange: (next) => {
              open.value = next;
            },
            side: "start",
          }),
        ],
      })
    );
    await tick();
    expect(find(host, part("table-region")).style.flexDirection).toBe("column");
    const tabs = host.querySelectorAll('[role="tab"]');
    (at(tabs, 0) as HTMLElement).focus();
    await key(at(tabs, 0), "ArrowLeft");
    expect(open.value).toBe("two");
    expect(document.activeElement?.textContent).toBe("Second");
    await key(at(tabs, 1), "Home");
    expect(open.value).toBe("one");
    nested.value = true;
    await tick();
    await key(find(host, '[data-test="nested"]'), "Escape");
    expect(open.value).toBe("one");
    nested.value = false;
    await tick();
    await key(find(host, part("side-panel-body")), "Escape");
    expect(host.querySelector(part("side-panel"))).toBeNull();
  });
  it("exports current selection through host callbacks and keeps print host-owned", async () => {
    const job = deferred<void>();
    const requests: unknown[] = [];
    const request = vi.fn((info: unknown) => {
      requests.push(info);
      return job.promise;
    });
    const printed = vi.fn();
    const selected = shallowRef<readonly string[]>(["g"]);
    const { host } = mountNative(() =>
      h(DataTable<Row>, {
        ...base,
        selectedIds: selected.value,
        features: [
          exportCsv<Row>({ scope: "selected", request }),
          print(printed, true),
        ],
      })
    );
    await tick();
    await click(host, "export-csv-button");
    expect(requests[0]).toMatchObject({ scope: "selected", rows: [rows[1]] });
    expect(
      find<HTMLButtonElement>(host, part("export-csv-button")).disabled
    ).toBe(true);
    await click(host, "print-button");
    expect(printed).toHaveBeenCalledOnce();
    job.resolve();
    await tick();
    expect(find(host, part("export-announcer")).textContent).toContain(
      "Export complete"
    );
    selected.value = ["a"];
    await tick();
    await click(host, "export-csv-button");
    expect(requests[1]).toMatchObject({ scope: "selected", rows: [rows[0]] });
  });
  it("reports server progress, cancels stale results, retries failures and returns focus locally", async () => {
    const jobs = [
      deferred<{ url: string }>(),
      deferred<{ url: string }>(),
      deferred<{ url: string }>(),
    ];
    let n = 0;
    const controls: ExportAllControls[] = [];
    const { host } = mountNative(() =>
      h(DataTable<Row>, {
        ...base,
        features: [
          exportCsv<Row>({
            scope: "all",
            onExportAll: (_query, control) => {
              controls.push(control);
              return at(jobs, n++).promise;
            },
          }),
        ],
      })
    );
    await tick();
    await click(host, "export-csv-button");
    at(controls, 0).setProgress?.(36);
    at(controls, 0).setMessage?.("36 rows");
    await tick();
    expect(find<HTMLProgressElement>(host, "progress").value).toBe(36);
    expect(host.textContent).toContain("36 rows");
    await click(host, "export-progress-cancel");
    expect(at(controls, 0).signal.aborted).toBe(true);
    at(jobs, 0).resolve({ url: "/stale.csv" });
    await tick();
    expect(host.querySelector("a[download]")).toBeNull();
    await click(host, "export-progress-dismiss");
    expect(document.activeElement).toBe(find(host, part("export-csv-button")));
    await click(host, "export-csv-button");
    at(jobs, 1).reject(new Error("Backend unavailable"));
    await tick();
    expect(host.textContent).toContain("Backend unavailable");
    await click(host, "export-progress-retry");
    at(jobs, 2).resolve({ url: "/report.csv" });
    await tick();
    expect(
      find<HTMLAnchorElement>(host, "a[download]").getAttribute("href")
    ).toBe("/report.csv");
    await click(host, "export-progress-dismiss");
    expect(host.querySelector(part("export-progress-surface"))).toBeNull();
  });
  it("disables unsupported all-row export and aborts jobs through KeepAlive", async () => {
    const remote = server();
    const busy = deferred<{ url: string }>();
    const controls: ExportAllControls[] = [];
    const shown = shallowRef(true);
    const features = shallowRef([exportCsv<Row>({ scope: "all" })]);
    const Table = defineComponent({
      setup: () => () =>
        h(DataTable<Row>, {
          ...base,
          data: undefined,
          source: remote.source.value,
          features: features.value,
        }),
    });
    const { host, stop } = mountNative(() =>
      h(KeepAlive, null, { default: () => (shown.value ? h(Table) : null) })
    );
    await tick();
    expect(
      find<HTMLButtonElement>(host, part("export-csv-button")).disabled
    ).toBe(true);
    expect(
      find<HTMLButtonElement>(host, part("export-csv-button")).title
    ).toBeTruthy();
    features.value = [
      exportCsv<Row>({
        scope: "all",
        onExportAll: (_query, control) => {
          controls.push(control);
          return busy.promise;
        },
      }),
    ];
    await tick();
    await click(host, "export-csv-button");
    shown.value = false;
    await tick();
    expect(at(controls, 0).signal.aborted).toBe(true);
    busy.resolve({ url: "/late.csv" });
    await tick();
    shown.value = true;
    await tick();
    expect(host.querySelector("a[download]")).toBeNull();
    expect(
      find<HTMLButtonElement>(host, part("export-csv-button")).disabled
    ).toBe(false);
    stop();
    remote.stop();
  });
  it("keeps explicit false features inert and exposes print and export palette commands without toolbar buttons", async () => {
    const printed = vi.fn();
    const requested = vi.fn();
    const features = shallowRef([
      commandPalette(false),
      contextMenu<Row>(false),
      exportCsv<Row>(false),
      print(printed),
    ]);
    const { host } = mountNative(() =>
      h(DataTable<Row>, { ...base, features: features.value })
    );
    await tick();
    expect(host.querySelector(part("toolbar"))).toBeNull();
    features.value = [
      commandPalette(),
      print(printed),
      exportCsv<Row>({ request: requested }),
    ];
    await tick();
    const root = find(host, part("root"));
    root.tabIndex = 0;
    root.focus();
    await key(root, "k", { ctrlKey: true });
    const input = find<HTMLInputElement>(host, part("command-input"));
    await write(input, "Print");
    await key(input, "Enter");
    expect(printed).toHaveBeenCalledOnce();
    await key(root, "k", { ctrlKey: true });
    await write(find<HTMLInputElement>(host, part("command-input")), "Export");
    await key(find(host, part("command-input")), "Enter");
    expect(requested).toHaveBeenCalledOnce();
  });
  it("navigates command options, preserves nested Escape ownership and dismisses outside", async () => {
    const { host } = mountNative(() =>
      h(DataTable<Row>, {
        ...base,
        features: [
          commandPalette({
            button: true,
            commands: [
              { key: "one", label: "First", onSelect: vi.fn() },
              { key: "two", label: "Second", onSelect: vi.fn() },
            ],
          }),
        ],
      })
    );
    await tick();
    await click(host, "command-palette-button");
    const input = find<HTMLInputElement>(host, part("command-input"));
    await key(input, "End");
    expect(input.getAttribute("aria-activedescendant")).toContain("two");
    await key(input, "ArrowDown");
    await key(input, "ArrowUp");
    await key(input, "Home");
    expect(input.getAttribute("aria-activedescendant")).toContain(
      "clear-filters"
    );
    const option = at(host.querySelectorAll('[role="option"]'), 1);
    option.dispatchEvent(new MouseEvent("mouseenter"));
    await tick();
    expect(input.getAttribute("aria-activedescendant")).toContain("one");
    await key(input, "Tab", { shiftKey: true });
    const nested = document.createElement("div");
    nested.setAttribute("role", "dialog");
    const nestedInput = document.createElement("input");
    nested.append(nestedInput);
    find(host, part("command-list")).append(nested);
    await key(nestedInput, "Escape");
    expect(host.querySelector(part("command-palette"))).not.toBeNull();
    nested.remove();
    document.body.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    await tick();
    expect(host.querySelector(part("command-palette"))).toBeNull();
  });
  it("uses native dialog and popover lifetimes, menu typeahead, wrapping and outside dismissal", async () => {
    const show = vi.fn(function (this: HTMLDialogElement) {
      this.open = true;
    });
    const close = vi.fn(function (this: HTMLDialogElement) {
      this.open = false;
    });
    Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
      value: show,
      configurable: true,
    });
    Object.defineProperty(HTMLDialogElement.prototype, "close", {
      value: close,
      configurable: true,
    });
    const pop = vi.fn();
    const hide = vi.fn();
    Object.defineProperty(HTMLElement.prototype, "showPopover", {
      value: pop,
      configurable: true,
    });
    Object.defineProperty(HTMLElement.prototype, "hidePopover", {
      value: hide,
      configurable: true,
    });
    try {
      const { host, stop } = mountNative(() =>
        h(DataTable<Row>, {
          ...base,
          features: [
            commandPalette({ button: true }),
            contextMenu<Row>({
              items: () => [
                { key: "one", label: "Alpha", onSelect: vi.fn() },
                { key: "two", label: "Beta", onSelect: vi.fn() },
                {
                  key: "no",
                  label: "Blocked",
                  disabled: true,
                  onSelect: vi.fn(),
                },
              ],
            }),
          ],
        })
      );
      await tick();
      await click(host, "command-palette-button");
      expect(show).toHaveBeenCalledOnce();
      find(host, part("command-palette")).dispatchEvent(
        new Event("cancel", { cancelable: true })
      );
      await tick();
      expect(close).toHaveBeenCalledOnce();
      find(host, part("cell")).dispatchEvent(
        new MouseEvent("contextmenu", { bubbles: true, cancelable: true })
      );
      await tick();
      expect(pop).toHaveBeenCalled();
      const menu = find(host, '[role="menu"]');
      await key(find(host, '[role="menuitem"]'), "ArrowDown");
      expect(document.activeElement?.textContent).toBe("Alpha");
      await key(find(host, '[role="menuitem"]'), "ArrowUp");
      await key(find(host, '[role="menuitem"]'), "Home");
      await key(find(host, '[role="menuitem"]'), "b");
      expect(document.activeElement?.textContent).toBe("Beta");
      await key(find(host, '[role="menuitem"]'), "F2");
      await key(menu, "Escape", { isComposing: true });
      expect(host.querySelector('[role="menu"]')).not.toBeNull();
      document.body.dispatchEvent(new Event("pointerdown", { bubbles: true }));
      await tick();
      expect(hide).toHaveBeenCalled();
      stop();
    } finally {
      Reflect.deleteProperty(HTMLDialogElement.prototype, "showModal");
      Reflect.deleteProperty(HTMLDialogElement.prototype, "close");
      Reflect.deleteProperty(HTMLElement.prototype, "showPopover");
      Reflect.deleteProperty(HTMLElement.prototype, "hidePopover");
    }
  });
  it("writes real opt-in PDF and XLSX bytes under the same exportCsv feature", async () => {
    const create = vi.fn(() => "blob:fixture");
    vi.stubGlobal(
      "URL",
      class extends URL {
        static override readonly createObjectURL = create;
        static override readonly revokeObjectURL = vi.fn();
      }
    );
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(
      () => undefined
    );
    try {
      for (const writer of [pdfWriter(), xlsxWriter()]) {
        const after = vi.fn();
        const { host, stop } = mountNative(() =>
          h(DataTable<Row>, {
            ...base,
            features: [exportCsv<Row>({ writer, onAfterExport: after })],
          })
        );
        await tick();
        expect(find(host, part("export-csv-button")).textContent).toContain(
          writer.extension.toUpperCase()
        );
        await click(host, "export-csv-button");
        expect(after).toHaveBeenCalledOnce();
        expect(after.mock.calls[0]?.[0].file.parts.length).toBeGreaterThan(0);
        stop();
      }
      expect(create).toHaveBeenCalledTimes(2);
    } finally {
      vi.unstubAllGlobals();
    }
  });
  it("renders a single static side panel and closes its native control", async () => {
    const open = shallowRef<string | null>("only");
    const { host } = mountNative(() =>
      h(DataTable<Row>, {
        ...base,
        features: [
          sidePanel({
            panels: [
              {
                key: "only",
                label: "Only panel",
                content: h("p", "Current content"),
              },
            ],
            open,
            onOpenChange: (next) => {
              open.value = next;
            },
          }),
        ],
      })
    );
    await tick();
    expect(host.querySelector('[role="tablist"]')).toBeNull();
    expect(find(host, part("table-region")).style.flexDirection).toBe("row");
    expect(find(host, part("side-panel-body")).getAttribute("aria-label")).toBe(
      "Only panel"
    );
    await click(host, "side-panel-close");
    expect(open.value).toBeNull();
  });
});
