import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { CORE_MAIN_MOVES, REACT_MAIN_TO_ADAPTER } from "./migrateV4Moves";

const REPO = fileURLToPath(new URL("../../../../", import.meta.url));

/** Every name an entry module exports through its named export lists. */
function exportedNames(entry: string): Set<string> {
  const source = readFileSync(REPO + entry, "utf8");
  const names = new Set<string>();
  for (const block of source.matchAll(/export\s+(?:type\s+)?\{([^}]*)\}/g)) {
    for (const part of (block[1] ?? "").split(",")) {
      const spec = part.trim().replace(/^type\s+/, "");
      if (!spec) continue;
      const alias = /\bas\s+([A-Za-z_$][\w$]*)$/.exec(spec);
      names.add(alias?.[1] ?? spec);
    }
  }
  return names;
}

describe("the v4 moves", () => {
  it("send every core name to an entry that exports it", () => {
    const main = exportedNames("packages/shared/core/src/index.ts");
    for (const [to, names] of Object.entries(CORE_MAIN_MOVES)) {
      const entry = to.slice("@adapttable/core/".length);
      const served = exportedNames(`packages/shared/core/src/${entry}.ts`);
      expect(
        names.filter((name) => !served.has(name)),
        to
      ).toEqual([]);
      expect(
        names.filter((name) => main.has(name)),
        to
      ).toEqual([]);
    }
  });

  it("send every React name to an entry that exports it", () => {
    const adapter = exportedNames("packages/react/react/src/adapter.ts");
    const main = exportedNames("packages/react/react/src/index.ts");
    expect(REACT_MAIN_TO_ADAPTER.filter((name) => !adapter.has(name))).toEqual(
      []
    );
    expect(REACT_MAIN_TO_ADAPTER.filter((name) => main.has(name))).toEqual([]);
  });
});
