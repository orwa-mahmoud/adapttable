#!/usr/bin/env node
/**
 * Every Vue kit's own render tests on its minimum and its current Vue.
 *
 * Each kit runs through its own Vitest config — its aliases, Vite plugins and
 * environments intact — with `vue`, the `@vue/*` runtime and the SFC compiler
 * taken from the selected install. Vite resolves them there, and
 * `vue-peer-resolve.mjs` sends a UI library's own CommonJS requires to the same
 * files, so the kit and its library share one Vue runtime. The floor is the
 * kit's own declared peer: Nuxt UI needs Vue 3.5.18, every other kit 3.5.0. A
 * run also proves which Vue it loaded.
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { installFloor } from "./check-vue-peer-types.mjs";
import { packageDir, REPO_ROOT } from "./packages.mjs";

const require = createRequire(import.meta.url);
const readJson = (file) => JSON.parse(readFileSync(file, "utf8"));

/** The tests each kit runs per Vue: its contract render, preset and table. */
export const KIT_PEER_RUNS = {
  "adapter-element-plus": [
    {
      files: [
        "test/structural-parts.ssr.test.ts",
        "test/preset.ssr.test.ts",
        "test/table-presentation.test.ts",
      ],
    },
  ],
  "adapter-naive-ui": [
    {
      files: [
        "test/structural-parts.ssr.test.ts",
        "test/preset.ssr.test.ts",
        "test/data-table.test.ts",
      ],
    },
  ],
  "adapter-nuxt-ui": [
    {
      files: [
        "test/structural-parts.ssr.test.ts",
        "test/preset.ssr.test.ts",
        "test/table.test.ts",
      ],
    },
  ],
  "adapter-quasar": [
    {
      env: { ADAPTTABLE_QUASAR_SSR: "1" },
      files: ["test/structural-parts.ssr.test.ts", "test/preset.ssr.test.ts"],
    },
    { files: ["test/preset.test.ts", "test/table.test.ts"] },
  ],
  "adapter-reka-ui": [
    {
      files: [
        "test/structural-parts.ssr.test.ts",
        "test/table-integration.test.ts",
      ],
    },
  ],
  "adapter-shadcn-vue": [
    { files: ["test/structural-parts.ssr.test.ts", "test/table.test.ts"] },
  ],
  "adapter-vuetify": [
    {
      files: [
        "test/structural-parts.ssr.test.ts",
        "test/preset.ssr.test.ts",
        "test/table.test.ts",
      ],
    },
  ],
};

const RESOLVE_HOOK = join(REPO_ROOT, "scripts/vue-peer-resolve.mjs");
const VERSION_TEST = join(
  REPO_ROOT,
  "scripts/vue-peer-consumer-fixtures/version.test.ts"
);

/** A kit's Vue floor, read from its own `^x.y.z` peer range. */
export function kitFloor(folder) {
  const range = readJson(join(packageDir(folder), "package.json"))
    .peerDependencies?.vue;
  const floor = /^\^(\d+\.\d+\.\d+)$/.exec(range ?? "")?.[1];
  assert.ok(floor, `${folder}: unsupported Vue peer range ${range}`);
  return floor;
}

