/** Native Node SSR for Vue kits whose vendors publish plain JavaScript. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";

import { vueHostRoutes } from "./node-support-vue-host.mjs";

const require = createRequire(import.meta.url);
assert.equal(typeof window, "undefined");
assert.equal(typeof document, "undefined");
assert.equal(h, require("vue").h);
for (const name of process.argv.slice(2)) {
  const manifest = JSON.parse(
    readFileSync(require.resolve(`${name}/package.json`), "utf8")
  );
  const routes = vueHostRoutes(name, manifest);
  assert.equal(
    createRequire(require.resolve(name)).resolve("vue"),
    require.resolve("vue")
  );
  for (const mode of ["import", "require"]) {
    const load = (route) =>
      mode === "require" ? require(route) : import(route);
    for (const route of routes) {
      if (mode === "require")
        assert.ok(require.resolve(route).endsWith(".cjs"), route);
      assert.ok(
        Object.keys(await load(route)).length > 0,
        `${route}: no ${mode} exports`
      );
    }
    const { DataTable } = await load(name);
    for (const forceMobile of [false, true]) {
      const app = createSSRApp({
        render: () =>
          h(DataTable, {
            data: [{ id: "proof", name: "Packed Node consumer" }],
            columns: [{ key: "name", header: "Person" }],
            rowKey: (row) => row.id,
            urlSync: false,
            forceMobile,
          }),
      });
      const context = { req: { headers: {} } };
      let collect;
      if (name === "@adapttable/element-plus") {
        const element = await load("element-plus");
        app.provide(element.ID_INJECTION_KEY, { prefix: 4700, current: 0 });
        app.provide(element.ZINDEX_INJECTION_KEY, { current: 0 });
      }
      if (name === "@adapttable/naive-ui") {
        const { setup } = await import("@css-render/vue3-ssr");
        ({ collect } = setup(app));
      }
      if (name === "@adapttable/quasar") {
        const { Quasar } = await load("quasar");
        Reflect.apply(Quasar.install, Quasar, [app, { config: {} }, context]);
      }
      const html = await renderToString(app, context);
      assert.ok(
        html.includes("Packed Node consumer"),
        `${name}: missing packed row`
      );
      assert.ok(html.includes("Person"), `${name}: missing column header`);
      if (collect) assert.match(collect(), /cssr-id=/);
    }
    console.log(
      `${name}: all ${routes.length} actual ${mode} entries and desktop/mobile Node SSR passed`
    );
  }
}
