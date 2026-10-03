import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { describe, it } from "node:test";

// Resolve through the actual consumer so an unapplied pnpm patch fails CI.
const docsRequire = createRequire(
  new URL("../apps/docs/package.json", import.meta.url)
);
const require = createRequire(docsRequire.resolve("astro/package.json"));
const CachePolicy = require("http-cache-semantics");
const request = { url: "/document", headers: { host: "example.test" } };
const staleRequest = {
  ...request,
  headers: { ...request.headers, "cache-control": "max-stale=10000" },
};
const extensions = "max-age=60, stale-if-error=600, stale-while-revalidate=600";

function policy(headers, options = {}, restore = false) {
  let result = new CachePolicy(request, { headers }, options);
  if (restore) result = CachePolicy.fromObject(result.toObject());
  result.now = () => result.toObject().t;
  return result;
}

describe("the docs consumer's patched cache policy", () => {
  for (const restore of [false, true]) {
    const cases = [
      [
        "shared cookie",
        { "cache-control": extensions, "set-cookie": "synthetic=1" },
      ],
      [
        "proxy validation",
        { "cache-control": `${extensions}, proxy-revalidate` },
      ],
      ["no-cache", { "cache-control": `${extensions}, no-cache` }],
      ["no-store", { "cache-control": `${extensions}, no-store` }],
      ["private response", { "cache-control": `${extensions}, private` }],
      ["vary wildcard", { "cache-control": extensions, vary: "*" }],
      [
        "padded vary wildcard",
        { "cache-control": extensions, vary: "accept, * " },
      ],
      [
        "expired mandatory validation",
        { "cache-control": `${extensions}, must-revalidate`, age: "120" },
      ],
      [
        "expired shared max-age",
        { "cache-control": `${extensions}, s-maxage=60`, age: "120" },
      ],
    ];
    for (const [name, headers] of cases) {
      it(`${restore ? "restored" : "original"} ${name}: no stale bypass or retention`, () => {
        const cached = policy(headers, {}, restore);
        assert.equal(cached.evaluateRequest(staleRequest).response, undefined);
        assert.equal(cached.satisfiesWithoutRevalidation(staleRequest), false);
        assert.equal(cached.useStaleWhileRevalidate(), false);
        assert.equal(cached.timeToLive(), 0);
        for (const status of [500, 502, 503, 504]) {
          assert.equal(
            cached.revalidatedPolicy(request, { status, headers: {} }).modified,
            true
          );
        }
        for (const response of [undefined, null]) {
          assert.throws(
            () => cached.revalidatedPolicy(request, response),
            /Response headers missing/
          );
        }
      });
    }
  }

  for (const [name, headers, options] of [
    ["ordinary expiry", { "cache-control": extensions, age: "120" }, {}],
    [
      "private cookie cache",
      { "cache-control": extensions, "set-cookie": "synthetic=1", age: "120" },
      { shared: false },
    ],
    [
      "explicit public cookie",
      {
        "cache-control": `${extensions}, public`,
        "set-cookie": "synthetic=1",
        age: "120",
      },
      {},
    ],
    [
      "immutable cookie opt-in",
      {
        "cache-control": `${extensions}, immutable`,
        "set-cookie": "synthetic=1",
        age: "120",
      },
      {},
    ],
  ]) {
    it(`${name}: preserves permitted stale reuse`, () => {
      const cached = policy(headers, options);
      assert.ok(cached.evaluateRequest(staleRequest).response);
      assert.equal(cached.useStaleWhileRevalidate(), true);
      assert.equal(cached.timeToLive(), 540000);
      assert.equal(
        cached.revalidatedPolicy(request, { status: 503, headers: {} })
          .modified,
        false
      );
    });
  }

  for (const changed of [
    { ...request, url: "/different" },
    { ...request, method: "POST" },
    { ...request, headers: { host: "different.test" } },
    {
      ...request,
      headers: { ...request.headers, "cache-control": "no-cache" },
    },
    {
      ...request,
      headers: { ...request.headers, "cache-control": "max-age=0" },
    },
    {
      ...request,
      headers: { ...request.headers, "cache-control": "min-fresh=60" },
    },
    { ...request, headers: { ...request.headers, pragma: "no-cache" } },
  ]) {
    it(`does not reuse an error response for ${JSON.stringify(changed)}`, () => {
      const cached = policy({ "cache-control": extensions, age: "120" });
      assert.equal(
        cached.revalidatedPolicy(changed, { status: 503, headers: {} })
          .modified,
        true
      );
    });
  }

  it("retains ordinary fresh responses and successful conditional validation", () => {
    const cached = policy({ "cache-control": "max-age=60", etag: '"version"' });
    assert.ok(cached.evaluateRequest(request).response);
    assert.equal(cached.timeToLive(), 60000);
    const validated = cached.revalidatedPolicy(request, {
      status: 304,
      headers: { etag: '"version"', "cache-control": "max-age=120" },
    });
    assert.equal(validated.modified, false);
    assert.equal(validated.matches, true);
    assert.equal(validated.policy.maxAge(), 120);
  });
});
