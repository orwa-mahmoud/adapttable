import path from "node:path";
import { fileURLToPath } from "node:url";

import angular from "@analogjs/vite-plugin-angular";
import { defineConfig } from "vitest/config";

const packageDir = path.dirname(fileURLToPath(import.meta.url));

// Server rendering needs a process with no browser globals and no browser
// testing platform, so the SSR specs run here: Node, and no TestBed setup.
export default defineConfig({
  plugins: [angular({ tsconfig: path.join(packageDir, "tsconfig.spec.json") })],
  resolve: {
    alias: [
      {
        find: /^@adapttable\/angular-cdk$/,
        replacement: path.resolve(packageDir, "src/index.ts"),
      },
      {
        find: /^@adapttable\/angular-cdk\/(.+)$/,
        replacement: path.resolve(packageDir, "$1/index.ts"),
      },
      {
        find: /^@adapttable\/core$/,
        replacement: path.resolve(packageDir, "../../shared/core/src/index.ts"),
      },
      {
        find: /^@adapttable\/core\/(.+)$/,
        replacement: path.resolve(packageDir, "../../shared/core/src/$1.ts"),
      },
    ],
  },
  test: {
    environment: "node",
    include: ["src/**/*.ssr.test.ts"],
    pool: "threads",
  },
});
