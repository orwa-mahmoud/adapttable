/** Current/floor runtime checks. Source ownership and isolated artifacts are separate cells. */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

import vue from "@vitejs/plugin-vue";
import ts from "typescript";
import { defineConfig } from "vitest/config";

import { packageDir, REPO_ROOT } from "./packages.mjs";

const vueRoot = process.env.ADAPTTABLE_VUE_PEER_ROOT;
assert.ok(vueRoot, "Run through check-vue-built-peers.mjs");
const cell = process.env.ADAPTTABLE_VUE_PEER_CELL;
const fromVue = createRequire(join(vueRoot, "package.json"));
const compiler = fromVue("@vue/compiler-sfc");
compiler.registerTS(() => ts);
const sourceAliases = [
  ["@adapttable/core", "core"],
  ["@adapttable/vue", "vue"],
  ["@adapttable/vue-unstyled", "adapter-vue-unstyled"],
].flatMap(([name, folder]) => [
  {
    find: new RegExp(`^${name}$`),
    replacement: join(packageDir(folder), "src/index.ts"),
  },
  {
    find: new RegExp(`^${name}/(.+)$`),
    replacement: join(packageDir(folder), "src/$1.ts"),
  },
]);
const bindingTests = [
  "filterHeaderControl",
  "findDependencies",
  "runtimeSelectionScope",
  "selectionControl",
  "selectionLifetime",
  "selectionLifetimeReview",
  "rowReorderProjection",
  "specializedOwnership",
];
const bindingSourceTests = [
  "assistant/assistantActionOwnership",
  "columns/columnLayoutKeepAlive",
  "columns/columnLayoutPersistence.ssr",
  "columns/columnLayoutStorage",
  "url/columnLayoutPersistence",
  "url/columnLayoutReentry",
  "url/savedViewsFlush",
];
const nativeTests = [
  "showcase-entry-mount",
  "assistant-showcase-undo",
  "navigation-find.ssr",
  "layout-persistence",
  "selection-lifetime",
  "row-move-host-confirmation",
  "row-move-ownership",
  "generic-component-lifetime",
  "editing-native",
  "editing-mount-cost",
  "filter-native",
  "filter-dialog-focus",
  "composed-features",
  "composition-parts",
  "filter-parts",
  "filter-clear-state",
  "filter-header-inline",
  "filter-header-navigation",
  "filter-backdrop",
  "specialized-native",
];
export default defineConfig({
  root: cell || REPO_ROOT,
  plugins: [vue({ compiler })],
  resolve: {
    dedupe: ["vue"],
    alias: [
      ...(cell
        ? []
        : [
            {
              find: /^@adapttable\/vue-unstyled\/styles\.css$/,
              replacement:
                join(
                  packageDir("adapter-vue-unstyled"),
                  "src/filters/NativeFilterDialog.vue"
                ) + "?vue&type=style&index=0&lang.css",
            },
          ]),
      {
        find: /^vue$/,
        replacement: join(vueRoot, "dist/vue.runtime.esm-bundler.js"),
      },
      {
        find: /^vue\/server-renderer$/,
        replacement: join(vueRoot, "server-renderer/index.mjs"),
      },
      {
        find: /^@vue\/server-renderer$/,
        replacement: dirname(
          fromVue.resolve("@vue/server-renderer/package.json")
        ),
      },
      ...(cell ? [] : sourceAliases),
    ],
  },
  test: {
    environment: "jsdom",
    include: cell
      ? ["consumers/runtime.test.ts"]
      : [
          ...bindingTests.map((name) =>
            join(packageDir("vue"), `test/${name}.test.ts`)
          ),
          ...bindingSourceTests.map((name) =>
            join(packageDir("vue"), `src/${name}.test.ts`)
          ),
          ...nativeTests.map((name) =>
            join(packageDir("adapter-vue-unstyled"), `test/${name}.test.ts`)
          ),
          join(REPO_ROOT, "scripts/vue-peer-consumer-fixtures/version.test.ts"),
        ],
    server: { deps: { inline: [/^@adapttable\//, /^vue(?:\/|$)/, /^@vue\//] } },
    globals: true,
    clearMocks: true,
    restoreMocks: true,
    pool: "threads",
    maxWorkers: 1,
    fileParallelism: false,
  },
});
