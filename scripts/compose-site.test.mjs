/**
 * Composing the site: each framework's demo pages land under its own demo
 * root, with the shared build beside them, and nowhere else.
 */
import assert from "node:assert/strict";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { after, describe, it } from "node:test";

import { composeDemos } from "./compose-site.mjs";

const temps = [];

after(() => {
  for (const dir of temps) rmSync(dir, { recursive: true, force: true });
});

const write = (root, rel) => {
  const file = join(root, rel);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, rel);
};

const PAGES = [
  { html: "./index.html", framework: "react" },
  { html: "./mantine/index.html", framework: "react" },
  { html: "./mantine/pivot/index.html", framework: "react" },
  { html: "./columns/index.html", framework: null },
  { html: "./unstyled/index.html", framework: "angular" },
  { html: "./unstyled/filtering/index.html", framework: "angular" },
];

/** A build with React and Angular pages and the assets they share. */
function fixture() {
  const root = mkdtempSync(join(tmpdir(), "adapttable-compose-"));
  temps.push(root);
  const dist = join(root, "dist");
  for (const page of PAGES) write(dist, page.html.slice(2));
  write(dist, "assets/entry.js");
  write(dist, "favicon.svg");
  write(dist, "third-party-notices.txt");
  write(dist, "third-party-notices.json");
  return { dist, site: join(root, "site") };
}

describe("composeDemos", () => {
  it("serves each framework's pages under its own demo root", () => {
    const { dist, site } = fixture();
    composeDemos({ dist, site, pages: PAGES });
    for (const rel of [
      "react/demo/index.html",
      "react/demo/mantine/pivot/index.html",
      "react/demo/columns/index.html",
      "angular/demo/unstyled/filtering/index.html",
    ]) {
      assert.ok(existsSync(join(site, rel)), rel);
    }
  });

  it("keeps each framework's pages out of the other's root", () => {
    const { dist, site } = fixture();
    composeDemos({ dist, site, pages: PAGES });
    assert.equal(existsSync(join(site, "react/demo/unstyled")), false);
    assert.equal(existsSync(join(site, "angular/demo/mantine")), false);
    assert.equal(existsSync(join(site, "angular/demo/columns")), false);
    assert.equal(existsSync(join(site, "angular/demo/index.html")), false);
  });

  it("gives every root the shared build its pages load by relative path", () => {
    const { dist, site } = fixture();
    composeDemos({ dist, site, pages: PAGES });
    for (const root of ["react/demo", "angular/demo"]) {
      assert.ok(existsSync(join(site, root, "assets/entry.js")), root);
      assert.ok(existsSync(join(site, root, "favicon.svg")), root);
      assert.ok(existsSync(join(site, root, "third-party-notices.txt")), root);
      assert.ok(existsSync(join(site, root, "third-party-notices.json")), root);
    }
  });

  it("creates no section for a framework with no pages", () => {
    const { dist, site } = fixture();
    const roots = composeDemos({
      dist,
      site,
      pages: PAGES.filter((page) => page.framework !== "angular"),
    }).map(({ root }) => root);
    assert.deepEqual(roots, ["/react/demo/"]);
    assert.equal(existsSync(join(site, "angular")), false);
  });

  it("refuses a framework the site has no demo root for", () => {
    const { dist, site } = fixture();
    assert.throws(
      () =>
        composeDemos({
          dist,
          site,
          pages: [{ html: "./verdant/index.html", framework: "vue" }],
        }),
      /no demo root is served for "vue"/
    );
  });
});

it("relocates framework main/lab entries and preserves relative asset resolution", () => {
  const { dist, site } = fixture();
  write(dist, "angular-main/index.html");
  write(dist, "angular-all-options/index.html");
  const html =
    '<script src="../assets/angular.js"></script><link href="../assets/angular.css"><a href="/angular/getting-started/">Docs</a>';
  writeFileSync(join(dist, "angular-main/index.html"), html);
  writeFileSync(join(dist, "angular-all-options/index.html"), html);
  composeDemos({
    dist,
    site,
    pages: [
      ...PAGES,
      {
        html: "./angular-main/index.html",
        framework: "angular",
        route: "/angular/demo/",
      },
      {
        html: "./angular-all-options/index.html",
        framework: "angular",
        route: "/angular/demo/all-options/",
      },
    ],
  });
  const main = readFileSync(join(site, "angular/demo/index.html"), "utf8");
  assert.ok(main.includes('src="./assets/angular.js"'));
  assert.ok(main.includes('href="./assets/angular.css"'));
  assert.ok(main.includes('href="/angular/getting-started/"'));
  assert.ok(
    readFileSync(
      join(site, "angular/demo/all-options/index.html"),
      "utf8"
    ).includes('src="../assets/angular.js"')
  );
  assert.equal(existsSync(join(site, "angular/demo/angular-main")), false);
  assert.equal(existsSync(join(site, "react/demo/angular-main")), false);
});
