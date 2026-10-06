import { useSelection as useRowSelection } from "@adapttable/vue";
import { type ColumnInput, DataTable } from "@adapttable/vue-unstyled";
import { editing } from "@adapttable/vue-unstyled/editing";
import { filters } from "@adapttable/vue-unstyled/filters";
import { describe, expect, it, vi } from "vitest";
import { createApp, effectScope, h, nextTick, shallowRef, version } from "vue";

import CustomHeadlessConsumer from "./CustomHeadlessConsumer.vue";
import CustomShellConsumer from "./CustomShellConsumer.vue";

interface Row {
  id: string;
  name: string;
}
const tick = async () => {
  await nextTick();
  await nextTick();
};
const part = (name: string) => `[data-adapttable-part="${name}"]`;
function button(host: ParentNode, name: string) {
  const value = host.querySelector<HTMLButtonElement>(part(name));
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

const nativeParts = [
  ["table", "TABLE", "peer-table"],
  ["header-cell", "TH", "peer-head"],
  ["cell", "TD", "peer-cell"],
] as const;
function expectNativeParts(host: ParentNode) {
  for (const [name, tag, className] of nativeParts) {
    const nodes = [...host.querySelectorAll<HTMLElement>(part(name))];
    expect(nodes.length, name).toBeGreaterThan(0);
    for (const node of nodes) {
      expect(node.tagName, name).toBe(tag);
      expect(node.classList.contains(className), name).toBe(true);
    }
  }
}
function mountNativeParts(mode: "basic" | "grouped") {
  const columns: readonly ColumnInput<Row>[] =
    mode === "grouped"
      ? [
          { key: "id", header: "ID" },
          { header: "Person", children: [{ key: "name", header: "Name" }] },
        ]
      : [
          { key: "id", header: "ID" },
          { key: "name", header: "Name" },
        ];
  const host = document.createElement("div");
  document.body.append(host);
  const app = createApp({
    render: () =>
      h(DataTable<Row>, {
        data: [{ id: "1", name: "Ada" }],
        columns,
        rowKey: (row: Row) => row.id,
        urlSync: false,
        forceMobile: false,
        classNames: { table: "peer-table", th: "peer-head", td: "peer-cell" },
      }),
  });
  app.mount(host);
  return {
    host,
    release: () => {
      app.unmount();
      host.remove();
    },
  };
}

describe("packed DataTable canonical native targets", () => {
  it.each(["basic", "grouped"] as const)(
    "retains marker, tag and class ownership for %s columns",
    async (mode) => {
      expect(version).toBe(process.env.ADAPTTABLE_VUE_PEER_VERSION);
      const view = mountNativeParts(mode);
      try {
        await tick();
        expectNativeParts(view.host);
        expect(view.host.querySelectorAll(part("table"))).toHaveLength(1);
        expect(view.host.querySelectorAll(part("header-cell"))).toHaveLength(2);
        expect(view.host.querySelectorAll(part("cell"))).toHaveLength(2);
        expect(view.host.querySelectorAll("thead tr")).toHaveLength(
          mode === "grouped" ? 2 : 1
        );
        if (mode === "grouped")
          expect(
            view.host
              .querySelector('th[data-column-key="id"]')
              ?.getAttribute("rowspan")
          ).toBe("2");
      } finally {
        view.release();
      }
    }
  );

  it.each(
    (["basic", "grouped"] as const).flatMap((mode) =>
      nativeParts.flatMap(([name, , className]) =>
        (["marker", "target", "class"] as const).map((fault) => ({
          mode,
          name,
          className,
          fault,
        }))
      )
    )
  )(
    "rejects a wrong $fault for $name in the packed $mode table",
    async ({ mode, name, className, fault }) => {
      expect(version).toBe(process.env.ADAPTTABLE_VUE_PEER_VERSION);
      const view = mountNativeParts(mode);
      try {
        await tick();
        expectNativeParts(view.host);
        const nodes = [...view.host.querySelectorAll<HTMLElement>(part(name))];
        if (fault === "target") {
          const wrong = document.createElement("div");
          wrong.setAttribute("data-adapttable-part", name);
          wrong.className = className;
          view.host.append(wrong);
        } else if (fault === "marker") {
          for (const node of nodes)
            node.setAttribute("data-adapttable-part", `${name}-wrong`);
        } else {
          for (const node of nodes) node.classList.remove(className);
          view.host.classList.add(className);
        }
        expect(() => expectNativeParts(view.host)).toThrow();
      } finally {
        view.release();
      }
    }
  );
});

describe("built native packages at the minimum Vue runtime", () => {
  it("keeps the editor identity, draft and focus and renders optional filters", async () => {
    expect(version).toBe(process.env.ADAPTTABLE_VUE_PEER_VERSION);
    const host = document.createElement("div");
    document.body.append(host);
    const commit = vi.fn();
    const columns = shallowRef([
      { key: "name", header: "Name", editable: true },
    ]);
    const features = [
      editing<Row>(commit),
      filters<Row>([{ key: "name", type: "text" }]),
    ];
    const rows: readonly Row[] = [{ id: "1", name: "Ada" }];
    const app = createApp({
      setup: () => () =>
        h(DataTable<Row>, {
          data: rows,
          columns: columns.value,
          rowKey: (row: Row) => row.id,
          urlSync: false,
          features,
        }),
    });
    app.mount(host);
    try {
      const activate = button(host, "edit-cell-activate");
      activate.focus();
      activate.dispatchEvent(
        new KeyboardEvent("keydown", { key: "F2", bubbles: true })
      );
      await tick();
      const editor = host.querySelector<HTMLInputElement>(
        'td[data-column-key="name"] input'
      );
      if (!editor) throw new Error("Missing built editor");
      editor.value = "Draft";
      editor.dispatchEvent(new Event("input", { bubbles: true }));
      columns.value = [{ ...columns.value[0]!, header: "Renamed" }];
      await tick();
      expect(host.querySelector('td[data-column-key="name"] input')).toBe(
        editor
      );
      expect(editor.value).toBe("Draft");
      expect(document.activeElement).toBe(editor);
      expect(commit).not.toHaveBeenCalled();
      editor.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
      );
      await tick();
      const trigger = button(host, "filters-button");
      trigger.click();
      await tick();
      expect(trigger.getAttribute("aria-expanded")).toBe("true");
      const surface = document.body.querySelector(part("filters-popover"));
      expect(surface?.querySelector(part("filter-input"))).toBeTruthy();
      expect(commit).not.toHaveBeenCalled();
    } finally {
      app.unmount();
      host.remove();
    }
  });
});

