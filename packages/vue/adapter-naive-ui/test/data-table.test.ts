import type { ColumnDef } from "@adapttable/vue";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createApp,
  createSSRApp,
  defineComponent,
  h,
  nextTick,
  shallowRef,
  type VNode,
} from "vue";
import { renderToString } from "vue/server-renderer";

import { DataTable } from "../src";
import { naiveClassNames } from "../src/classNames";

interface Row {
  id: string;
  name: string;
  team: string;
}
const rows: readonly Row[] = [
  { id: "bea", name: "Bea", team: "Design" },
  { id: "ada", name: "Ada", team: "Core" },
];
const columns: readonly ColumnDef<Row>[] = [
  { key: "name", sortable: true },
  { key: "team", sortable: true },
];
const base = {
  data: rows,
  columns,
  rowKey: (row: Row) => row.id,
  urlSync: false,
  searchDebounceMs: 0,
};
const cleanups: (() => void)[] = [];
function mount(render: () => VNode) {
  const host = document.createElement("div");
  document.body.append(host);
  const app = createApp(defineComponent({ setup: () => render }));
  app.mount(host);
  cleanups.push(() => {
    app.unmount();
    host.remove();
  });
  return host;
}
afterEach(() => {
  cleanups.splice(0).forEach((cleanup) => cleanup());
  vi.restoreAllMocks();
});

describe("Naive DataTable optional shared outer layout", () => {
  it("keeps user column widths as native table floors while preserving declared bounds", async () => {
    const widths = shallowRef({ name: 216 });
    const host = mount(() =>
      h(DataTable<Row>, {
        ...base,
        forceMobile: false,
        columns: [
          { key: "name", width: 200, minWidth: 200 },
          { key: "team", width: 150, minWidth: 120 },
        ],
        columnWidths: widths.value,
      })
    );
    const name = () => [
      ...host.querySelectorAll<HTMLElement>('[data-column-key="name"]'),
    ];
    expect(name()).toHaveLength(3);
    expect(name().every((cell) => cell.style.minWidth === "216px")).toBe(true);
    expect(
      host.querySelector<HTMLElement>('th[data-column-key="team"]')?.style
        .minWidth
    ).toBe("120px");
    widths.value = { name: 180 };
    await nextTick();
    expect(name().every((cell) => cell.style.minWidth === "200px")).toBe(true);
  });
  it("uses native kit table paint, shared search/sort state and one scroll owner", async () => {
    const host = mount(() =>
      h(DataTable<Row>, {
        ...base,
        forceMobile: false,
        id: "people",
        class: "host-root",
        tableLabel: "Team people",
        classNames: { root: "configured-root", searchInput: "host-search" },
      })
    );
    const root = host.querySelector('[data-adapttable-part="root"]')!;
    expect(root.id).toBe("people");
    expect(root.classList.contains("host-root")).toBe(true);
    expect(root.classList.contains("configured-root")).toBe(true);
    expect(
      host.querySelectorAll('[data-adapttable-part="scroll-box"]')
    ).toHaveLength(1);
    expect(host.querySelectorAll("table.n-table")).toHaveLength(1);
    expect(host.querySelector(".n-data-table")).toBeNull();
    expect(host.querySelector("table")!.getAttribute("aria-label")).toBe(
      "Team people"
    );
    const sort = host.querySelector<HTMLButtonElement>(
      '[data-adapttable-part="sort-button"]'
    )!;
    expect(sort.classList.contains("n-button")).toBe(true);
    sort.click();
    await nextTick();
    expect(host.querySelector("tbody tr")!.textContent).toContain("Ada");
    const search = host.querySelector<HTMLInputElement>(
      '[data-adapttable-part="search"]'
    )!;
    expect(search.tagName).toBe("INPUT");
    expect(search.type).toBe("search");
    expect(search.getAttribute("role")).toBe("searchbox");
    expect(search.classList.contains("host-search")).toBe(true);
    search.value = "Bea";
    search.dispatchEvent(new InputEvent("input", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 5));
    await nextTick();
    expect(host.querySelectorAll("tbody tr")).toHaveLength(1);
    expect(host.querySelector("tbody tr")!.textContent).toContain("Bea");
  });

  it.each([false, true])(
    "honors controlled selection and kit RTL paint (mobile=%s)",
    async (mobile) => {
      const selected = shallowRef<string[]>([]);
      const host = mount(() =>
        h(DataTable<Row>, {
          ...base,
          forceMobile: mobile,
          dir: "rtl",
          selectable: true,
          selectedIds: selected.value,
          "onUpdate:selectedIds": (ids) => {
            selected.value = ids;
          },
        })
      );
      const targets = host.querySelectorAll<HTMLElement>('[role="checkbox"]');
      targets[targets.length - 1]!.click();
      await nextTick();
      expect(selected.value).toEqual(["ada"]);
      expect(
        host.querySelector('[data-adapttable-part="root"]')!.getAttribute("dir")
      ).toBe("rtl");
      if (mobile)
        expect(
          host
            .querySelector('[data-adapttable-part="card"]')!
            .classList.contains("n-card")
        ).toBe(true);
      else
        expect(
          host.querySelector("table")!.classList.contains("n-table--rtl")
        ).toBe(true);
    }
  );

  it("uses Naive skeletons and honors the host loading slot", async () => {
    const custom = shallowRef(false);
    const host = mount(() =>
      h(
        DataTable<Row>,
        {
          ...base,
          data: [],
          forceMobile: false,
          isLoading: true,
          skeletonRows: 2,
        },
        custom.value ? { loading: () => h("p", "Preparing rows") } : {}
      )
    );
    expect(
      host.querySelectorAll('[data-adapttable-part="loading-row"]')
    ).toHaveLength(2);
    expect(host.querySelector(".n-skeleton")).not.toBeNull();
    custom.value = true;
    await nextTick();
    expect(host.textContent).toContain("Preparing rows");
    expect(host.querySelector(".n-skeleton")).toBeNull();
  });

  it.each([false, true])(
    "hydrates the complete kit surface without mismatch (mobile=%s)",
    async (mobile) => {
      const component = defineComponent({
        render: () => h(DataTable<Row>, { ...base, forceMobile: mobile }),
      });
      const html = await renderToString(createSSRApp(component));
      const host = document.createElement("div");
      host.innerHTML = html;
      document.body.append(host);
      const warn = vi.spyOn(console, "warn");
      const error = vi.spyOn(console, "error");
      const app = createSSRApp(component);
      app.mount(host);
      cleanups.push(() => {
        app.unmount();
        host.remove();
      });
      await nextTick();
      expect(warn.mock.calls.flat().join(" ")).not.toMatch(
        /hydration|mismatch/i
      );
      expect(error.mock.calls.flat().join(" ")).not.toMatch(
        /hydration|mismatch/i
      );
      expect(host.textContent).toContain("Ada");
    }
  );
  it("rejects the unreachable vendor mask class without dropping supported hooks", () => {
    expect(naiveClassNames({ table: "custom-table" })).toEqual({
      table: "custom-table",
    });
    expect(() => naiveClassNames({ filtersBackdrop: "unreachable" })).toThrow(
      /filtersBackdrop.*unsupported/
    );
  });
});
