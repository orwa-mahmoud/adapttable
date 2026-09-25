import { defineConfig } from "tsdown";

export default defineConfig([
  {
    // The programmatic library entry: ESM + CJS so require() users and
    // older tools resolve it too.
    entry: ["src/index.ts"],
    format: ["esm", "cjs"],
    dts: { entry: "src/index.ts" },
    sourcemap: true,
    clean: true,
    treeshake: true,
    outExtensions: ({ format }) => ({
      js: format === "es" ? ".js" : ".cjs",
      dts: format === "es" ? ".d.ts" : ".d.cts",
    }),
  },
  {
    // The executable: ESM with the shebang banner.
    entry: ["src/cli.ts"],
    format: ["esm"],
    sourcemap: true,
    treeshake: true,
    banner: { js: "#!/usr/bin/env node" },
    outExtensions: () => ({ js: ".js" }),
  },
]);
