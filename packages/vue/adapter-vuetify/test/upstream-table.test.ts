import { createApp, h, nextTick } from "vue";
import { createVuetify } from "vuetify";
import { VDataTableServer } from "vuetify/components/VDataTable";
import { VTable } from "vuetify/components/VTable";
import { aliases, mdi } from "vuetify/iconsets/mdi-svg";

function plugin() {
  return createVuetify({
    ssr: true,
    icons: { defaultSet: "mdi", aliases, sets: { mdi } },
  });
}

it("the server table preserves prepared order but exposes semantic table attrs only on its host", async () => {
  const host = document.createElement("div");
  document.body.append(host);
  const app = createApp({
    render: () =>
      h(VDataTableServer, {
        headers: [{ key: "name", title: "Name" }],
        items: [
          { key: "b", name: "Beta" },
          { key: "a", name: "Alpha" },
        ],
        itemValue: "key",
        itemsLength: 2,
        itemsPerPage: -1,
        page: 1,
        groupBy: [],
        sortBy: [],
        disableSort: true,
        showSelect: false,
        showExpand: false,
        hideDefaultFooter: true,
        mobile: false,
        "aria-label": "People",
        "aria-rowcount": 2,
        "aria-colcount": 1,
        "data-adapttable-part": "table",
        role: "grid",
        class: "host-table-class",
      }),
  }).use(plugin());
  try {
    app.mount(host);
    await nextTick();
    const table = host.querySelector("table");
    expect(table?.getAttribute("aria-label")).toBe("People");
    expect(table?.getAttribute("data-adapttable-part")).toBeNull();
    expect(table?.getAttribute("role")).toBeNull();
    expect(table?.getAttribute("aria-rowcount")).toBeNull();
    expect(table?.classList.contains("host-table-class")).toBe(false);
    expect(
      host
        .querySelector('[data-adapttable-part="table"]')
        ?.classList.contains("v-data-table")
    ).toBe(true);
    expect(
      [...host.querySelectorAll("tbody tr")].map((row) =>
        row.textContent?.trim()
      )
    ).toEqual(["Beta", "Alpha"]);
  } finally {
    app.unmount();
    host.remove();
  }
});

it("the documented VTable wrapper slot preserves the semantic table and Vuetify surface", async () => {
  const host = document.createElement("div");
  document.body.append(host);
  const tableRef = vi.fn();
  const app = createApp({
    render: () =>
      h(
        VTable,
        { density: "compact", hover: true },
        {
          wrapper: () =>
            h("div", { class: "v-table__wrapper" }, [
              h(
                "table",
                {
                  role: "grid",
                  "aria-rowcount": 2,
                  "aria-colcount": 1,
                  "data-adapttable-part": "table",
                  ref: tableRef,
                },
                [
                  h("tbody", [
                    h("tr", [h("td", "Beta")]),
                    h("tr", [h("td", "Alpha")]),
                  ]),
                ]
              ),
            ]),
        }
      ),
  }).use(plugin());
  try {
    app.mount(host);
    await nextTick();
    const table = host.querySelector("table");
    expect(table?.getAttribute("role")).toBe("grid");
    expect(table?.getAttribute("data-adapttable-part")).toBe("table");
    expect(tableRef.mock.lastCall?.[0]).toBe(table);
    expect(
      host.querySelector(".v-table--density-compact.v-table--hover")
    ).not.toBeNull();
    expect(
      [...host.querySelectorAll("tbody tr")].map((row) => row.textContent)
    ).toEqual(["Beta", "Alpha"]);
  } finally {
    app.unmount();
    host.remove();
  }
});
