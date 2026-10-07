import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  kitLoadDependencies,
  kitLoadOverrides,
  runtimeProbeRoutes,
} from "./node-support-harness.mjs";
import {
  assertVueHostGraph,
  assertVueHostRoutes,
  vueHostRoutes,
} from "./node-support-vue-host.mjs";

const fixture = {
  name: "@adapttable/nuxt-ui",
  directory: "adapter-nuxt-ui",
  manifest: {
    engines: { node: ">=22.12.0" },
    peerDependencies: { "@nuxt/ui": "^4.11.3", vue: "^3.5.2" },
    exports: {
      ".": { import: "./dist/index.js", require: "./dist/index.cjs" },
      "./feature": {
        import: "./dist/feature.js",
        require: "./dist/feature.cjs",
      },
      "./extra": "./dist/extra.js",
      "./styles.css": "./dist/styles.css",
      "./package.json": "./package.json",
    },
  },
};

describe("packed Vue host contracts", () => {
  it("rejects a packed manifest that drops an expected host feature", () => {
    const expected = ["@adapttable/nuxt-ui", "@adapttable/nuxt-ui/feature"];
    assert.throws(
      () => assertVueHostRoutes(expected, [expected[0]]),
      /differs from repository exports/
    );
    assert.doesNotThrow(() =>
      assertVueHostRoutes(expected, [...expected].reverse())
    );
  });
  it("preserves all roots and adds every code subpath without loading metadata or CSS as JS", () => {
    assert.deepEqual(vueHostRoutes(fixture.name, fixture.manifest), [
      fixture.name,
      `${fixture.name}/feature`,
      `${fixture.name}/extra`,
    ]);
    const routes = runtimeProbeRoutes([
      fixture,
      { name: "@adapttable/react", directory: "react", manifest: {} },
    ]);
    for (const route of [
      "@adapttable/react",
      "@adapttable/react/adapter",
      "@adapttable/core/query",
      fixture.name,
      `${fixture.name}/feature`,
      `${fixture.name}/extra`,
    ])
      assert.ok(routes.includes(route), route);
  });

  it("installs the official Vue host only when the published kit needs it", () => {
    const deps = kitLoadDependencies([fixture], "22.12.0");
    assert.equal(deps.vite, "^8.3.0");
    assert.equal(deps["@vitejs/plugin-vue"], "^6.0.9");
    assert.equal(deps["@nuxt/ui"], "^4.11.3");
    assert.equal(kitLoadDependencies([], "22.12.0").vite, undefined);
  });

  it("scopes the official alias tarball to the verified vendor version and retains packed overrides", () => {
    const packed = { "@adapttable/core": "file:/packs/core.tgz" };
    const before = { ...packed };
    const override = kitLoadOverrides(packed, { "element-plus": "^2.14.7" });
    assert.equal(override["@adapttable/core"], packed["@adapttable/core"]);
    assert.equal(override["element-plus"], undefined);
    assert.deepEqual(override["element-plus@2.14.7"], {
      "@popperjs/core":
        "https://registry.npmjs.org/@sxzz/popperjs-es/-/popperjs-es-2.11.8.tgz",
    });
    assert.deepEqual(packed, before);
    assert.deepEqual(kitLoadOverrides(packed, {}), packed);
  });

  it("keeps the real Popper co-install regression on the Node floor", () => {
    const deps = kitLoadDependencies(
      [
        {
          ...fixture,
          name: "@adapttable/element-plus",
          manifest: {
            ...fixture.manifest,
            peerDependencies: { "element-plus": "^2.14.7", vue: "^3.5.0" },
          },
        },
      ],
      "22.12.0"
    );
    assert.equal(deps["@popperjs/core"], "^2.11.8");
  });

  it("rejects an ESM bundle merely emitted as CommonJS", () => {
    const expected = [
      "/consumer/node_modules/@adapttable/vuetify/dist/index.cjs",
    ];
    const css = "/consumer/node_modules/vuetify/lib/components/VBtn/VBtn.css";
    assert.throws(
      () =>
        assertVueHostGraph("@adapttable/vuetify", "require", expected, [
          expected[0].replace(".cjs", ".js"),
          css,
        ]),
      /did not consume require entry/
    );
    assert.doesNotThrow(() =>
      assertVueHostGraph("@adapttable/vuetify", "require", expected, [
        ...expected,
        css,
      ])
    );
  });

  it("rejects a dropped feature entry and bypassed vendor processing", () => {
    const root = "/consumer/node_modules/@adapttable/nuxt-ui/dist/index.js";
    const feature =
      "/consumer/node_modules/@adapttable/nuxt-ui/dist/feature.js";
    const sfc =
      "/consumer/node_modules/@nuxt/ui/dist/runtime/components/App.vue";
    assert.throws(
      () =>
        assertVueHostGraph(
          "@adapttable/nuxt-ui",
          "import",
          [root, feature],
          [root, sfc]
        ),
      /did not consume import entry/
    );
    assert.throws(
      () => assertVueHostGraph("@adapttable/nuxt-ui", "import", [root], [root]),
      /SFCs were not compiled/
    );
    assert.throws(
      () => assertVueHostGraph("@adapttable/vuetify", "import", [root], [root]),
      /CSS was not processed/
    );
  });
});
