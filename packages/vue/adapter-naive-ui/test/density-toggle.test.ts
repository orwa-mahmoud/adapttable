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
import { renderToString } from "vue/server-renderer";

import { DataTable } from "../src";
import { densityChooser } from "../src/density";

interface Row {
  id: string;
  name: string;
}
const base = {
  data: [{ id: "a", name: "Ada" }],
  columns: [{ key: "name" as const }],
  rowKey: (row: { id: string }) => row.id,
  urlSync: false,
  features: [densityChooser()],
};
const stops: (() => void)[] = [];
afterEach(() => {
  for (const stop of stops.splice(0)) stop();
});
function mount(render: () => ReturnType<typeof h>) {
  const host = document.createElement("div");
  document.body.append(host);
  const app = createApp(defineComponent({ setup: () => render }));
  app.mount(host);
  const stop = () => {
    app.unmount();
    host.remove();
  };
  stops.push(stop);
  return { host, stop };
}
function density(host: ParentNode) {
  const group = host.querySelector<HTMLElement>(
    '[data-adapttable-part="density-toggle"]'
  );
  if (!group) throw new Error("Missing density group");
  const controls = [
    ...group.querySelectorAll<HTMLButtonElement>("button[aria-pressed]"),
  ];
  expect(controls).toHaveLength(2);
  return { group, controls, comfortable: controls[0]!, compact: controls[1]! };
}

it.each([false, true])(
  "uses visible genuine buttons and preserves a rejected choice: %s",
  async (accept) => {
    const value = shallowRef<"comfortable" | "compact">("comfortable");
    const changed = vi.fn((next: "comfortable" | "compact") => {
      if (accept) value.value = next;
    });
    const { host } = mount(() =>
      h(DataTable<Row>, {
        ...base,
        density: value.value,
        onDensityChange: changed,
      })
    );
    await nextTick();
    const { group, comfortable, compact } = density(host);
    expect(group.getAttribute("role")).toBe("group");
    expect(group.getAttribute("aria-label")).toBe("Density");
    expect(group.textContent).toContain("Comfortable");
    expect(group.textContent).toContain("Compact");
    expect(group.querySelector('select,[role="combobox"]')).toBeNull();
    expect(group.classList.contains("n-button-group")).toBe(true);
    compact.focus();
    compact.click();
    await nextTick();
    expect(changed).toHaveBeenCalledExactlyOnceWith("compact");
    expect(compact.getAttribute("aria-pressed")).toBe(String(accept));
    expect(comfortable.getAttribute("aria-pressed")).toBe(String(!accept));
    expect(document.activeElement).toBe(compact);
    expect(
      host
        .querySelector('[data-adapttable-part="root"]')
        ?.getAttribute("data-density")
    ).toBe(accept ? "compact" : "comfortable");
  }
);

it.each(["ltr", "rtl"] as const)(
  "keeps both density options visible for mobile %s tables",
  async (dir) => {
    const { host } = mount(() =>
      h(DataTable<Row>, { ...base, forceMobile: true, dir })
    );
    await nextTick();
    const { group, compact } = density(host);
    expect(group.dir).toBe(dir);
    compact.click();
    await nextTick();
    expect(compact.getAttribute("aria-pressed")).toBe("true");
    expect(
      host
        .querySelector('[data-adapttable-part="root"]')
        ?.getAttribute("data-density")
    ).toBe("compact");
  }
);

it("gives separate tables distinct native groups", async () => {
  const a = mount(() => h(DataTable<Row>, base));
  const b = mount(() => h(DataTable<Row>, base));
  await nextTick();
  const first = density(a.host);
  const second = density(b.host);
  expect(first.group).not.toBe(second.group);
  first.compact.click();
  await nextTick();
  expect(second.comfortable.getAttribute("aria-pressed")).toBe("true");
});

it("hydrates the actual server buttons without replacement", async () => {
  const App = defineComponent({
    setup: () => () => h(DataTable<Row>, { ...base, density: "compact" }),
  });
  const host = document.createElement("div");
  document.body.append(host);
  host.innerHTML = await renderToString(createSSRApp(App));
  const before = density(host).controls;
  const app = createSSRApp(App);
  app.mount(host);
  stops.push(() => {
    app.unmount();
    host.remove();
  });
  await nextTick();
  const after = density(host).controls;
  expect(after[0]).toBe(before[0]);
  expect(after[1]).toBe(before[1]);
  expect(after[1]?.getAttribute("aria-pressed")).toBe("true");
});

it("retires cached density callbacks until the table is active again", async () => {
  const visible = shallowRef(true);
  const changed = vi.fn();
  const Table = defineComponent({
    setup: () => () => h(DataTable<Row>, { ...base, onDensityChange: changed }),
  });
  const { host } = mount(() =>
    h(KeepAlive, null, {
      default: () => (visible.value ? h(Table) : null),
    })
  );
  await nextTick();
  const { compact } = density(host);
  visible.value = false;
  await nextTick();
  expect(compact.isConnected).toBe(false);
  compact.click();
  await nextTick();
  expect(changed).not.toHaveBeenCalled();
  visible.value = true;
  await nextTick();
  expect(density(host).compact).toBe(compact);
  compact.click();
  await nextTick();
  expect(changed).toHaveBeenCalledExactlyOnceWith("compact");
});

it("requests nothing when the current density is chosen again", async () => {
  const changed = vi.fn();
  const { host } = mount(() =>
    h(DataTable<Row>, {
      ...base,
      density: "comfortable",
      onDensityChange: changed,
    })
  );
  await nextTick();
  const { comfortable } = density(host);
  expect(comfortable.getAttribute("aria-pressed")).toBe("true");
  comfortable.click();
  await nextTick();
  expect(changed).not.toHaveBeenCalled();
});