it("keeps equivalent selection owners live and retires replaced rows and disposed scopes", () => {
  const scope = effectScope();
  const row = { id: "1", name: "Ada" };
  const rows = shallowRef([row]);
  const selected = scope.run(() =>
    useRowSelection({ rows, rowKey: (value) => value.id })
  );
  if (!selected) throw new Error("Missing selection scope");
  try {
    const original = selected.rowCheckboxAttrs("1");
    rows.value = [...rows.value];
    original.onChange();
    expect([...selected.selectedIds.value]).toEqual(["1"]);
    original.onChange();
    expect([...selected.selectedIds.value]).toEqual([]);
    rows.value = [{ ...row }];
    original.onChange();
    expect([...selected.selectedIds.value]).toEqual([]);
    const live = selected.rowCheckboxAttrs("1");
    live.onChange();
    expect([...selected.selectedIds.value]).toEqual(["1"]);
    scope.stop();
    live.onChange();
    expect([...selected.selectedIds.value]).toEqual(["1"]);
  } finally {
    scope.stop();
  }
});

it.each([
  ["headless", CustomHeadlessConsumer],
  ["shell", CustomShellConsumer],
] as const)(
  "renders a custom layout from %s without shared-layout controls",
  async (kind, Consumer) => {
    expect(version).toBe(process.env.ADAPTTABLE_VUE_PEER_VERSION);
    const host = document.createElement("div");
    const app = createApp(Consumer);
    app.mount(host);
    try {
      expect(
        host.querySelector(`[data-custom-layout="${kind}"]`)
      ).not.toBeNull();
      expect(
        [...host.querySelectorAll("li")].map((row) => row.textContent)
      ).toEqual(["Ada", "Bea"]);
      expect(host.querySelector("table, [data-adapttable-part]")).toBeNull();
      host.querySelector<HTMLButtonElement>("button")?.click();
      await tick();
      expect(
        [...host.querySelectorAll("li")].map((row) => row.textContent)
      ).toEqual(["Bea", "Ada"]);
    } finally {
      app.unmount();
    }
  }
);

it("advances and reverses the packed native table for repeated clicks before rerender", async () => {
  const host = document.createElement("div");
  const app = createApp({
    render: () =>
      h(DataTable<Row>, {
        data: [
          { id: "a", name: "Ada" },
          { id: "b", name: "Bea" },
          { id: "c", name: "Clio" },
        ],
        columns: [{ key: "name" }],
        rowKey: (row: Row) => row.id,
        defaults: { limit: 1 },
        paginationMode: "paged",
        urlSync: false,
        forceMobile: false,
      }),
  });
  app.mount(host);
  try {
    const next = button(host, "page-next");
    next.click();
    next.click();
    await tick();
    expect(host.querySelector("tbody")?.textContent).toBe("Clio");
    const previous = button(host, "page-prev");
    previous.click();
    previous.click();
    await tick();
    expect(host.querySelector("tbody")?.textContent).toBe("Ada");
  } finally {
    app.unmount();
  }
});