/** The Vitest config that runs one kit's own config on one Vue install. */
export function kitPeerConfig(folder, vueRoot) {
  // Vue resolves to the install's CommonJS entries, kept external, so modules
  // Vite transforms and CommonJS modules Node requires (through
  // vue-peer-resolve.mjs) share one Vue runtime.
  const fromVue = createRequire(join(vueRoot, "package.json"));
  const aliases = [
    ["^vue$", fromVue.resolve("vue")],
    ["^vue/server-renderer$", fromVue.resolve("vue/server-renderer")],
    ...[
      "runtime-core",
      "runtime-dom",
      "reactivity",
      "shared",
      "server-renderer",
    ].map((name) => [`^@vue/${name}$`, fromVue.resolve(`@vue/${name}`)]),
  ];
  const kitConfig = join(packageDir(folder), "vitest.config.ts");
  // The config is written outside the workspace, so Vitest is imported by
  // its resolved location rather than by a bare specifier.
  const vitestConfig = fileURLToPath(import.meta.resolve("vitest/config"));
  const compiler = fromVue.resolve("@vue/compiler-sfc");
  const typescript = require.resolve("typescript");
  return `import { createRequire } from "node:module";

import { mergeConfig } from ${JSON.stringify(vitestConfig)};

import base from ${JSON.stringify(kitConfig)};

// SFCs compile with the selected install's own compiler, given the
// workspace's TypeScript, inside the kit's own Vue plugin and its options.
const load = createRequire(import.meta.url);
const compiler = load(${JSON.stringify(compiler)});
compiler.registerTS(() => load(${JSON.stringify(typescript)}));
for (const plugin of [base.plugins ?? []].flat(Infinity))
  if (plugin?.name === "vite:vue")
    plugin.api.options = { ...plugin.api.options, compiler };

export default mergeConfig(base, {
  root: ${JSON.stringify(packageDir(folder))},
  resolve: {
    dedupe: ["vue"],
    alias: [
${aliases
  .map(
    ([find, replacement]) =>
      `      { find: new RegExp(${JSON.stringify(find)}), replacement: ${JSON.stringify(replacement)} },`
  )
  .join("\n")}
    ],
  },
  test: {
    include: [${JSON.stringify(VERSION_TEST)}],
    pool: "forks",
    server: {
      deps: { inline: [/^(?!.*\\/node_modules\\/(?:vue|@vue)\\/).*$/] },
    },
    coverage: { enabled: false },
  },
});
`;
}

/** Run one kit's selected tests on one Vue install, and prove the version. */
export function runKitPeer(scratch, folder, vueRoot, label) {
  const version = readJson(join(vueRoot, "package.json")).version;
  const vitest = join(
    dirname(require.resolve("vitest/package.json")),
    "vitest.mjs"
  );
  for (const [index, run] of KIT_PEER_RUNS[folder].entries()) {
    const config = join(scratch, `${folder}-${label}-${index}.vitest.mjs`);
    writeFileSync(config, kitPeerConfig(folder, vueRoot));
    const result = spawnSync(
      process.execPath,
      [
        "--max-old-space-size=4096",
        vitest,
        "run",
        "--config",
        config,
        "--reporter=dot",
        "version.test.ts",
        ...run.files,
      ],
      {
        cwd: packageDir(folder),
        encoding: "utf8",
        maxBuffer: 16 * 1024 * 1024,
        env: {
          ...process.env,
          ...run.env,
          ADAPTTABLE_VUE_PEER_ROOT: vueRoot,
          ADAPTTABLE_VUE_PEER_VERSION: version,
          NODE_OPTIONS: [
            process.env.NODE_OPTIONS,
            `--import=${pathToFileURL(RESOLVE_HOOK).href}`,
          ]
            .filter(Boolean)
            .join(" "),
        },
      }
    );
    if (result.error) throw result.error;
    const output = `${result.stdout}\n${result.stderr}`;
    assert.equal(result.status, 0, `${folder} on Vue ${version}:\n${output}`);
    const files = /Test Files\s+(\d+) passed/.exec(output)?.[1];
    assert.equal(
      Number(files),
      run.files.length + 1,
      `${folder} on Vue ${version} ran an unexpected set of files:\n${output}`
    );
  }
  console.log(`${folder}: Vue ${version} (${label}) passed`);
}

export function checkVueKitPeers(only = []) {
  const scratch = realpathSync(
    mkdtempSync(join(tmpdir(), "adapttable-vue-kit-peers-"))
  );
  try {
    const floors = new Map();
    const floorRoot = (version) => {
      if (!floors.has(version)) {
        const dir = join(scratch, `vue-${version}`);
        mkdirSync(dir);
        floors.set(version, realpathSync(installFloor(dir, version)));
      }
      return floors.get(version);
    };
    const kits = Object.keys(KIT_PEER_RUNS).filter(
      (folder) => only.length === 0 || only.includes(folder)
    );
    assert.ok(kits.length > 0, `No Vue kit matches ${only.join(", ")}`);
    for (const folder of kits) {
      const floor = kitFloor(folder);
      const current = realpathSync(
        join(packageDir(folder), "node_modules/vue")
      );
      runKitPeer(scratch, folder, floorRoot(floor), "floor");
      runKitPeer(scratch, folder, current, "current");
    }
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  checkVueKitPeers(process.argv.slice(2));
}
