import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, describe, it } from "node:test";

import { servedFile } from "./build-angular-browser-consumer.mjs";

describe("servedFile", () => {
  const root = mkdtempSync(join(tmpdir(), "angular-consumer-served-"));
  const site = join(root, "site");
  mkdirSync(join(site, "assets"), { recursive: true });
  writeFileSync(join(site, "index.html"), "<html></html>");
  writeFileSync(join(site, "main.js"), "");
  writeFileSync(join(root, "secret.txt"), "outside");
  after(() => rmSync(root, { recursive: true, force: true }));

  it("serves the index for the root and a built file by path", () => {
    assert.equal(servedFile(site, "/"), join(site, "index.html"));
    assert.equal(servedFile(site, "/main.js?v=1"), join(site, "main.js"));
  });

  it("serves nothing outside the build or for a missing file", () => {
    assert.equal(servedFile(site, "/../secret.txt"), undefined);
    assert.equal(servedFile(site, "/%2e%2e/secret.txt"), undefined);
    assert.equal(servedFile(site, "/missing.js"), undefined);
    assert.equal(servedFile(site, "/assets"), undefined);
  });
});
