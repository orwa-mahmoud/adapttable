import { defineConfig } from "vitest/config";

/**
 * Self-contained suite for mutation testing of the URL / CSV / pagination
 * pipelines. Avoids the repo-root shared config so Stryker's sandbox can
 * resolve it. `jsdom` is required for the CSV download tests.
 */
export default defineConfig({
  test: {
    environment: "jsdom",
    include: [
      "src/url/urlStateCodec.test.ts",
      "src/url/urlStateCodec.property.test.ts",
      "src/url/serialize.test.ts",
      "src/url/serialize.property.test.ts",
      "src/export/csv.test.ts",
      "src/export/csv.property.test.ts",
      "src/pagination/paginationMath.test.ts",
      "src/pagination/paginationMath.property.test.ts",
    ],
  },
});
