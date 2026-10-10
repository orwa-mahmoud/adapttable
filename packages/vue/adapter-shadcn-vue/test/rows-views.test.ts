import { rowActions as bindingRowActions } from "@adapttable/vue/features";
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
import { rowActions } from "../src/row-actions";
import { rowPinning } from "../src/row-pinning";
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
  // Reka's native focus scope restores focus in its unmount timer.
  await vi.waitFor(() => expect(document.activeElement).toBe(trigger));
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

it("rejects a binding row-actions feature when the required kit control was omitted", async () => {
  const host = document.createElement("div");
  const app = createApp({
    render: () =>
      h(DataTable<Row>, {
        ...base,
        features: [
          bindingRowActions<Row>([
            { key: "inspect", label: "Inspect", onClick: vi.fn() },
          ]),
        ],
      }),
  });
  const failed = vi.fn();
  app.config.errorHandler = failed;
  app.mount(host);
  await flush();
  expect(failed).toHaveBeenCalledWith(
    expect.objectContaining({
      message:
        "AdaptTable: shadcn-vue row actions require the kit rowActions feature.",
    }),
    expect.anything(),
    expect.any(String)
  );
  app.unmount();
});

it.each([false, true])(
  "keeps row pinning controls optional and draws one merged action surface, explicit=%s",
  async (explicit) => {
    const change = vi.fn();
    const inspect = vi.fn();
    const host = mount(() =>
      h(DataTable<Row>, {
        ...base,
        features: [
          rowPinning({
            pinnedRowIds: { top: [], bottom: [] },
            onPinnedRowIdsChange: change,
          }),
          ...(explicit
            ? [
                rowActions<Row>([
                  { key: "inspect", label: "Inspect", onClick: inspect },
                ]),
              ]
            : []),
        ],
      })
    );
    await flush();
    const first = element<HTMLElement>("tbody tr", host);
    const pin = [...first.querySelectorAll<HTMLButtonElement>("button")].find(
      (button) => button.textContent?.includes("Pin to top")
    );
    if (!pin) throw new Error("Missing pin to top action");
    expect(
      [...first.querySelectorAll<HTMLButtonElement>("button")].filter(
        (button) => button.textContent?.includes("Pin to top")
      )
    ).toHaveLength(1);
    expect(pin.getAttribute("data-slot")).toBe("button");
    pin.click();
    await flush();
    expect(change).toHaveBeenCalledWith({ top: ["a"], bottom: [] });
    expect(first.getAttribute("data-pinned")).toBeNull();
    const actions = [
      ...first.querySelectorAll<HTMLButtonElement>("button"),
    ].filter((button) => button.textContent === "Inspect");
    expect(actions).toHaveLength(explicit ? 1 : 0);
    actions[0]?.click();
    expect(inspect).toHaveBeenCalledTimes(explicit ? 1 : 0);
  }
);
