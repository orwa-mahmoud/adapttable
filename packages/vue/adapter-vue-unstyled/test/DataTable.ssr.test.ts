// @vitest-environment node
import { describe, expect, it } from "vitest";
import { createSSRApp, defineComponent, h } from "vue";
import { renderToString } from "vue/server-renderer";

import { DataTable } from "../src";
describe("server rendering without browser globals", () => {
  it("has isolated request state and no browser requirements on import or render", async () => {
    expect(typeof window).toBe("undefined");
    expect(typeof document).toBe("undefined");
    const render = (name: string) =>
      renderToString(
        createSSRApp(
          defineComponent({
            setup: () => () =>
              h(DataTable<{ id: string; name: string }>, {
                data: [{ id: name, name }],
                columns: [{ key: "name", sortable: true }],
                rowKey: (row: { id: string }) => row.id,
                urlSync: false,
                tableLabel: name,
              }),
          })
        )
      );
    const [one, two] = await Promise.all([render("ONE"), render("TWO")]);
    expect(one).toContain("ONE");
    expect(one).not.toContain("TWO");
    expect(two).toContain("TWO");
    expect(two).not.toContain("ONE");
    expect(one).toContain("<table");
    expect(one).not.toContain('data-adapttable-part="checkbox"');
  });
});

describe("server-rendered native states", () => {
  it("renders mobile sorting, infinite loading, error retry and refresh states", async () => {
    const data = [
      { id: "one", score: 1 },
      { id: "two", score: 2 },
      { id: "three", score: 3 },
    ];
    const html = await renderToString(
      createSSRApp({
        render: () =>
          h(DataTable<{ id: string; score: number }>, {
            data,
            columns: [
              { key: "score", sortable: true, accessor: (row) => row.score },
            ],
            rowKey: (row) => row.id,
            urlSync: false,
            forceMobile: true,
            paginationMode: "infinite",
            defaults: { limit: 1, sortBy: "score", sortDir: "desc" },
            error: new Error("offline"),
            refetch: () => undefined,
            isFetching: true,
          }),
      })
    );
    expect(html).toContain("sort-select");
    expect(html).toContain("sort-direction");
    expect(html).toContain('data-adapttable-part="retry-button"');
    expect(html).toContain('data-adapttable-part="refresh-indicator"');
    expect(html).not.toContain('data-adapttable-part="load-more"');
    expect(html).toContain("card-value");
    const ready = await renderToString(
      createSSRApp({
        render: () =>
          h(DataTable<{ id: string; score: number }>, {
            data,
            columns: [
              { key: "score", sortable: true, accessor: (row) => row.score },
            ],
            rowKey: (row) => row.id,
            urlSync: false,
            forceMobile: true,
            paginationMode: "infinite",
            defaults: { limit: 1 },
          }),
      })
    );
    expect(ready).toContain('data-adapttable-part="load-more"');
  });
  it("renders a middle paged view with a previous action available and an enabled next action", async () => {
    const data = Array.from({ length: 12 }, (_, index) => ({
      id: String(index),
    }));
    const html = await renderToString(
      createSSRApp({
        render: () =>
          h(DataTable<{ id: string }>, {
            data,
            columns: [{ key: "id" }],
            rowKey: (row) => row.id,
            urlSync: false,
            paginationMode: "paged",
            defaults: { limit: 1, page: 2 },
          }),
      })
    );
    expect(html).toContain("Page 2 of 12");
    expect(html).toContain('data-adapttable-part="page-ellipsis"');
    expect(html).toMatch(
      /aria-label="Previous page" data-adapttable-part="page-prev"/
    );
    expect(html).toMatch(
      /aria-label="Next page" data-adapttable-part="page-next"/
    );
  });
});
