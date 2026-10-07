import type { SavedView } from "@adapttable/vue";
import { defineComponent, h, KeepAlive, shallowRef } from "vue";

import { DataTable } from "../src";
import { savedViews, SavedViewsPanel } from "../src/saved-views";
import { sidePanel } from "../src/side-panel";
import { click, find, mount, part, tick, write } from "./editing-helpers";

const rows = [
  { id: "a", name: "Ada" },
  { id: "g", name: "Grace" },
];
type Row = (typeof rows)[number];
const base = {
  data: rows,
  columns: [{ key: "name" }],
  rowKey: (row: Row) => row.id,
  urlSync: false,
  searchable: false,
};
async function key(
  target: EventTarget,
  value: string,
  more: KeyboardEventInit = {}
) {
  const event = new KeyboardEvent("keydown", {
    key: value,
    code: value,
    bubbles: true,
    cancelable: true,
    ...more,
  });
  target.dispatchEvent(event);
  await tick();
  return event;
}
function storage(initial: readonly SavedView[] = []) {
  const values = new Map([["views", JSON.stringify(initial)]]);
  return {
    getItem: (name: string) => values.get(name) ?? null,
    setItem: (name: string, value: string) => {
      values.set(name, value);
    },
    removeItem: (name: string) => {
      values.delete(name);
    },
  };
}

it("uses native saved-view controls, input refs and real Escape focus restoration", async () => {
  const { host } = mount(() =>
    h(DataTable<Row>, {
      ...base,
      dir: "rtl",
      features: [savedViews({ storageKey: "views", storage: null })],
    })
  );
  await tick();
  const trigger = find<HTMLButtonElement>(host, part("views-button"));
  trigger.focus();
  await key(trigger, "ArrowDown");
  const panel = find(document, part("views-panel"));
  expect(panel.classList.contains("n-card")).toBe(true);
  expect(panel.getAttribute("dir")).toBe("rtl");
  expect(trigger.getAttribute("aria-controls")).toBe(panel.id);
  const input = find<HTMLInputElement>(panel, part("views-input"));
  expect(document.activeElement).toBe(input);
  expect(input.closest(".n-input")).not.toBeNull();
  await write(input, "Personal");
  await key(input, "Enter", { isComposing: true });
  expect(panel.querySelector(part("views-item"))).toBeNull();
  await key(input, "Enter");
  expect(
    find<HTMLButtonElement>(panel, part("views-item")).classList.contains(
      "n-button"
    )
  ).toBe(true);
  expect(input.value).toBe("");
  await key(input, "Escape");
  expect(document.activeElement).toBe(trigger);
  expect(trigger.getAttribute("aria-expanded")).toBe("false");
  await click(host, "views-button");
  await click(document, "views-item");
  expect(document.activeElement).toBe(trigger);
  await click(host, "views-button");
  await click(document, "views-delete");
  expect(document.querySelector(part("views-item"))).toBeNull();
});

it("protects read-only saved views and retires retained callbacks across KeepAlive", async () => {
  const visible = shallowRef(true);
  const saved = storage([
    { name: "Team", search: "", readOnly: true },
    { name: "Personal", search: "" },
  ]);
  const features = [savedViews({ storageKey: "views", storage: saved })];
  const View = defineComponent({
    setup: () => () => h(DataTable<Row>, { ...base, features }),
  });
  const { host } = mount(() =>
    h(KeepAlive, null, { default: () => (visible.value ? h(View) : null) })
  );
  await tick();
  await click(host, "views-button");
  const buttons = [
    ...document.querySelectorAll<HTMLButtonElement>(part("views-delete")),
  ];
  expect(buttons[0]?.disabled).toBe(true);
  const retained = buttons[1];
  if (!retained) throw new Error("Missing removable saved view");
  const input = find<HTMLInputElement>(document, part("views-input"));
  await write(input, "Team");
  expect(find<HTMLButtonElement>(document, part("views-save")).disabled).toBe(
    true
  );
  visible.value = false;
  await tick();
  retained.click();
  await tick();
  expect(saved.getItem("views")).toContain("Personal");
  visible.value = true;
  await tick();
  retained.click();
  await tick();
  expect(saved.getItem("views")).toContain("Personal");
  expect(document.querySelector(part("views-panel"))).toBeNull();
});

