import assert from "node:assert/strict";
import { it } from "node:test";

import { Rolldown } from "tsdown";

import { stripDevWarnings } from "./strip-dev-warnings.mjs";

const WARN = `export function devWarn(message) { console.warn(message); }`;

/** The module id an import names, among the test's own sources. */
function sourceId(id, sources) {
  if (id === "./warn") return "\0warn.ts";
  return id in sources ? id : null;
}

/** Bundle `entry` (TypeScript) beside a `warn` module, with the plugin. */
async function bundle(entry) {
  const sources = { "\0entry.ts": entry, "\0warn.ts": WARN };
  const build = await Rolldown.rolldown({
    input: "\0entry.ts",
    plugins: [
      {
        name: "sources",
        resolveId: (id) => sourceId(id, sources),
        load: (id) => sources[id] ?? null,
      },
      stripDevWarnings({
        callee: "devWarn",
        include: (id) => id === "\0entry.ts",
      }),
    ],
  });
  const { output } = await build.generate({ format: "esm" });
  return output[0].code;
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
