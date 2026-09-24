import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { after, describe, it } from "node:test";

import {
  brokenLinks,
  pageUrl,
  serves,
  targetPath,
} from "./check-site-links.mjs";
import { ORIGIN } from "./site.mjs";

const temps = [];
after(() => {
  for (const dir of temps) rmSync(dir, { recursive: true, force: true });
});

const write = (root, rel, body) => {
  const file = join(root, rel);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, body);
};

const site = (pages) => {
  const root = mkdtempSync(join(tmpdir(), "adapttable-links-"));
  temps.push(root);
  for (const [rel, body] of Object.entries(pages)) write(root, rel, body);
  return root;
};

describe("targetPath", () => {
  it("resolves relative, root-relative and same-origin links", () => {
    assert.equal(targetPath("../b/", "/a/x/"), "/a/b/");
    assert.equal(targetPath("/c/", "/a/"), "/c/");
    assert.equal(targetPath(`${ORIGIN}/d/`, "/"), "/d/");
  });

  it("ignores links it does not own", () => {
    for (const link of [
      "#top",
      "",
      "mailto:a@example.com",
      "https://example.com/",
      "data:image/png;base64,AAAA",
      "${SITE}/x/",
    ]) {
      assert.equal(targetPath(link, "/"), undefined, link);
    }
  });
});

describe("serves", () => {
  it("serves a directory index, a file, and an extensionless page", () => {
    const root = site({
      "a/index.html": "",
      "b.html": "",
      "img.png": "",
    });
    assert.equal(serves(root, "/a/"), true);
    assert.equal(serves(root, "/a"), true);
    assert.equal(serves(root, "/b"), true);
    assert.equal(serves(root, "/img.png"), true);
    assert.equal(serves(root, "/missing/"), false);
  });
});

describe("brokenLinks", () => {
  it("names each link that resolves to nothing, and skips the not-found page", () => {
    const root = site({
      "index.html":
        '<a href="/a/">a</a><img src="/img.png"><a href="/gone/">x</a>',
      "a/index.html": `<a href="../">home</a><a href="${ORIGIN}/nowhere/">n</a>`,
      "img.png": "",
      "404.html": '<link rel="canonical" href="/404/">',
    });
    assert.deepEqual(brokenLinks(root), [
      { page: "/", link: "/gone/" },
      { page: "/a/", link: `${ORIGIN}/nowhere/` },
    ]);
  });

  it("maps a built file to the URL it is served at", () => {
    assert.equal(pageUrl("index.html"), "/");
    assert.equal(pageUrl("a/b/index.html"), "/a/b/");
    assert.equal(pageUrl("x.html"), "/x.html");
  });
});
