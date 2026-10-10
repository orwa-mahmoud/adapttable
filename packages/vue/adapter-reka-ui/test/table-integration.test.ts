import type { ColumnInput } from "@adapttable/vue";
import { useDataTableShell } from "@adapttable/vue/adapter";
import { Primitive } from "reka-ui";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createApp,
  createSSRApp,
  defineComponent,
  h,
  nextTick,
  shallowRef,
} from "vue";
import { renderToString } from "vue/server-renderer";

import { DataTable, type DataTableProps } from "../src";
import { rekaButton } from "../src/controls/basic";
import { densityChooser } from "../src/density";

interface Person {
  id: string;
  name: string;
  team: string;
}
const people: readonly Person[] = [
  { id: "b", name: "Bea", team: "Design" },
  { id: "a", name: "Ada", team: "Engineering" },
  { id: "c", name: "Cy", team: "Engineering" },
];
const columns: readonly ColumnInput<Person>[] = [
  { key: "name", header: "Name", sortable: true },
  { key: "team", header: "Team" },
];
const defaults: DataTableProps<Person> = {
  data: people,
  columns,
  rowKey: (row) => row.id,
  urlSync: false,
  forceMobile: false,
  searchDebounceMs: 0,
  paginationMode: "paged",
};
const cleanup: (() => void)[] = [];
afterEach(() => {
  cleanup
    .splice(0)
    .reverse()
    .forEach((stop) => stop());
  document.body.replaceChildren();
});
const part = (name: string) => `[data-adapttable-part="${name}"]`;
function element<T extends Element>(root: ParentNode, selector: string): T {
  const found = root.querySelector<T>(selector);
  if (!found) throw new Error(`Missing ${selector}`);
  return found;
}
function fixture(
  overrides: Partial<DataTableProps<Person>> = {},
  listeners: Record<string, unknown> = {}
) {
  const props = shallowRef({ ...defaults, ...overrides });
  const host = document.createElement("div");
  document.body.append(host);
  const app = createApp({
    setup: () => () => h(DataTable<Person>, { ...props.value, ...listeners }),
  });
  app.mount(host);
  cleanup.push(() => app.unmount());
  return { host, props };
}
async function flush() {
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 0));
  await nextTick();
}

describe("Reka table over the packed binding", () => {
  it("renders semantic desktop rows and drives the existing search and sort model", async () => {
    const { host } = fixture();
    const table = element<HTMLTableElement>(host, part("table"));
    expect(table.tagName).toBe("TABLE");
    expect(table.querySelectorAll("tbody tr")).toHaveLength(3);
    expect(
      host.querySelector('[data-adapttable-kit="reka-ui"]')
    ).not.toBeNull();
    const sort = element<HTMLButtonElement>(host, part("sort-button"));
    expect(sort.classList.contains("at-reka-button")).toBe(true);
    sort.click();
    await flush();
    expect(table.querySelector("tbody tr")?.textContent).toContain("Ada");
    const search = element<HTMLInputElement>(host, part("search"));
    search.value = "Cy";
    search.dispatchEvent(new Event("input", { bubbles: true }));
    await flush();
    expect(table.querySelectorAll("tbody tr")).toHaveLength(1);
    expect(table.textContent).toContain("Cy");
  });

  it("keeps controlled row selection rejected until the host accepts it", async () => {
    const changed = vi.fn();
    const { host, props } = fixture(
      { selectable: true, selectedIds: [] },
      { "onUpdate:selectedIds": changed }
    );
    const row = element<HTMLTableRowElement>(host, "tbody tr");
    const checkbox = element<HTMLButtonElement>(row, '[role="checkbox"]');
    checkbox.click();
    await flush();
    checkbox.click();
    await flush();
    expect(changed).toHaveBeenCalledTimes(2);
    expect(checkbox.getAttribute("aria-checked")).toBe("false");
    props.value = { ...props.value, selectedIds: ["b"] };
    await flush();
    expect(checkbox.getAttribute("aria-checked")).toBe("true");
  });

  it("uses real Reka combobox targets on mobile and never wraps their portal roots in labels", async () => {
    const { host } = fixture({
      forceMobile: true,
      features: [densityChooser()],
      dir: "rtl",
      classNames: { sortSelect: "custom-sort", rowsPerPage: "custom-limit" },
    });
    await flush();
    expect(host.querySelector(part("table"))).toBeNull();
    expect(host.querySelectorAll("article")).toHaveLength(3);
    for (const name of ["sort-select", "rows-per-page"]) {
      const trigger = element<HTMLButtonElement>(host, part(name));
      expect(trigger.getAttribute("role")).toBe("combobox");
      expect(trigger.tagName).toBe("BUTTON");
      expect(trigger.closest("label")).toBeNull();
      expect(trigger.getAttribute("aria-label")).toBeTruthy();
    }
    const density = element(host, part("density-toggle"));
    expect(density.getAttribute("role")).toBe("group");
    expect(density.getAttribute("aria-label")).toBeTruthy();
    expect(density.getAttribute("dir")).toBe("rtl");
    expect(density.querySelectorAll("button[aria-pressed]")).toHaveLength(2);
    expect(density.closest("label")).toBeNull();
    expect(density.textContent).toContain("Comfortable");
    expect(density.textContent).toContain("Compact");
    expect(
      element(host, part("sort-select")).classList.contains("custom-sort")
    ).toBe(true);
    expect(
      element(host, part("rows-per-page")).classList.contains("custom-limit")
    ).toBe(true);
    expect(
      element(host, '[data-adapttable-kit="reka-ui"]').getAttribute("dir")
    ).toBe("rtl");
  });

  it("hydrates the complete table without mismatch warnings", async () => {
    const render = defineComponent({
      setup: () => () =>
        h(DataTable<Person>, { ...defaults, selectable: true }),
    });
    const host = document.createElement("div");
    host.innerHTML = await renderToString(createSSRApp(render));
    document.body.append(host);
    const warning = vi.spyOn(console, "warn");
    const error = vi.spyOn(console, "error");
    const app = createSSRApp(render);
    app.mount(host);
    cleanup.push(() => app.unmount());
    await flush();
    const hydration = [...warning.mock.calls, ...error.mock.calls].filter(
      (args) => args.some((arg) => /hydration/i.test(String(arg)))
    );
    expect(hydration).toEqual([]);
    expect(host.querySelectorAll('tbody [role="checkbox"]')).toHaveLength(3);
  });

  it("allows a kit-owned layout to bypass DataTableSurfaceChrome entirely", async () => {
    const host = document.createElement("div");
    document.body.append(host);
    const app = createApp({
      setup() {
        const shell = useDataTableShell<Person>(() => defaults);
        return () =>
          h(
            Primitive,
            { as: "section", "data-testid": "headless-reka" },
            {
              default: () => [
                rekaButton(
                  { onClick: () => shell.table.setSearchValue("Ada") },
                  "Find Ada"
                ),
                h(
                  "ol",
                  shell.table.rows.value.map((row) =>
                    h("li", { key: row.id }, row.name)
                  )
                ),
              ],
            }
          );
      },
    });
    app.mount(host);
    cleanup.push(() => app.unmount());
    expect(host.querySelector(part("root"))).toBeNull();
    expect(host.querySelectorAll("li")).toHaveLength(3);
    element<HTMLButtonElement>(host, "button").click();
    await flush();
    expect(host.querySelectorAll("li")).toHaveLength(1);
    expect(host.textContent).toContain("Ada");
  });
});