it("renders management rows with native rename input and preserves host rejection", async () => {
  const onRename = vi.fn();
  const onApply = vi.fn();
  const onMove = vi.fn();
  const onSetDefault = vi.fn();
  const onRemove = vi.fn();
  const views: SavedView[] = [
    { name: "Personal", search: "" },
    { name: "Team", search: "", readOnly: true, isDefault: true },
  ];
  const { host } = mount(() =>
    h(SavedViewsPanel, {
      views,
      onRename,
      onApply,
      onMove,
      onSetDefault,
      onRemove,
      footer: "Workspace views",
    })
  );
  await tick();
  expect(
    find(host, part("saved-views-panel")).classList.contains("n-card")
  ).toBe(true);
  expect(find(host, part("saved-views-footer")).textContent).toBe(
    "Workspace views"
  );
  const row = find(host, part("saved-view-row"));
  const rename = [...row.querySelectorAll<HTMLButtonElement>("button")].find(
    (button) => button.getAttribute("aria-label")?.includes("Rename")
  );
  if (!rename) throw new Error("Missing native rename control");
  rename.click();
  await tick();
  const input = find<HTMLInputElement>(row, "input");
  expect(document.activeElement).toBe(input);
  await write(input, "Renamed");
  await key(input, "Enter", { isComposing: true });
  expect(onRename).not.toHaveBeenCalled();
  await key(input, "Enter");
  expect(onRename).toHaveBeenCalledExactlyOnceWith("Personal", "Renamed");
  expect(row.textContent).toContain("Personal");
  const again = [...row.querySelectorAll<HTMLButtonElement>("button")].find(
    (button) => button.getAttribute("aria-label")?.includes("Rename")
  );
  if (!again) throw new Error("Missing current rename control");
  again.click();
  await tick();
  await key(find(row, "input"), "Escape");
  expect(onRename).toHaveBeenCalledTimes(1);
  expect(
    find(host, part("saved-view-readonly")).classList.contains("n-tag")
  ).toBe(true);
  expect(
    find(host, part("saved-view-default")).classList.contains("n-tag")
  ).toBe(true);
});

it("keeps side-panel tab state controlled and connects unique native tab targets", async () => {
  const open = shallowRef<string | null>("first");
  const requests = vi.fn();
  const panels = [
    { key: "first", label: "First", content: h("p", "First content") },
    { key: "second", label: "Second", content: h("p", "Second content") },
  ];
  const { host } = mount(() =>
    h(DataTable<Row>, {
      ...base,
      features: [sidePanel({ panels, open, onOpenChange: requests })],
    })
  );
  await tick();
  const frame = find(host, part("side-panel"));
  expect(frame.tagName).toBe("ASIDE");
  expect(frame.classList.contains("n-card")).toBe(true);
  const tabs = [...frame.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
  expect(tabs).toHaveLength(2);
  expect(tabs.every((tab) => tab.classList.contains("n-button"))).toBe(true);
  const first = tabs[0];
  const second = tabs[1];
  if (!first || !second) throw new Error("Missing native tabs");
  expect(first.getAttribute("aria-controls")).toBe(
    find(frame, '[role="tabpanel"]').id
  );
  first.focus();
  await key(first, "ArrowRight");
  expect(requests).toHaveBeenLastCalledWith("second");
  expect(first.getAttribute("aria-selected")).toBe("true");
  open.value = "second";
  await tick();
  expect(second.getAttribute("aria-selected")).toBe("true");
  expect(second.getAttribute("aria-controls")).toBe(
    find(frame, '[role="tabpanel"]').id
  );
  expect(frame.textContent).toContain("Second content");
  await click(host, "side-panel-close");
  expect(requests).toHaveBeenLastCalledWith(null);
  expect(host.querySelector(part("side-panel"))).toBe(frame);
  open.value = null;
  await tick();
  expect(host.querySelector(part("side-panel"))).toBeNull();
});

it("renders one static panel without tabs and retires stale close events", async () => {
  const active = shallowRef(true);
  const open = shallowRef<string | null>("only");
  const requests = vi.fn();
  const features = [
    sidePanel({
      panels: [
        { key: "only", label: "Only panel", content: "Current content" },
      ],
      open,
      onOpenChange: requests,
    }),
  ];
  const View = defineComponent({
    setup: () => () => h(DataTable<Row>, { ...base, features }),
  });
  const { host } = mount(() =>
    h(KeepAlive, null, { default: () => (active.value ? h(View) : null) })
  );
  await tick();
  expect(host.querySelector('[role="tablist"]')).toBeNull();
  expect(find(host, part("side-panel-body")).getAttribute("aria-label")).toBe(
    "Only panel"
  );
  const retained = find<HTMLButtonElement>(host, part("side-panel-close"));
  active.value = false;
  await tick();
  retained.click();
  expect(requests).not.toHaveBeenCalled();
  active.value = true;
  await tick();
  retained.click();
  expect(requests).not.toHaveBeenCalled();
});
