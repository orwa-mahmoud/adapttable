import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import assert from "node:assert/strict";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("AI isolation", () => {
  it("keeps the agent protocol out of core, adapters and server", () => {
    const run = spawnSync(process.execPath, ["scripts/ai-isolation.mjs"], {
      cwd: root,
      encoding: "utf8",
    });
    assert.equal(run.status, 0, run.stderr || run.stdout);
  });
});
