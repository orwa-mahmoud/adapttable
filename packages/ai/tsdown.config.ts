import { defineConfig, type UserConfig } from "tsdown";

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
  deps: { neverBundle: ["@adapttable/core"] },
};

export default defineConfig({
  ...common,
  entry: [
    "src/index.ts",
    "src/json.ts",
    "src/openai.ts",
    "src/mcp.ts",
    "src/http.ts",
    "src/assistant.ts",
  ],
});
