import { describe, expect, it, vi } from "vitest";
import { createSSRApp, h, shallowRef } from "vue";
import { renderToString } from "vue/server-renderer";

import { DataTable } from "../src";
import { standardFeatures } from "../src/preset";
import {
  click,
  find,
  mountNative,
  part,
  tick,
  write,
} from "./filter-editing-helpers";

const rows = [
  { id: "a", name: "Ada", team: "Math" },
  { id: "g", name: "Grace", team: "Computing" },
];
type Row = (typeof rows)[number];
const base = {
  data: rows,
  columns: [
    { key: "name", sortable: true, filter: "text" },
    { key: "team", sortable: true },
  ],
  rowKey: (row: Row) => row.id,
  urlSync: false,
  searchable: false,
};
const zeroIds = [
  "column-menu",
  "density-chooser",
  "export-csv",
  "find-in-table",
  "fit-columns",
  "fullscreen",
  "header-filters",
  "multi-sort",
  "resizable-columns",
  "status-bar",
];

describe("standard native features", () => {
  it("composes useful zero-configuration features and only explicitly configured optional members", () => {
    expect(standardFeatures().map(({ id }) => id)).toEqual(zeroIds);
    expect(standardFeatures<Row>({}).map(({ id }) => id)).toEqual(zeroIds);
    const configured = standardFeatures<Row>({
      grouping: "team",
      bulkActions: [],
      filters: [],
      savedViews: { storageKey: "people", storage: null },
    });
    expect(configured.map(({ id }) => id)).toEqual([
      ...zeroIds,
      "grouping",
      "bulk-actions",
      "filters",
      "saved-views",
    ]);
  });

  it.each([false, true])(
    "renders native preset controls on mobile=%s and honors controlled density",
    async (forceMobile) => {
      const density = shallowRef<"compact" | "comfortable">("comfortable");
      const change = vi.fn();
      const features = standardFeatures();
      const { host } = mountNative(() =>
        h(DataTable<Row>, {
          ...base,
          forceMobile,
          density: density.value,
          "onUpdate:density": change,
          features,
        })
      );
      await tick();
      expect(find(host, part("column-menu-button")).tagName).toBe("BUTTON");
      expect(find(host, part("density-toggle")).tagName).toBe("SELECT");
      expect(find(host, part("export-csv-button")).tagName).toBe("BUTTON");
      expect(host.querySelectorAll(part("status-bar"))).toHaveLength(1);
      expect(host.querySelector(part("find-button"))).toBeNull();
      const select = find<HTMLSelectElement>(host, part("density-toggle"));
      await write(select, "compact", "change");
      expect(change).toHaveBeenLastCalledWith("compact");
      expect(select.value).toBe("comfortable");
      density.value = "compact";
      await tick();
      expect(select.value).toBe("compact");
      await click(host, "column-menu-button");
      expect(find(host, part("column-menu-search")).tagName).toBe("INPUT");
    }
  );

  it("installs keyboard Find by default and the optional native toolbar button", async () => {
    const features = shallowRef(standardFeatures<Row>());
    const { host } = mountNative(() =>
      h(DataTable<Row>, { ...base, features: features.value })
    );
    await tick();
    const root = find(host, part("root"));
    root.tabIndex = 0;
    root.focus();
    root.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "f",
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      })
    );
    await tick();
    await write(find<HTMLInputElement>(host, part("find-input")), "Grace");
    expect(find(host, part("find-count")).textContent).toContain("1 of 1");
    features.value = standardFeatures<Row>({ findButton: true });
    await tick();
    expect(find(host, part("find-button")).tagName).toBe("BUTTON");
  });

  it("draws configured grouping and action controls while leaving the mutation to the host", async () => {
    const run = vi.fn();
    const { host } = mountNative(() =>
      h(DataTable<Row>, {
        ...base,
        defaultSelectedIds: ["g"],
        features: standardFeatures<Row>({
          grouping: "team",
          bulkActions: [{ key: "archive", label: "Archive", onClick: run }],
          filters: [{ key: "name", type: "text", getValue: (row) => row.name }],
          savedViews: { storageKey: "preset-people", storage: null },
        }),
      })
    );
    await tick();
    expect(host.querySelectorAll("tr[data-group-key]")).toHaveLength(2);
    await click(host, "bulk-button");
    expect(run).toHaveBeenCalledWith(["g"], { allMatching: false, total: 1 });
    expect(rows).toHaveLength(2);
  });

  it("renders the preset on the server without invoking downloads", async () => {
    const html = await renderToString(
      createSSRApp({
        render: () =>
          h(DataTable<Row>, { ...base, features: standardFeatures() }),
      })
    );
    expect(html).toContain('data-adapttable-part="export-csv-button"');
    expect(html).toContain('data-adapttable-part="column-menu-button"');
    expect(html).toContain("Ada");
  });
});
