/** Build and render exactly what init writes, with real installed native SDKs. */
import { execFile } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { describe, expect, it } from "vitest";

import { KITS } from "./detect";
import { type InitIO, runInit } from "./init";

const execute = promisify(execFile);
const repo = fileURLToPath(new URL("../../../../", import.meta.url));
const showcase = createRequire(join(repo, "apps/showcase/package.json"));
const tooling = createRequire(join(repo, "package.json"));
const expectedRows = [
  ["Ada Lovelace", "ada@example.com", "Engineer"],
  ["Alan Turing", "alan@example.com", "Founder"],
  ["Grace Hopper", "grace@example.com", "Admiral"],
];

function link(root: string, name: string, directory: string): void {
  const target = join(root, "node_modules", name);
  mkdirSync(dirname(target), { recursive: true });
  symlinkSync(directory, target, "junction");
}

describe(
  "init in fresh Vue/Vite native applications",
  { concurrent: false },
  () => {
    it.each(KITS.filter((kit) => kit.framework === "vue"))(
      "builds, renders and sorts $kit",
      async (kit) => {
        const root = mkdtempSync(join(tmpdir(), "adapttable-vue-scaffold-"));
        try {
          writeFileSync(
            join(root, "package.json"),
            JSON.stringify({
              private: true,
              type: "module",
              dependencies: { vue: "^3.5.43" },
            })
          );
          const io: InitIO = {
            readFile: (path) =>
              existsSync(join(root, path))
                ? readFileSync(join(root, path), "utf8")
                : undefined,
            exists: (path) => existsSync(join(root, path)),
            writeFile: (path, contents) => {
              mkdirSync(dirname(join(root, path)), { recursive: true });
              writeFileSync(join(root, path), contents);
            },
            listRootFiles: () => readdirSync(root),
            log: () => undefined,
          };
          const result = runInit(io, { kit: kit.kit });
          expect(result.framework).toBe("vue");
          expect(result.adapter).toBe(kit.adapter);
          for (const [name, folder] of [
            ["@adapttable/core", "packages/shared/core"],
            ["@adapttable/vue", "packages/vue/vue"],
            [kit.adapter, `packages/vue/adapter-${kit.kit}`],
          ])
            link(root, name!, join(repo, folder!));
          for (const name of [
            "vue",
            "vite",
            "@vitejs/plugin-vue",
            "@quasar/vite-plugin",
            ...kit.extras.map((specifier) =>
              specifier.slice(0, specifier.indexOf("@", 1))
            ),
          ]) {
            if (name === "unifont") continue; // Exact floor is checked by the installed Nuxt UI host's dependency graph.
            const source = join(repo, "apps/showcase/node_modules", name);
            if (!existsSync(join(root, "node_modules", name)))
              link(root, name, source);
          }
          link(root, "jsdom", dirname(tooling.resolve("jsdom/package.json")));
          const nativePlugins = existsSync(join(root, "adapttable.vite.ts"));
          io.writeFile(
            "vite.config.ts",
            nativePlugins
              ? 'import { defineConfig } from "vite";\nimport { adaptTableViteConfig } from "./adapttable.vite.ts";\nexport default defineConfig(adaptTableViteConfig);\n'
              : 'import { defineConfig } from "vite";\nimport vue from "@vitejs/plugin-vue";\nexport default defineConfig({ plugins: [vue()] });\n'
          );
          io.writeFile(
            "src/App.vue",
            '<script setup lang="ts">\nimport PeopleTable from "./PeopleTable.vue";\n</script>\n<template><PeopleTable /></template>\n'
          );
          io.writeFile(
            "src/main.ts",
            'import { createApp } from "vue";\nimport App from "./App.vue";\nimport { installAdaptTable } from "./adapttable";\nconst app = createApp(App);\ninstallAdaptTable(app);\napp.mount("#app");\n'
          );
          io.writeFile(
            "index.html",
            '<html><head><title>Native scaffold</title></head><body><div id="app" class="isolate"></div><script type="module" src="/src/main.ts"></script></body></html>'
          );
          cpSync(
            fileURLToPath(
              new URL("../test-fixtures/vue-app/build.ts", import.meta.url)
            ),
            join(root, "build.ts")
          );
          // External host compilation keeps Vue SFC/vendor transforms out of Vitest.
          await execute(
            process.execPath,
            ["--experimental-strip-types", join(root, "build.ts")],
            {
              cwd: root,
              timeout: 120000,
              maxBuffer: 4 * 1024 * 1024,
            }
          ).catch((error: unknown) => {
            const failure = error as Error & {
              stdout?: string;
              stderr?: string;
            };
            throw new Error(
              `${failure.message}\n${failure.stdout ?? ""}\n${failure.stderr ?? ""}`,
              { cause: error }
            );
          });
          const rendered = JSON.parse(
            readFileSync(join(root, "rendered.json"), "utf8")
          ) as {
            initialRows: string[][];
            descendingRows: string[][];
            tableCount: number;
            errors: string[];
            sortClass: string;
          };
          expect(rendered.errors).toEqual([]);
          expect(rendered.initialRows).toEqual(expectedRows);
          expect(rendered.descendingRows).toEqual([...expectedRows].reverse());
          expect(rendered.tableCount).toBe(1);
          const classes: Record<string, string> = {
            "ant-design-vue": "ant-btn",
            "element-plus": "el-button",
            "naive-ui": "n-button",
            "nuxt-ui": "focus-visible",
            quasar: "q-btn",
            vuetify: "v-btn",
          };
          if (classes[kit.kit])
            expect(rendered.sortClass).toContain(classes[kit.kit]);
          expect(showcase.resolve("vue")).toBeTruthy();
        } finally {
          rmSync(root, { recursive: true, force: true });
        }
      },
      120000
    );
  }
);
