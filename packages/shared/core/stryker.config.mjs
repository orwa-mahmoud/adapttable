import floor from "./mutation-floor.json" with { type: "json" };

/** @type {import('@stryker-mutator/core').PartialStrykerOptions} */
const config = {
  packageManager: "pnpm",
  testRunner: "vitest",
  plugins: ["@stryker-mutator/vitest-runner"],
  mutate: [
    "src/url/urlStateCodec.ts",
    "src/url/serialize.ts",
    "src/export/csv.ts",
    "src/pagination/paginationMath.ts",
  ],
  vitest: {
    configFile: "vitest.mutation.config.ts",
  },
  // perTest attribution is unreliable on Vitest 4; off keeps the score honest.
  coverageAnalysis: "off",
  thresholds: {
    high: 100,
    low: floor.break,
    break: floor.break,
  },
  reporters: ["clear-text", "progress", "json"],
  jsonReporter: {
    fileName: "reports/mutation/mutation.json",
  },
  concurrency: 4,
  timeoutMS: 30000,
  tempDirName: ".stryker-tmp",
  cleanTempDir: true,
};

export default config;
