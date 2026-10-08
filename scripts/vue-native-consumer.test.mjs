import assert from "node:assert/strict";
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { it } from "node:test";

import { packageDir } from "./packages.mjs";
import {
  VUE_NATIVE_BASE_SPECS,
  vueEmittedCss,
} from "./vue-consumer-fixtures.mjs";
import {
  buildVueNativeConsumer,
  vueNativeConsumerConfig,
} from "./vue-native-consumer.mjs";

it("uses official hosts for SDKs with SFCs or native import transforms", () => {
  assert.deepEqual(
    VUE_NATIVE_BASE_SPECS.filter((fixture) => fixture.consumerHost).map(
      (fixture) => fixture.pkg
    ),
    ["adapter-nuxt-ui", "adapter-quasar"]
  );
  const config = vueNativeConsumerConfig(
    "/fixture/main.mjs",
    "/fixture",
    true,
    []
  );
  assert.equal(config.build.write, false);
  assert.equal(config.build.minify, "oxc");
  assert.equal(config.build.cssMinify, true);
  assert.equal(config.build.cssCodeSplit, true);
  assert.equal(config.build.rolldownOptions.external("vue"), true);
  assert.equal(
    config.build.rolldownOptions.external("vue/server-renderer"),
    true
  );
  for (const name of [
    "@nuxt/ui",
    "reka-ui",
    "@adapttable/vue",
    "@adapttable/core",
  ])
    assert.equal(config.build.rolldownOptions.external(name), false, name);
  const readable = vueNativeConsumerConfig(
    "/fixture/main.mjs",
    "/fixture",
    false,
    []
  );
  assert.equal(readable.build.minify, false);
  assert.equal(readable.build.cssMinify, false);
});

it("compiles a real Nuxt UI component, generated theme and emitted stylesheet", async () => {
  const directory = mkdtempSync(join(tmpdir(), "vue-native-budget-"));
  const fromKit = createRequire(
    join(packageDir("adapter-nuxt-ui"), "package.json")
  );
  const component = fromKit.resolve("@nuxt/ui/components/Button.vue");
  const input = join(directory, "entry.mjs");
  writeFileSync(
    join(directory, "styles.css"),
    ".native-consumer-proof { color: red; }"
  );
  writeFileSync(
    input,
    `export { default as NativeButton } from ${JSON.stringify(component)};\nimport "./styles.css";`
  );
  try {
    const result = await buildVueNativeConsumer(
      { pkg: "adapter-nuxt-ui", consumerHost: "nuxt-vite" },
      input,
      directory,
      false
    );
    const chunks = result.output.filter((output) => output.type === "chunk");
    assert.ok(chunks.length);
    const modules = chunks.flatMap((chunk) => Object.keys(chunk.modules));
    assert.ok(modules.some((id) => id.endsWith("/components/Button.vue")));
    assert.ok(modules.includes("virtual:nuxt-ui-templates/ui/button.ts"));
    assert.ok(chunks.some((chunk) => chunk.code.includes("NativeButton")));
    assert.match(vueEmittedCss(result.output), /native-consumer-proof/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

it("uses Quasar's production per-component transform and retains emitted CSS", async () => {
  const directory = mkdtempSync(join(tmpdir(), "quasar-native-budget-"));
  const fromKit = createRequire(
    join(packageDir("adapter-quasar"), "package.json")
  );
  mkdirSync(join(directory, "node_modules"));
  symlinkSync(
    dirname(fromKit.resolve("quasar/package.json")),
    join(directory, "node_modules/quasar"),
    process.platform === "win32" ? "junction" : "dir"
  );
  const input = join(directory, "entry.js");
  writeFileSync(
    join(directory, "styles.css"),
    ".quasar-consumer-proof { color: red; }"
  );
  writeFileSync(
    input,
    'import { QBtn } from "quasar"; export { QBtn as NativeButton };\nimport "./styles.css";'
  );
  try {
    const result = await buildVueNativeConsumer(
      { pkg: "adapter-quasar", consumerHost: "quasar-vite" },
      input,
      directory,
      true
    );
    const chunks = result.output.filter((output) => output.type === "chunk");
    const modules = chunks.flatMap((chunk) => Object.keys(chunk.modules));
    assert.ok(
      modules.some((id) => id.includes("/quasar/src/components/btn/QBtn.js"))
    );
    assert.equal(
      modules.some((id) => id.includes("/quasar/dist/quasar.client")),
      false
    );
    assert.match(vueEmittedCss(result.output), /quasar-consumer-proof/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
