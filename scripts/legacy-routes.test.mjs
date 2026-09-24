import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { lstatSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { gitBinary } from "./git-binary.mjs";
import {
  currentRoute,
  LEGACY_BASE,
  LEGACY_ORIGIN,
  LEGACY_SITE,
  legacyRoute,
} from "./legacy-routes.mjs";
import { DEMO_ROOT, docsRoute } from "./site.mjs";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const PAGES = readdirSync(join(ROOT, "docs"))
  .filter((file) => file.endsWith(".md"))
  .map((file) => file.replace(/\.md$/, ""));

describe("previous addresses", () => {
  it("is the GitHub Pages project site", () => {
    assert.equal(LEGACY_SITE, `${LEGACY_ORIGIN}${LEGACY_BASE}`);
    assert.equal(LEGACY_SITE, "https://orwa-mahmoud.github.io/adapttable");
  });

  it("sends every docs page to its section route", () => {
    for (const page of PAGES) {
      assert.equal(currentRoute(`/${page}/`), docsRoute(page), page);
      assert.equal(currentRoute(`/${page}`), docsRoute(page), page);
    }
  });

  it("sends the showcase to the demo root and keeps the path below it", () => {
    assert.equal(currentRoute("/demo/"), DEMO_ROOT);
    assert.equal(currentRoute("/demo"), DEMO_ROOT);
    assert.equal(
      currentRoute("/demo/mantine/pivot/"),
      `${DEMO_ROOT}mantine/pivot/`
    );
  });

  it("keeps a version's prefix and sections the page inside it", () => {
    assert.equal(currentRoute("/v1/"), "/v1/");
    assert.equal(
      currentRoute("/v1/filtering/"),
      `/v1${docsRoute("filtering")}`
    );
    assert.equal(currentRoute("/v2/concepts/"), `/v2${docsRoute("concepts")}`);
  });

  it("leaves the home page and files where they are", () => {
    for (const path of [
      "/",
      "/llms.txt",
      "/favicon.svg",
      "/og/filtering.png",
      "/media/ai/demo.gif",
      "/sitemap.xml",
    ]) {
      assert.equal(currentRoute(path), path);
    }
  });

  it("inverts cleanly for every page route", () => {
    const routes = [
      "/",
      ...PAGES.map(docsRoute),
      DEMO_ROOT,
      `${DEMO_ROOT}mantine/pivot/`,
      `/v1${docsRoute("filtering")}`,
      `/v2${docsRoute("concepts")}`,
    ];
    for (const route of routes) {
      assert.equal(currentRoute(legacyRoute(route)), route, route);
    }
  });
});

describe("the repository's own links", () => {
  it("name the previous address only where the redirects are built and in changelogs", () => {
    const tracked = execFileSync(gitBinary(), ["ls-files"], {
      cwd: ROOT,
      encoding: "utf8",
    })
      .split("\n")
      .filter(
        (file) =>
          file !== "" &&
          !file.endsWith("CHANGELOG.md") &&
          !/\.(png|jpe?g|gif|mp4|webm|woff2?|ico|pdf)$/.test(file) &&
          ![
            "scripts/legacy-routes.mjs",
            "scripts/legacy-routes.test.mjs",
          ].includes(file)
      );
    const offenders = tracked.filter(
      (file) =>
        lstatSync(join(ROOT, file)).isFile() &&
        readFileSync(join(ROOT, file), "utf8").includes(
          new URL(LEGACY_ORIGIN).host
        )
    );
    assert.deepEqual(offenders, []);
  });
});
