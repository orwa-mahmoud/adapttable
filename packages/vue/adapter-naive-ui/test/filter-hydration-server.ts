import { setup } from "@css-render/vue3-ssr";
import { createViteServer } from "vitest/node";
import { type Component, createSSRApp } from "vue";
import { renderToString } from "vue/server-renderer";

// Compile the same SFC fixture with the suite's real Vue plugin and aliases.
// Middleware mode uses no listening browser server or WebSocket endpoint.
// Stdout carries only the JSON result: Vite's info messages (such as a
// dependency re-optimization) would print there, while its warnings and
// errors still reach stderr, which the suite requires to be empty.
const server = await createViteServer({
  configFile: process.argv[2],
  server: { middlewareMode: true, hmr: false, watch: null },
  appType: "custom",
  logLevel: "warn",
});
try {
  const { filterHydrationTable, filterHydrationOverlay } =
    await server.ssrLoadModule(
      new URL("./filter-hydration-fixture.ts", import.meta.url).pathname
    );
  const result: Record<string, { html: string; css: string }> = {};
  const render = async (component: Component) => {
    const app = createSSRApp(component);
    const { collect } = setup(app);
    const html = await renderToString(app);
    return { html, css: collect() };
  };
  for (const mode of ["popover", "drawer"]) {
    for (const mobile of [false, true]) {
      result[`table-${mode}-${String(mobile)}`] = await render(
        filterHydrationTable(mode, mobile)
      );
    }
  }
  for (const modal of [false, true]) {
    result[`overlay-${String(modal)}`] = await render(
      filterHydrationOverlay(modal)
    );
  }
  process.stdout.write(JSON.stringify(result));
} finally {
  await server.close();
}
