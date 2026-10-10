import type { ColumnDef, DataTableHandle } from "@adapttable/vue";
import { createApp, h, nextTick, shallowRef } from "vue";
import { createVuetify } from "vuetify";
import { aliases, mdi } from "vuetify/iconsets/mdi-svg";

import { DataTable } from "../src";
import { grouping } from "../src/grouping";

interface Person {
  id: string;
  name: string;
  team: string;
}
const people: readonly Person[] = [
  { id: "b", name: "Beta", team: "Platform" },
  { id: "a", name: "Alpha", team: "Design" },
];
const columns: readonly ColumnDef<Person>[] = [
  { key: "name", header: "Name", sortable: true },
  { key: "team", header: "Team", sortable: true },
];
const cleanups: (() => void)[] = [];
function mount(render: () => ReturnType<typeof h>) {
  const host = document.createElement("div");
  document.body.append(host);
  const app = createApp({ setup: () => render }).use(
    createVuetify({
      ssr: true,
      icons: { defaultSet: "mdi", aliases, sets: { mdi } },
    })
  );
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
async function flush(): Promise<void> {
  await nextTick();
  await nextTick();
}
function button(host: ParentNode, name: string): HTMLButtonElement {
  const result = [...host.querySelectorAll("button")].find(
    (item) =>
      item.getAttribute("aria-label") === name ||
      item.textContent?.trim() === name
  );
  if (!result) throw new Error(`Missing button ${name}`);
  return result;
}

it("uses genuine VTable while preserving native table/header/cell contracts and prepared row order", async () => {
  const host = mount(() =>
    h(DataTable<Person>, {
      data: people,
      columns,
      rowKey: (row) => row.id,
      urlSync: false,
      forceMobile: false,
      tableLabel: "People",
      density: "compact",
      classNames: { table: "host-table", th: "host-header", td: "host-cell" },
    })
  );
  await flush();
  const table = host.querySelector('table[data-adapttable-part="table"]');
  expect(table?.classList.contains("host-table")).toBe(true);
  expect(table?.getAttribute("aria-label")).toBe("People");
  expect(
    host.querySelector(".v-table.v-table--density-compact")
  ).not.toBeNull();
  expect(
    host.querySelectorAll('th[data-adapttable-part="header-cell"].host-header')
  ).toHaveLength(2);
  expect(
    host.querySelectorAll('td[data-adapttable-part="cell"].host-cell')
  ).toHaveLength(4);
  expect(
    [...host.querySelectorAll("tbody [data-row-id]")].map((row) =>
      row.getAttribute("data-row-id")
    )
  ).toEqual(["b", "a"]);
  button(host, "Name").click();
  await flush();
  expect(
    [...host.querySelectorAll("tbody [data-row-id]")].map((row) =>
      row.getAttribute("data-row-id")
    )
  ).toEqual(["a", "b"]);
});

it("keeps selection host-owned and requests once through a real Vuetify checkbox", async () => {
  const selectedIds = shallowRef<readonly string[]>([]);
  const requested = vi.fn();
  const host = mount(() =>
    h(DataTable<Person>, {
      data: people,
      columns,
      rowKey: (row) => row.id,
      selectedIds: selectedIds.value,
      "onUpdate:selectedIds": requested,
      urlSync: false,
      forceMobile: false,
    })
  );
  await flush();
  const checkbox = host.querySelector('tbody input[type="checkbox"]');
  if (!(checkbox instanceof HTMLInputElement))
    throw new Error("Missing row checkbox");
  expect(checkbox.closest(".v-checkbox-btn")).not.toBeNull();
  checkbox.click();
  await flush();
  expect(requested).toHaveBeenCalledExactlyOnceWith(["b"]);
  expect(checkbox.checked).toBe(false);
  selectedIds.value = ["b"];
  await flush();
  expect(checkbox.checked).toBe(true);
});

it("renders mobile rows as genuine Vuetify cards without creating a second row order", async () => {
  const host = mount(() =>
    h(DataTable<Person>, {
      data: people,
      columns,
      rowKey: (row) => row.id,
      urlSync: false,
      forceMobile: true,
      classNames: { card: "host-card", cardValue: "host-value" },
    })
  );
  await flush();
  const cards = [...host.querySelectorAll("article.v-card.host-card")];
  expect(cards.map((card) => card.getAttribute("data-row-id"))).toEqual([
    "b",
    "a",
  ]);
  expect(
    host.querySelectorAll('dd[data-adapttable-part="card-value"].host-value')
  ).toHaveLength(4);
  expect(host.querySelector("table")).toBeNull();
});

it("preserves binding-owned grouping controls and native group rows", async () => {
  const features = [grouping<Person>("team")];
  const host = mount(() =>
    h(DataTable<Person>, {
      data: people,
      columns,
      rowKey: (row) => row.id,
      features,
      urlSync: false,
      forceMobile: false,
    })
  );
  await flush();
  expect(
    host.querySelectorAll('[data-adapttable-part="group-row"]')
  ).toHaveLength(2);
  const toggle = host.querySelector('[data-adapttable-part="group-toggle"]');
  if (!(toggle instanceof HTMLButtonElement))
    throw new Error("Missing group toggle");
  expect(toggle.classList.contains("v-btn")).toBe(true);
  toggle.click();
  await flush();
  expect(toggle.getAttribute("aria-expanded")).toBe("false");
  expect(host.querySelectorAll("tbody [data-row-id]")).toHaveLength(1);
});

it("exposes the typed binding handle and preserves search value through unrelated parent updates", async () => {
  const decoration = shallowRef("first");
  let handle: DataTableHandle<Person> | null = null;
  const host = mount(() =>
    h(DataTable<Person>, {
      data: people,
      columns,
      rowKey: (row) => row.id,
      urlSync: false,
      forceMobile: false,
      searchDebounceMs: 0,
      classNames: { root: decoration.value },
      ref: (value) => {
        handle = value as DataTableHandle<Person> | null;
      },
    })
  );
  await flush();
  expect(handle).not.toBeNull();
  const search = host.querySelector('input[type="search"]');
  if (!(search instanceof HTMLInputElement))
    throw new Error("Missing search input");
  search.value = "Alpha";
  search.dispatchEvent(new Event("input", { bubbles: true }));
  await flush();
  expect(host.querySelectorAll("tbody [data-row-id]")).toHaveLength(1);
  expect(search.value).toBe("Alpha");
  decoration.value = "second";
  await flush();
  expect(search.value).toBe("Alpha");
  expect(host.querySelector('input[type="search"]')).toBe(search);
});
