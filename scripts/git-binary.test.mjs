import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { isAbsolute } from "node:path";
import { describe, it } from "node:test";

import { GIT_CANDIDATES, gitBinary } from "./git-binary.mjs";

describe("git binary resolution", () => {
  it("only ever considers absolute paths", () => {
    assert.ok(GIT_CANDIDATES.length > 0);
    for (const candidate of GIT_CANDIDATES) {
      assert.ok(
        isAbsolute(candidate),
        `${candidate} is not absolute — PATH lookups are the thing this avoids`
      );
    }
  });

  it("returns a candidate that actually runs", () => {
    const git = gitBinary();
    assert.ok(GIT_CANDIDATES.includes(git));
    const version = execFileSync(git, ["--version"], { encoding: "utf8" });
    assert.match(version, /^git version /);
  });

  it("answers the same path on a second call", () => {
    assert.equal(gitBinary(), gitBinary());
  });
});
