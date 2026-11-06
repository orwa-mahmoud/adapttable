// @vitest-environment node
import { createMemoryAdapter } from "@adapttable/core";
import { describe, expect, it, vi } from "vitest";
import { createSSRApp, defineComponent, h } from "vue";
import { renderToString } from "vue/server-renderer";

import { useExternalStore } from "../store";
import { useTableUrlState } from "../url/useTableUrlState";
import { useFrontendData } from "./useFrontendData";
import { useServerData } from "./useServerData";

describe("server-safe sources", () => {
  it("renders without browser globals, subscriptions or remote requests", async () => {
    const subscribe = vi.fn(() => () => undefined);
    const request = vi.fn();
    const App = defineComponent({
      setup() {
        const external = useExternalStore({
          getSnapshot: () => "read",
          subscribe,
        });
        const frontend = useFrontendData({
          data: [{ id: "one" }],
          urlSync: false,
        });
        const server = useServerData({
          rows: [],
          total: 0,
          onQueryChange: request,
          urlSync: false,
        });
        return () =>
          h(
            "p",
            `${external.value}:${frontend.value.total}:${server.value.total}`
          );
      },
    });
    expect(typeof window).toBe("undefined");
    expect(await renderToString(createSSRApp(App))).toBe("<p>read:1:0</p>");
    expect(subscribe).not.toHaveBeenCalled();
    expect(request).not.toHaveBeenCalled();
  });

  it("isolates concurrent request state and reads each request adapter", async () => {
    const render = (search: string) =>
      renderToString(
        createSSRApp(
          defineComponent({
            setup() {
              const source = useFrontendData({
                data: [
                  { id: "a", name: "Ada" },
                  { id: "b", name: "Ben" },
                ],
                urlAdapter: createMemoryAdapter(`q=${search}`),
              });
              return () =>
                h("p", source.value.rows.map((row) => row.name).join(","));
            },
          })
        )
      );
    const [first, second] = await Promise.all([render("Ada"), render("Ben")]);
    expect(first).toBe("<p>Ada</p>");
    expect(second).toBe("<p>Ben</p>");
  });

  it("keeps two request locales and their row ids apart", async () => {
    const rows = [
      { id: "en-first", nameEn: "Ada", nameAr: "زيد" },
      { id: "ar-first", nameEn: "Zed", nameAr: "آدا" },
    ];
    const columns = [
      {
        key: "nameEn",
        accessor: (row: (typeof rows)[number]) => row.nameEn,
        i18n: { ar: "nameAr" },
      },
    ];
    const render = (locale: string) =>
      renderToString(
        createSSRApp(
          defineComponent({
            setup() {
              const source = useFrontendData({
                data: rows,
                columns,
                locale,
                urlAdapter: createMemoryAdapter(""),
                defaults: { sortBy: "nameEn", sortDir: "asc" },
                forceMobile: false,
              });
              return () =>
                h("p", source.value.rows.map((row) => row.id).join(","));
            },
          })
        )
      );
    const [english, arabic] = await Promise.all([
      render("en"),
      render("ar"),
    ]);
    expect(await render("en")).toBe(english);
    expect(await render("ar")).toBe(arabic);
    expect(english).toBe("<p>en-first,ar-first</p>");
    expect(arabic).toBe("<p>ar-first,en-first</p>");
  });

  it("keeps setup-time local mutations reactive without subscribing", async () => {
    const App = defineComponent({
      setup() {
        const url = useTableUrlState({ urlSync: false });
        url.setSearch("server state");
        return () => h("p", url.state.value.search);
      },
    });
    expect(await renderToString(createSSRApp(App))).toBe("<p>server state</p>");
  });
});
