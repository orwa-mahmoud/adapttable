import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import { hashesFromDist, urlFromRel, urlsToSubmit } from "./indexnow-delta.mjs";
import { SITE } from "./sitemap-routes.mjs";

describe("urlFromRel", () => {
  it("maps the site root and nested index.html to slash URLs", () => {
    assert.equal(urlFromRel("index.html"), `${SITE}/`);
    assert.equal(urlFromRel("filtering/index.html"), `${SITE}/filtering/`);
    assert.equal(
      urlFromRel("demo/mantine/editing/index.html"),
      `${SITE}/demo/mantine/editing/`
    );
  });
});

describe("urlsToSubmit", () => {
  it("submits nothing on the first seed so the whole sitemap is not blasted", () => {
    assert.deepEqual(urlsToSubmit({}, { [`${SITE}/`]: "aaa" }), []);
    assert.deepEqual(urlsToSubmit(null, { [`${SITE}/`]: "aaa" }), []);
  });

  it("submits only URLs whose hash changed or that are new", () => {
    const prev = { [`${SITE}/`]: "aaa", [`${SITE}/filtering/`]: "bbb" };
    const next = {
      [`${SITE}/`]: "aaa",
      [`${SITE}/filtering/`]: "ccc",
      [`${SITE}/pivot/`]: "ddd",
    };
    assert.deepEqual(urlsToSubmit(prev, next), [
      `${SITE}/filtering/`,
      `${SITE}/pivot/`,
    ]);
  });
});

describe("hashesFromDist", () => {
  it("hashes each html file under the composed tree", () => {
    const root = mkdtempSync(join(tmpdir(), "indexnow-"));
    mkdirSync(join(root, "filtering"));
    writeFileSync(join(root, "index.html"), "<html>home</html>");
    writeFileSync(join(root, "filtering", "index.html"), "<html>f</html>");
    const hashes = hashesFromDist(root);
    assert.equal(Object.keys(hashes).sort().length, 2);
    assert.ok(hashes[`${SITE}/`]);
    assert.ok(hashes[`${SITE}/filtering/`]);
    assert.notEqual(hashes[`${SITE}/`], hashes[`${SITE}/filtering/`]);
  });
});
