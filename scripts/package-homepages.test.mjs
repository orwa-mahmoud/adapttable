import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import { SHOWCASE_ADAPTERS } from "../apps/showcase/matrix.mjs";
import { listPackages } from "./packages.mjs";
import { demoRoute, siteUrl } from "./site.mjs";

const HUB = siteUrl(demoRoute());
const HUB_PACKAGES = new Set([
  "@adapttable/core",
  "@adapttable/react",
  "@adapttable/i18n",
  "@adapttable/cli",
  "@adapttable/server",
  "@adapttable/ai",
  "@adapttable/ai-react",
]);
const REPOSITORY = "git+https://github.com/orwa-mahmoud/adapttable.git";
const BUGS = "https://github.com/orwa-mahmoud/adapttable/issues";

function json(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function publishedManifests() {
  return listPackages()
    .map(({ dir }) => join(dir, "package.json"))
    .map((path) => ({ path, pkg: json(path) }))
    .filter(({ pkg }) => pkg.private !== true);
}

describe("published package homepages", () => {
  const published = publishedManifests();
  const kitByPkg = new Map(
    SHOWCASE_ADAPTERS.filter((kit) => kit.built).map((kit) => [
      kit.pkg,
      kit.key,
    ])
  );

  it("points every published package at its demo landing", () => {
    assert.ok(published.some(({ pkg }) => pkg.name === "@adapttable/ai"));
    for (const { path, pkg } of published) {
      const kit = kitByPkg.get(pkg.name);
      const expected = kit ? siteUrl(demoRoute(kit)) : HUB;
      if (!kit) {
        assert.ok(
          HUB_PACKAGES.has(pkg.name),
          `${pkg.name} is published but is neither a showcase kit nor a hub package`
        );
      }
      assert.equal(pkg.homepage, expected, path);
    }
  });

  it("leaves repository and bugs on the GitHub project", () => {
    for (const { path, pkg } of published) {
      assert.equal(pkg.repository?.url, REPOSITORY, path);
      assert.equal(pkg.bugs, BUGS, path);
    }
  });
});
