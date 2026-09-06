import { defineConfig, type UserConfig } from "tsdown";

/** Shared toolchain. The two passes below must not share chunks. */
const common: UserConfig = {
  tsconfig: "./tsconfig.build.json",
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  outExtensions: ({ format }) => ({
    js: format === "es" ? ".js" : ".cjs",
    dts: format === "es" ? ".d.ts" : ".d.cts",
  }),
  deps: { neverBundle: ["@adapttable/core", "react"] },
};

/**
 * Two passes, because `"use client"` is a boundary.
 *
 * `@adapttable/ai/react` mounts a provider and `@adapttable/ai/assistant`
 * runs hooks, so both must mark themselves. The root,
 * JSON, OpenAI and MCP entries are React-free and must stay unmarked — a
 * directive there would keep catalog/describe/execute out of a route handler.
 * Separate bundles keep the session helpers from sharing a chunk with hooks.
 */
export default defineConfig([
  {
    ...common,
    banner: { js: '"use client";' },
    entry: ["src/react.tsx", "src/assistant.tsx"],
  },
  {
    ...common,
    entry: [
      "src/index.ts",
      "src/json.ts",
      "src/openai.ts",
      "src/mcp.ts",
      "src/http.ts",
    ],
  },
]);
