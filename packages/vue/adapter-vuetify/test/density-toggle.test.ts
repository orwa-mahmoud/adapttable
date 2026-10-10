import type { TableDensity } from "@adapttable/vue";
import {
  createApp,
  createSSRApp,
  h,
  nextTick,
  shallowRef,
  type VNode,
} from "vue";
import { renderToString } from "vue/server-renderer";
import { createVuetify } from "vuetify/framework";
import { aliases, mdi } from "vuetify/iconsets/mdi-svg";

import { DataTable } from "../src";
import { densityChooser } from "../src/density";

const cleanups: (() => void)[] = [];
function kit() {
  return createVuetify({
    ssr: true,
    icons: { defaultSet: "mdi", aliases, sets: { mdi } },
  });
}
function mount(render: () => VNode) {
  const host = document.createElement("div");
  document.body.append(host);
  const app = createApp({ setup: () => render }).use(kit());
  app.mount(host);
  cleanups.push(() => {
    app.unmount();
    host.remove();
  });
  return host;
}
afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
});
async function settle() {
  await nextTick();
  await nextTick();
}
function group(host: ParentNode): HTMLElement {
  const target = host.querySelector<HTMLElement>(
    '[data-adapttable-part="density-toggle"]'
  );
  if (!target) throw new Error("Missing density toggle");
  return target;
}
function buttons(host: ParentNode): [HTMLButtonElement, HTMLButtonElement] {
  const found = group(host).querySelectorAll<HTMLButtonElement>("button");
  const comfortable = found[0];
  const compact = found[1];
  if (found.length !== 2 || !comfortable || !compact)
    throw new Error("Density must expose two native buttons");
  return [comfortable, compact];
}
interface Row {
  id: string;
  name: string;
}
const base = {
  data: [{ id: "ada", name: "Ada" }],
  columns: [{ key: "name", header: "Name" }],
  rowKey: (row: Row) => row.id,
  urlSync: false,
  searchable: false,
  features: [densityChooser()],
};
it.each([
  { mobile: false, dir: "ltr" as const },
  { mobile: false, dir: "rtl" as const },
  { mobile: true, dir: "ltr" as const },
  { mobile: true, dir: "rtl" as const },
])(
  "keeps both density choices visible and controlled; mobile=$mobile dir=$dir",
  async ({ mobile, dir }) => {
    const density = shallowRef<TableDensity>("comfortable");
    const accept = shallowRef(false);
    const decoration = shallowRef("first");
    const changed = vi.fn((value: TableDensity) => {
      if (accept.value) density.value = value;
    });
    const emitted = vi.fn();
    const host = mount(() =>
      h(DataTable<Row>, {
        ...base,
        forceMobile: mobile,
        dir,
        density: density.value,
        onDensityChange: changed,
        "onUpdate:density": emitted,
        classNames: {
          densitySelect: "legacy-hook",
          densityToggle: decoration.value,
        },
      })
    );
    await settle();
    const chooser = group(host);
    expect(chooser.classList.contains("v-btn-toggle")).toBe(true);
    expect(chooser.classList.contains("legacy-hook")).toBe(true);
    expect(chooser.getAttribute("role")).toBe("group");
    expect(chooser.getAttribute("aria-label")).toBe("Density");
    expect(chooser.getAttribute("dir")).toBe(dir);
    expect(
      chooser.querySelector("select, [role=combobox], [role=listbox]")
    ).toBeNull();
    const [comfortable, compact] = buttons(host);
    for (const button of [comfortable, compact]) {
      expect(button.classList.contains("v-btn")).toBe(true);
      expect(button.type).toBe("button");
      expect(button.disabled).toBe(false);
      expect(button.tabIndex).toBe(0);
    }
    expect(comfortable.textContent).toContain("Comfortable");
    expect(compact.textContent).toContain("Compact");
    expect(comfortable.getAttribute("aria-pressed")).toBe("true");
    expect(compact.getAttribute("aria-pressed")).toBe("false");
    compact.focus();
    compact.click();
    await settle();
    expect(changed).toHaveBeenCalledExactlyOnceWith("compact");
    expect(emitted).toHaveBeenCalledExactlyOnceWith("compact");
    expect(density.value).toBe("comfortable");
    expect(comfortable.getAttribute("aria-pressed")).toBe("true");
    expect(compact.getAttribute("aria-pressed")).toBe("false");
    expect(compact.classList.contains("v-btn--active")).toBe(false);
    decoration.value = "second";
    await settle();
    expect(buttons(host)[1]).toBe(compact);
    expect(document.activeElement).toBe(compact);
    expect(group(host).classList.contains("second")).toBe(true);
    accept.value = true;
    compact.click();
    await settle();
    expect(changed).toHaveBeenCalledTimes(2);
    expect(emitted).toHaveBeenCalledTimes(2);
    expect(density.value).toBe("compact");
    expect(compact.getAttribute("aria-pressed")).toBe("true");
    expect(compact.classList.contains("v-btn--active")).toBe(true);
    expect(comfortable.getAttribute("aria-pressed")).toBe("false");
    if (!mobile)
      expect(host.querySelector(".v-table--density-compact")).not.toBeNull();
    compact.click();
    await settle();
    expect(changed).toHaveBeenCalledTimes(2);
    comfortable.click();
    await settle();
    expect(density.value).toBe("comfortable");
    expect(changed).toHaveBeenCalledTimes(3);
    expect(emitted).toHaveBeenCalledTimes(3);
    expect(comfortable.getAttribute("aria-pressed")).toBe("true");
    if (!mobile)
      expect(host.querySelector(".v-table--density-compact")).toBeNull();
  }
);
it.each(["comfortable", "compact"] as const)(
  "server-renders localized density buttons with %s selected",
  async (density) => {
    const changed = vi.fn();
    const html = await renderToString(
      createSSRApp({
        render: () =>
          h(DataTable<Row>, {
            ...base,
            forceMobile: false,
            dir: "rtl",
            density,
            onDensityChange: changed,
            labels: {
              density: "كثافة",
              densityComfortable: "مريح",
              densityCompact: "مضغوط",
            },
          }),
      }).use(kit())
    );
    const host = document.createElement("div");
    host.innerHTML = html;
    const chooser = group(host);
    expect(chooser.getAttribute("aria-label")).toBe("كثافة");
    expect(chooser.getAttribute("dir")).toBe("rtl");
    const [comfortable, compact] = buttons(host);
    expect(comfortable.textContent).toContain("مريح");
    expect(compact.textContent).toContain("مضغوط");
    expect(comfortable.getAttribute("aria-pressed")).toBe(
      String(density === "comfortable")
    );
    expect(compact.getAttribute("aria-pressed")).toBe(
      String(density === "compact")
    );
    expect(changed).not.toHaveBeenCalled();
  }
);
