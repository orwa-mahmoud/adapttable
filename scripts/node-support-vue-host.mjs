/** Official Vue host compilation for packages whose vendors ship SFCs/CSS. */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, realpathSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const VUE_HOST_PACKAGES = Object.freeze([
  "@adapttable/nuxt-ui",
  "@adapttable/vuetify",
]);

/** Keep every code export, including the root and every feature subpath. */
export function vueHostRoutes(name, manifest) {
  return Object.entries(manifest.exports)
    .filter(
      ([key, target]) =>
        key !== "./package.json" &&
        !(typeof target === "string" && target.endsWith(".css"))
    )
    .map(([key]) => (key === "." ? name : `${name}/${key.slice(2)}`));
}

/** Reject a build that changed conditions or bypassed the vendor pipeline. */
export function assertVueHostGraph(name, mode, expected, ids) {
  for (const path of expected) {
    assert.ok(
      ids.includes(path),
      `Official host did not consume ${mode} entry: ${path}`
    );
  }
  if (name === "@adapttable/nuxt-ui") {
    assert.ok(
      ids.some((id) => id.includes("/@nuxt/ui/") && id.endsWith(".vue")),
      "Nuxt UI SFCs were not compiled"
    );
  } else {
    assert.ok(
      ids.some((id) => id.includes("/vuetify/") && id.endsWith(".css")),
      "Vuetify CSS was not processed"
    );
  }
}

function hostEntry(routes, mode, vuetify) {
  const loads = routes.map((route, index) =>
    mode === "require"
      ? `const entry${index} = require(${JSON.stringify(route)});`
      : `import * as entry${index} from ${JSON.stringify(route)};`
  );
  const entries =
    "{" +
    routes
      .map((route, index) => `${JSON.stringify(route)}: entry${index}`)
      .join(",") +
    "}";
  if (mode === "require") {
    loads.push(
      `module.exports = { hostH: require("vue").h, entries: ${entries}${vuetify ? ', ...require("vuetify/framework")' : ""} };`
    );
  } else {
    loads.push('export { h as hostH } from "vue";');
    loads.push(`export const entries = ${entries};`);
    if (vuetify)
      loads.push('export { createVuetify } from "vuetify/framework";');
  }
  return loads.join("\n");
}

export function assertVueHostRoutes(expected, installed) {
  assert.deepEqual(
    [...installed].sort(),
    [...expected].sort(),
    "Packed host entry set differs from repository exports"
  );
}

async function compileHost(name, mode, cwd, expectedRoutes) {
  const fromConsumer = createRequire(join(cwd, "package.json"));
  const manifest = JSON.parse(
    readFileSync(fromConsumer.resolve(`${name}/package.json`), "utf8")
  );
  const installedRoutes = vueHostRoutes(name, manifest);
  const routes = expectedRoutes ?? installedRoutes;
  assertVueHostRoutes(routes, installedRoutes);
  const expected = routes.map((route) =>
    realpathSync(
      mode === "require"
        ? fromConsumer.resolve(route)
        : fileURLToPath(import.meta.resolve(route))
    )
  );
  if (mode === "require") {
    for (const path of expected)
      assert.ok(
        path.endsWith(".cjs"),
        `Expected actual require entry: ${path}`
      );
  }
  const key = `${name.split("/")[1]}-${mode}`;
  const input = join(cwd, `${key}.${mode === "require" ? "cjs" : "mjs"}`);
  writeFileSync(input, hostEntry(routes, mode, name === "@adapttable/vuetify"));
  const { build } = await import("vite");
  const plugins = [];
  if (name === "@adapttable/nuxt-ui") {
    const [{ default: vue }, { default: ui }] = await Promise.all([
      import("@vitejs/plugin-vue"),
      import("@nuxt/ui/vite"),
    ]);
    plugins.push(
      vue(),
      ui({
        router: false,
        colorMode: false,
        prose: true,
        autoImport: false,
        components: false,
        dts: false,
      })
    );
  }
  plugins.push({
    name: "verify-packed-host-entries",
    generateBundle() {
      const ids = [...this.getModuleIds()];
      assertVueHostGraph(name, mode, expected, ids);
      writeFileSync(
        join(cwd, `${key}-modules.json`),
        JSON.stringify({ expected, modules: ids }, null, 2) + "\n"
      );
    },
  });
  await build({
    configFile: false,
    root: cwd,
    plugins,
    resolve: { dedupe: ["vue", "@nuxt/ui"] },
    ssr: {
      noExternal: [
        name,
        name === "@adapttable/nuxt-ui" ? "@nuxt/ui" : "vuetify",
      ],
    },
    build: {
      ssr: input,
      outDir: `${key}-built`,
      rollupOptions: {
        output: {
          format: mode === "require" ? "cjs" : "es",
          entryFileNames: `host.${mode === "require" ? "cjs" : "mjs"}`,
        },
      },
    },
  });
  const output = join(
    cwd,
    `${key}-built`,
    `host.${mode === "require" ? "cjs" : "mjs"}`
  );
  return { routes, output };
}

async function verifyHost(name, mode, cwd, expectedRoutes) {
  const { routes, output } = await compileHost(name, mode, cwd, expectedRoutes);
  const filename = join(cwd, `${name.split("/")[1]}-${mode}-ssr.mjs`);
  writeFileSync(
    filename,
    `import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";
const require = createRequire(import.meta.url);
const host = ${mode === "require" ? `require(${JSON.stringify(output)})` : `await import(${JSON.stringify(pathToFileURL(output).href)})`};
assert.equal(typeof window, "undefined");
assert.equal(typeof document, "undefined");
assert.equal(h, require("vue").h);
assert.equal(host.hostH, h);
for (const route of ${JSON.stringify(routes)}) {
  assert.ok(Object.keys(host.entries[route]).length > 0, route + " has no ${mode} exports");
}
for (const forceMobile of [false, true]) {
  const app = createSSRApp({ render: () => h(host.entries[${JSON.stringify(name)}].DataTable, {
    data: [{ id: "proof", name: "Packed Node consumer" }],
    columns: [{ key: "name", header: "Person" }],
    rowKey: row => row.id, urlSync: false, forceMobile,
  }) });
  ${name === "@adapttable/vuetify" ? "app.use(host.createVuetify({ ssr: true }));" : ""}
  const html = await renderToString(app);
  assert.ok(html.includes("Packed Node consumer"), "Missing packed row");
  assert.ok(html.includes("Person"), "Missing column header");
}
console.log(${JSON.stringify(`${name}: all ${routes.length} actual ${mode} entries and desktop/mobile Node SSR passed`)});
`
  );
  process.stdout.write(
    execFileSync(process.execPath, [filename], { cwd, encoding: "utf8" })
  );
}

const isMain =
  Boolean(process.argv[1]) &&
  import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  let names = process.argv.slice(2);
  let expected;
  if (names[0] === "--routes") {
    expected = JSON.parse(readFileSync(names[1], "utf8"));
    names = names.slice(2);
  }
  for (const name of names) {
    assert.ok(VUE_HOST_PACKAGES.includes(name), `No host contract for ${name}`);
    if (expected)
      assert.ok(expected[name], `Missing repository routes for ${name}`);
    for (const mode of ["import", "require"]) {
      await verifyHost(name, mode, process.cwd(), expected?.[name]);
    }
  }
}
