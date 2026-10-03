import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { featuresOf, SHOWCASE_ADAPTERS } from "../apps/showcase/matrix.mjs";
import {
  frameworkDemoTarget,
  frameworkDocsTarget,
  normalizeFramework,
  selectedFramework,
} from "./framework-navigation.mjs";

const adapters = [
  { key: "tailwind", framework: "react" },
  { key: "antd", framework: "react" },
  { key: "unstyled", framework: "angular" },
  { key: "ng-zorro", framework: "angular" },
];
const features = () => [{ slug: "editing" }, { slug: "filtering" }];
for (const value of [
  "",
  "vue",
  "angular ",
  "/attacker.invalid",
  "\\attacker.invalid",
  "javascript:alert(1)",
]) {
  it(`normalizes unsupported framework ${JSON.stringify(value)} before building destinations`, () => {
    assert.equal(normalizeFramework(value), "react");
    for (const path of [
      "/angular/filtering/",
      "/concepts/",
      "/angular/material/",
    ]) {
      const actual = frameworkDocsTarget(path, value);
      assert.deepEqual(actual, frameworkDocsTarget(path, "react"));
      assert.equal(
        new URL(actual.href, "https://adapttable.local").origin,
        "https://adapttable.local"
      );
    }
    for (const path of [
      "/angular/demo/",
      "/angular/demo/all-options/",
      "/angular/demo/ng-zorro/editing/",
    ]) {
      for (const inventory of [adapters, []]) {
        const actual = frameworkDemoTarget(path, value, inventory, features);
        assert.deepEqual(
          actual,
          frameworkDemoTarget(path, "react", inventory, features)
        );
        assert.equal(
          new URL(actual.href, "https://adapttable.local").origin,
          "https://adapttable.local"
        );
      }
    }
  });
}
describe("framework navigation", () => {
  it("gives explicit routes precedence over remembered selection", () => {
    assert.equal(selectedFramework("/react/filtering/", "angular"), "react");
    assert.equal(selectedFramework("/angular/filtering/", "react"), "angular");
    assert.equal(selectedFramework("/concepts/", "angular"), "angular");
    assert.equal(selectedFramework("/", "vue"), "react");
  });
  it("retains matching guides and shared contracts", () => {
    assert.deepEqual(frameworkDocsTarget("/react/filtering/", "angular"), {
      href: "/angular/filtering/",
      equivalent: true,
    });
    assert.equal(
      frameworkDocsTarget("/angular/filtering/", "react").href,
      "/react/filtering/"
    );
    assert.equal(
      frameworkDocsTarget("/concepts/", "angular").href,
      "/concepts/"
    );
  });
  it("makes unsupported Angular guides explicit without React fallback", () => {
    assert.deepEqual(frameworkDocsTarget("/react/api/", "angular"), {
      href: "/angular/getting-started/?unavailable=api",
      equivalent: false,
    });
  });
  it("keeps corresponding demo kit and feature in both directions", () => {
    assert.equal(
      frameworkDemoTarget(
        "/react/demo/antd/editing/",
        "angular",
        adapters,
        features
      ).href,
      "/angular/demo/ng-zorro/editing/"
    );
    assert.equal(
      frameworkDemoTarget(
        "/angular/demo/ng-zorro/filtering/",
        "react",
        adapters,
        features
      ).href,
      "/react/demo/antd/filtering/"
    );
    assert.equal(
      frameworkDemoTarget(
        "/angular/demo/unstyled/editing/",
        "react",
        adapters,
        features
      ).href,
      "/react/demo/tailwind/editing/"
    );
  });
  it("uses a supported kit without dropping the feature and explains missing features", () => {
    assert.equal(
      frameworkDemoTarget(
        "/react/demo/mantine/editing/",
        "angular",
        adapters,
        features
      ).href,
      "/angular/demo/unstyled/editing/?kit-unavailable=mantine"
    );
    assert.deepEqual(
      frameworkDemoTarget(
        "/react/demo/antd/unknown/",
        "angular",
        adapters,
        features
      ),
      { href: "/angular/demo/ng-zorro/?unavailable=unknown", equivalent: false }
    );
  });
});

describe("Angular-only setup guides", () => {
  for (const slug of ["material", "ng-bootstrap", "spartan", "taiga-ui"]) {
    it(`explains the missing React counterpart for ${slug}`, () => {
      assert.deepEqual(frameworkDocsTarget(`/angular/${slug}/`, "react"), {
        href: `/react/getting-started/?unavailable=${slug}`,
        equivalent: false,
      });
    });
  }
});

it("uses the real React tailwind route for Angular-only kit counterparts", () => {
  for (const kit of ["unstyled", "ng-bootstrap", "taiga-ui"]) {
    const target = frameworkDemoTarget(
      `/angular/demo/${kit}/editing/`,
      "react",
      SHOWCASE_ADAPTERS,
      featuresOf
    );
    assert.equal(
      target.href,
      `/react/demo/tailwind/editing/${kit === "unstyled" ? "" : `?kit-unavailable=${kit}`}`
    );
  }
});

for (const framework of ["react", "angular"]) {
  for (const mode of ["", "all-options/"]) {
    it(`preserves ${mode || "main"} mode when switching to ${framework}`, () => {
      assert.deepEqual(
        frameworkDemoTarget(
          `/react/demo/${mode}`,
          framework,
          adapters,
          features
        ),
        {
          href: `/${framework}/demo/${mode}`,
          equivalent: true,
        }
      );
    });
  }
}
