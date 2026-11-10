import { defineConfig } from "tsdown";

export default defineConfig({
  tsconfig: "./tsconfig.build.json",
  entry: [
    "src/index.ts",
    "src/binding.ts",
    "src/xlsx.ts",
    "src/pdf.ts",
    "src/pivot.ts",
    "src/formula.ts",
    "src/stream.ts",
    "src/query.ts",
    "src/conformance.ts",
    "src/engine.ts",
    "src/grouping.ts",
    "src/editing.ts",
    "src/selection.ts",
  ],
  format: ["esm", "cjs"],
  dts: { eager: true },
  sourcemap: true,
  clean: true,
  treeshake: true,
  // One chunk per label group, so a table that reads the base strings does
  // not import every feature's strings with them.
  outputOptions: {
    codeSplitting: {
      groups: [
        {
          name: (id) => {
            const group = /labelGroups[\\/](\w+)\.ts$/.exec(id);
            return group ? `labels-${group[1]}` : null;
          },
          test: /labelGroups[\\/]\w+\.ts$/,
        },
      ],
    },
  },
  outExtensions: ({ format }) => ({
    js: format === "es" ? ".js" : ".cjs",
    dts: format === "es" ? ".d.ts" : ".d.cts",
  }),
});
