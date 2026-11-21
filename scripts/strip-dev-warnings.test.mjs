import assert from "node:assert/strict";
import { it } from "node:test";

import { originalPositionFor, TraceMap } from "@jridgewell/trace-mapping";
import { Rolldown } from "tsdown";

import { stripDevWarnings } from "./strip-dev-warnings.mjs";

const WARN = `export function devWarn(message) { console.warn(message); }`;

/** The module id an import names, among the test's own sources. */
function sourceId(id, sources) {
  if (id === "./warn") return "/virtual/warn.ts";
  return id in sources ? id : null;
}

/** Bundle `entry` (TypeScript) beside a `warn` module, with the plugin. */
async function bundle(entry) {
  return (await bundleOutput(entry)).code;
}

/** The bundle's first chunk, with its source map. */
async function bundleOutput(entry) {
  const sources = { "/virtual/entry.ts": entry, "/virtual/warn.ts": WARN };
  const build = await Rolldown.rolldown({
    input: "/virtual/entry.ts",
    plugins: [
      {
        name: "sources",
        resolveId: (id) => sourceId(id, sources),
        load: (id) => sources[id] ?? null,
      },
      stripDevWarnings({
        callee: "devWarn",
        include: (id) => id === "/virtual/entry.ts",
      }),
    ],
  });
  const { output } = await build.generate({ format: "esm", sourcemap: true });
  return output[0];
}

it("drops each warning statement and its message, braced or not", async () => {
  const code = await bundle(`
    import { devWarn } from "./warn";
    export function check(value: number): number {
      if (value < 0) devWarn(\`negative \${String(value)}\`);
      if (value > 9) {
        devWarn("too large");
      }
      return value;
    }
  `);
  assert.doesNotMatch(code, /negative|too large|console\.warn/);
  assert.match(code, /function check/);
});

it("fails on a warning used as a value, whose text it cannot drop", async () => {
  await assert.rejects(
    bundle(`
      import { devWarn } from "./warn";
      export const warned = (value: number) => value < 0 && devWarn("negative");
    `),
    /used as a value/
  );
});

it("fails when a module it reads has nothing to drop, so no warning ships unnoticed", async () => {
  await assert.rejects(
    bundle(`export const value = 1;`),
    /no devWarn\(\) statement was dropped/
  );
});

it("keeps every position of a module it edits in the bundle's source map", async () => {
  const entry = [
    `import { devWarn } from "./warn";`,
    `export function check(value: number): number {`,
    `  if (value < 0) devWarn("negative");`,
    `  const doubled = value * 2;`,
    `  return doubled;`,
    `}`,
  ].join("\n");
  const { code, map } = await bundleOutput(entry);
  const lines = code.split("\n");
  const line = lines.findIndex((text) => text.includes("value * 2"));
  assert.notEqual(line, -1);
  const position = originalPositionFor(new TraceMap(map.toString()), {
    line: line + 1,
    column: lines[line].indexOf("value * 2"),
  });
  assert.match(position.source ?? "", /\/virtual\/entry\.ts$/);
  assert.equal(position.line, 4);
  assert.equal(position.column, entry.split("\n")[3].indexOf("value * 2"));
});
