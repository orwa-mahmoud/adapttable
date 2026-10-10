import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { describe, it } from "node:test";

// Resolve through ESLint so a missing pnpm patch fails this test.
const rootRequire = createRequire(new URL("../package.json", import.meta.url));
const require = createRequire(rootRequire.resolve("eslint/package.json"));
const { sprintf } = require("sprintf-js");

describe("the installed sprintf-js patch", () => {
  it("keeps ordinary precision", () => {
    assert.equal(sprintf("%.2f", 1.2), "1.20");
    assert.equal(sprintf("%.2e", 1), "1.00e+0");
    assert.equal(sprintf("%.2g", 1.23), "1.2");
  });

  it("clamps precision above the ECMAScript limit of 100", () => {
    assert.equal(sprintf("%.10000f", 1), `1.${"0".repeat(100)}`);
    assert.equal(sprintf("%.10000e", 1).startsWith("1."), true);
    assert.ok(sprintf("%.10000g", 1).length < 120);
  });
});
