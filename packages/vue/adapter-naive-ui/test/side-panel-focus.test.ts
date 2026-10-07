import { DataTable, type DataTableClassNames } from "@adapttable/naive-ui";
import { sidePanel } from "@adapttable/naive-ui/side-panel";
import { defineComponent, h, KeepAlive, nextTick, shallowRef } from "vue";

import { find, mount, part } from "./filter-helpers";

interface Row {
  id: string;
  name: string;
}
const panels = [
  { key: "first", label: "First", content: "First content" },
  { key: "second", label: "Second", content: "Second content" },
];
async function ticks(count = 8) {
  for (let index = 0; index < count; index++) await nextTick();
}
function press(target: HTMLElement, key: string) {
  target.dispatchEvent(
    new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true })
  );
}
function fixture(dir: "ltr" | "rtl" = "ltr", accept = true) {
  const open = shallowRef<string | null>("first");
  const names = shallowRef<DataTableClassNames>({
    sidePanelTab: "initial-tab",
  });
  const shown = shallowRef(true);
  const requests = vi.fn((key: string | null) => {
    if (accept) open.value = key;
  });
  // Stable features plus a synchronous controlled callback reproduce the installed-pack failure.
  const features = shallowRef([
    sidePanel({ panels, open, onOpenChange: requests }),
  ]);
  const Table = defineComponent({
    setup: () => () =>
      h(DataTable<Row>, {
        data: [{ id: "a", name: "Ada" }],
        columns: [{ key: "name" }],
        rowKey: (row) => row.id,
        urlSync: false,
        searchable: false,
        dir,
        classNames: names.value,
        features: features.value,
      }),
  });
  const { host } = mount(() =>
    h("div", [
      h("button", { "data-outside": "" }, "Outside"),
      h(KeepAlive, null, { default: () => (shown.value ? h(Table) : null) }),
    ])
  );
  const tab = (index: number) => {
    const element = host
      .querySelectorAll<HTMLButtonElement>('[role="tab"]')
      .item(index);
    if (!element) throw new Error(`Missing side-panel tab ${index}`);
    return element;
  };
  return {
    host,
    open,
    names,
    shown,
    requests,
    features,
    tab,
    outside: find<HTMLButtonElement>(host, "[data-outside]"),
  };
}

it.each(["ltr", "rtl"] as const)(
  "hands focus to an accepted controlled native tab (%s)",
  async (dir) => {
    const f = fixture(dir);
    await ticks(5);
    const first = f.tab(0);
    const second = f.tab(1);
    first.focus();
    press(first, dir === "ltr" ? "ArrowRight" : "ArrowLeft");
    await ticks();
    expect(f.open.value).toBe("second");
    expect(first.getAttribute("aria-selected")).toBe("false");
    expect(second.getAttribute("aria-selected")).toBe("true");
    expect(document.activeElement).toBe(second);
    expect(second.classList.contains("n-button")).toBe(true);
    press(second, "Home");
    await ticks();
    expect(document.activeElement).toBe(first);
    expect(f.open.value).toBe("first");
    press(first, "End");
    await ticks();
    expect(document.activeElement).toBe(second);
    expect(f.open.value).toBe("second");
  }
);

it.each(["ltr", "rtl"] as const)(
  "preserves rejected selection while moving native keyboard focus (%s)",
  async (dir) => {
    const f = fixture(dir, false);
    await ticks(5);
    const first = f.tab(0);
    const second = f.tab(1);
    first.focus();
    press(first, dir === "ltr" ? "ArrowRight" : "ArrowLeft");
    await ticks();
    expect(f.requests).toHaveBeenCalledExactlyOnceWith("second");
    expect(f.open.value).toBe("first");
    expect(first.getAttribute("aria-selected")).toBe("true");
    expect(second.getAttribute("aria-selected")).toBe("false");
    expect(document.activeElement).toBe(second);
    expect(find(f.host, '[role="tabpanel"]').textContent).toBe("First content");
  }
);

it("updates class names without replacing the slot owner or cancelling accepted focus", async () => {
  const f = fixture();
  await ticks();
  f.requests.mockImplementation((key) => {
    f.open.value = key;
    f.names.value = {
      sidePanelTab: "updated-tab",
      sidePanelClose: "updated-close",
    };
  });
  f.tab(0).focus();
  press(f.tab(0), "ArrowRight");
  await ticks();
  expect(document.activeElement).toBe(f.tab(1));
  expect(f.tab(0).classList.contains("updated-tab")).toBe(true);
  expect(f.tab(1).classList.contains("updated-tab")).toBe(true);
  expect(
    find(f.host, part("side-panel-close")).classList.contains("updated-close")
  ).toBe(true);
});

it("cancels a queued handoff after model-owner replacement and accepts the replacement owner", async () => {
  const f = fixture();
  await ticks();
  const first = f.tab(0);
  first.focus();
  press(first, "ArrowRight");
  const replacementOpen = shallowRef<string | null>("first");
  const replacement = vi.fn((key: string | null) => {
    replacementOpen.value = key;
  });
  f.features.value = [
    sidePanel({ panels, open: replacementOpen, onOpenChange: replacement }),
  ];
  await ticks();
  expect(f.tab(0)).toBe(first);
  expect(document.activeElement).toBe(first);
  expect(replacement).not.toHaveBeenCalled();
  press(f.tab(0), "ArrowRight");
  await ticks();
  expect(replacement).toHaveBeenCalledExactlyOnceWith("second");
  expect(document.activeElement).toBe(f.tab(1));
});

it("retires queued focus and detached tab events across KeepAlive, then restores fresh navigation", async () => {
  const f = fixture();
  await ticks();
  const retained = f.tab(0);
  retained.focus();
  press(retained, "ArrowRight");
  f.shown.value = false;
  f.outside.focus();
  await ticks();
  expect(document.activeElement).toBe(f.outside);
  expect(retained.isConnected).toBe(false);
  const count = f.requests.mock.calls.length;
  press(retained, "ArrowRight");
  await ticks();
  expect(f.requests).toHaveBeenCalledTimes(count);
  f.shown.value = true;
  await ticks();
  press(retained, "ArrowRight");
  await ticks();
  expect(f.requests).toHaveBeenCalledTimes(count);
  expect(document.activeElement).toBe(f.outside);
  f.tab(1).focus();
  press(f.tab(1), "ArrowLeft");
  await ticks();
  expect(f.open.value).toBe("first");
  expect(document.activeElement).toBe(f.tab(0));
});

it("does not steal outside focus while an accepted keyboard handoff is queued", async () => {
  const f = fixture();
  await ticks();
  f.tab(0).focus();
  press(f.tab(0), "ArrowRight");
  f.outside.focus();
  await ticks();
  expect(f.open.value).toBe("second");
  expect(document.activeElement).toBe(f.outside);
});
