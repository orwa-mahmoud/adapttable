import type { TableFeature } from "@adapttable/vue";
import { afterEach, expect, it, vi } from "vitest";
import {
  createApp,
  defineComponent,
  h,
  KeepAlive,
  nextTick,
  shallowRef,
} from "vue";

import { DataTable, type DataTableProps } from "../src";
import { densityChooser } from "../src/density";
import { exportPdf } from "../src/export-pdf";
import { exportXlsx } from "../src/export-xlsx";
import { rowActions } from "../src/row-actions";
import { type SavedView, SavedViewsPanel } from "../src/saved-views";

interface Row {
  id: string;
  name: string;
}
const rows: Row[] = [
  { id: "a", name: "Ada" },
  { id: "b", name: "Grace" },
];
const base: DataTableProps<Row> = {
  data: rows,
  columns: [{ key: "name" }],
  rowKey: (row) => row.id,
  urlSync: false,
  forceMobile: false,
};
const stops: (() => void)[] = [];
afterEach(() => {
  for (const stop of stops.splice(0)) {
    stop();
  }
  document.body.replaceChildren();
});
async function flush() {
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 20));
  await nextTick();
}
const part = (name: string) => `[data-adapttable-part="${name}"]`;
function element<T extends HTMLElement>(
  selector: string,
  root: ParentNode = document
): T {
  const found = root.querySelector<T>(selector);
  if (!found) throw new Error(`Missing ${selector}`);
  return found;
}
async function key(
  target: HTMLElement,
  value: string,
  options: KeyboardEventInit = {}
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
function mount(render: () => ReturnType<typeof h>) {
  const host = document.createElement("div");
  document.body.append(host);
  const app = createApp({ render });
  app.mount(host);
  stops.push(() => app.unmount());
  return host;
}
it.each([false, true])(
  "renders semantic loading placeholders and restores content in mobile=%s",
  async (mobile) => {
    const loading = shallowRef(true);
    const skeletonRows = shallowRef(2);
    const host = mount(() =>
      h(DataTable<Row>, {
        ...base,
        data: loading.value ? [] : rows,
        isLoading: loading.value,
        forceMobile: mobile,
        skeletonRows: skeletonRows.value,
        classNames: {
          loadingLine: "consumer-loading-line",
          loadingRow: "consumer-loading-row",
          loadingCard: "consumer-loading-card",
        },
      })
    );
    await flush();
    const surface = element(
      part(mobile ? "loading-cards" : "loading-table"),
      host
    );
    expect(surface.getAttribute("aria-hidden")).toBe("true");
    expect(
      host.querySelectorAll(part(mobile ? "loading-card" : "loading-row"))
    ).toHaveLength(2);
    expect(
      element(part("loading-line"), host).classList.contains(
        "consumer-loading-line"
      )
    ).toBe(true);
    skeletonRows.value = Number.NaN;
    await flush();
    expect(
      host.querySelectorAll(part(mobile ? "loading-card" : "loading-row"))
    ).toHaveLength(0);
    loading.value = false;
    await flush();
    expect(
      host.querySelector(part(mobile ? "loading-cards" : "loading-table"))
    ).toBeNull();
    expect(host.textContent).toContain("Ada");
  }
);
it("requests density through visible controlled toggle buttons", async () => {
  const changed = vi.fn();
  const host = mount(() =>
    h(DataTable<Row>, {
      ...base,
      density: "comfortable",
      onDensityChange: changed,
      features: [densityChooser()],
    })
  );
  await flush();
  const group = element(part("density-toggle"), host);
  expect(group.getAttribute("role")).toBe("group");
  const choices = [...group.querySelectorAll<HTMLButtonElement>("button")];
  expect(choices.map((choice) => choice.textContent)).toEqual([
    "Comfortable",
    "Compact",
  ]);
  const compact = choices[1];
  if (!compact) throw new Error("Missing Compact");
  compact.focus();
  compact.click();
  await flush();
  expect(changed).toHaveBeenCalledExactlyOnceWith("compact");
  expect(choices[0]?.getAttribute("aria-pressed")).toBe("true");
  expect(compact.getAttribute("aria-pressed")).toBe("false");
  expect(document.activeElement).toBe(compact);
});
it("renders native row action targets, menu disabled semantics and guarded host requests", async () => {
  const chosen = vi.fn();
  const denied = vi.fn();
  const layout = shallowRef<"buttons" | "menu">("buttons");
  const feature = rowActions<Row>([
    { key: "inspect", label: "Inspect", onClick: chosen },
    {
      key: "disabled",
      label: "Unavailable",
      isDisabled: () => true,
      onClick: denied,
    },
  ]);
  const host = mount(() =>
    h(DataTable<Row>, {
      ...base,
      rowActionsLayout: layout.value,
      features: [feature],
      classNames: {
        actionButton: "consumer-action",
        rowActionsTrigger: "consumer-menu-trigger",
      },
    })
  );
  await flush();
  const inline = [...host.querySelectorAll<HTMLButtonElement>("button")].find(
    (button) => button.textContent === "Inspect"
  );
  if (!inline) throw new Error("Missing inline action");
  expect(inline.classList.contains("consumer-action")).toBe(true);
  inline.click();
  await flush();
  expect(chosen).toHaveBeenCalledExactlyOnceWith(rows[0]);
  layout.value = "menu";
  await flush();
  const trigger = element<HTMLButtonElement>(part("row-actions-trigger"), host);
  trigger.focus();
  trigger.click();
  await flush();
  const menu = element('[role="menu"]');
  expect(host.contains(menu)).toBe(false);
  const disabled = [
    ...menu.querySelectorAll<HTMLElement>('[role="menuitem"]'),
  ].find((item) => item.textContent === "Unavailable");
  expect(disabled?.getAttribute("aria-disabled")).toBe("true");
  disabled?.click();
  expect(denied).not.toHaveBeenCalled();
  await key(menu, "Home");
  await key(document.activeElement as HTMLElement, "Enter");
  expect(chosen).toHaveBeenCalledTimes(2);
  expect(document.querySelector('[role="menu"]')).toBeNull();
  expect(document.activeElement).toBe(trigger);
});
it("retires an open row-actions portal when its table is deactivated", async () => {
  const visible = shallowRef(true);
  const clicked = vi.fn();
  const feature = rowActions<Row>([
    { key: "run", label: "Run", onClick: clicked },
  ]);
  const Table = defineComponent({
    render: () =>
      h(DataTable<Row>, {
        ...base,
        rowActionsLayout: "menu",
        features: [feature],
      }),
  });
  const Other = defineComponent({ render: () => h("p", "Paused") });
  mount(() =>
    h("div", [
      h("input", { id: "row-action-outside" }),
      h(KeepAlive, null, {
        default: () => (visible.value ? h(Table) : h(Other)),
      }),
    ])
  );
  await flush();
  element<HTMLButtonElement>(part("row-actions-trigger")).click();
  await flush();
  const old = element<HTMLElement>('[role="menuitem"]');
  visible.value = false;
  await nextTick();
  const outside = element<HTMLInputElement>("#row-action-outside");
  outside.focus();
  await flush();
  expect(document.querySelector('[role="menu"]')).toBeNull();
  expect(document.activeElement).toBe(outside);
  old.click();
  await flush();
  expect(clicked).not.toHaveBeenCalled();
  visible.value = true;
  await flush();
  expect(document.querySelector('[role="menu"]')).toBeNull();
});
it.each([exportPdf, exportXlsx])(
  "keeps optional document export requests host-owned",
  async (factory) => {
    const request = vi.fn(() => Promise.resolve());
    const feature: TableFeature<Row> = factory<Row>({ request });
    const host = mount(() =>
      h(DataTable<Row>, { ...base, features: [feature] })
    );
    await flush();
    element<HTMLButtonElement>(part("export-csv-button"), host).click();
    await flush();
    expect(request).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledWith(expect.objectContaining({ rows }));
    expect(rows[0]?.name).toBe("Ada");
  }
);
it("manages saved views with controlled rename, cancellation, read-only and empty states", async () => {
  const views = shallowRef<readonly SavedView[]>([
    { name: "Personal", search: "", isDefault: true },
    { name: "Shared", search: "", readOnly: true },
  ]);
  const footer = shallowRef<string | undefined>("Stored by your app");
  const apply = vi.fn();
  const rename = vi.fn();
  const move = vi.fn();
  const setDefault = vi.fn();
  const remove = vi.fn();
  const host = mount(() =>
    h(SavedViewsPanel, {
      views: views.value,
      onApply: apply,
      onRename: rename,
      onMove: move,
      onSetDefault: setDefault,
      onRemove: remove,
      footer: footer.value,
      classNames: {
        viewsInput: "consumer-view-input",
        viewsPanel: "consumer-views",
      },
    })
  );
  await flush();
  expect(host.textContent).toContain("Stored by your app");
  expect(host.textContent).toContain("Shared");
  const row = element(part("saved-view-row"), host);
  const buttons = [...row.querySelectorAll<HTMLButtonElement>("button")];
  buttons[0]?.click();
  expect(apply).toHaveBeenCalledExactlyOnceWith("Personal");
  buttons[1]?.click();
  await flush();
  const input = element<HTMLInputElement>("input", row);
  expect(document.activeElement).toBe(input);
  expect(input.classList.contains("consumer-view-input")).toBe(true);
  input.value = "Renamed";
  input.dispatchEvent(new Event("input", { bubbles: true }));
  await flush();
  await key(input, "Enter", { isComposing: true });
  expect(rename).not.toHaveBeenCalled();
  await key(input, "Enter");
  expect(rename).toHaveBeenCalledExactlyOnceWith("Personal", "Renamed");
  const controls = [...row.querySelectorAll<HTMLButtonElement>("button")];
  controls[1]?.click();
  await flush();
  await key(element("input", row), "Escape");
  expect(row.querySelector("input")).toBeNull();
  controls[3]?.click();
  controls[4]?.click();
  controls[5]?.click();
  await flush();
  expect(move).toHaveBeenCalledWith("Personal", 1);
  expect(setDefault).toHaveBeenCalledWith("Personal");
  expect(remove).toHaveBeenCalledWith("Personal");
  const shared = host.querySelectorAll(part("saved-view-row"))[1];
  expect(shared?.querySelectorAll("button:disabled").length).toBe(5);
  views.value = [];
  footer.value = undefined;
  await flush();
  expect(host.querySelectorAll(part("saved-view-row"))).toHaveLength(0);
  expect(host.textContent).not.toContain("Stored by your app");
});
