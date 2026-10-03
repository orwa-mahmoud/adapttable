import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";

import {
  ɵbootstrapModal,
  ɵbootstrapPopperOptions,
} from "@adapttable/ng-bootstrap";
import { describe, expect, it } from "vitest";

import { bootstrapModal } from "./components/bootstrapModal";
import { bootstrapPopperOptions } from "./components/bootstrapPositioning";

const packageDir = process.env.ADAPTER_PACKAGE_DIR;
if (!packageDir)
  throw new Error("The test config must provide ADAPTER_PACKAGE_DIR");
const entryPoints = readdirSync(packageDir, { withFileTypes: true })
  .filter(
    (entry) =>
      entry.isDirectory() &&
      existsSync(join(packageDir, entry.name, "ng-package.json"))
  )
  .map((entry) => entry.name);

describe("Angular package entry boundaries", () => {
  it("shares the original overlay implementations through the primary entry", () => {
    expect(ɵbootstrapModal).toBe(bootstrapModal);
    expect(ɵbootstrapPopperOptions).toBe(bootstrapPopperOptions);
  });

  it("discovers secondary entries for the boundary checks", () => {
    expect(entryPoints.length).toBeGreaterThan(0);
  });

  it.each(entryPoints)(
    "keeps %s relative imports inside its compilation root",
    (entry) => {
      const entryDir = join(packageDir, entry);
      const violations: { source: string; specifier: string }[] = [];
      for (const source of readdirSync(entryDir, {
        recursive: true,
        encoding: "utf8",
      })) {
        if (!source.endsWith(".ts") || source.endsWith(".test.ts")) continue;
        const filename = join(entryDir, source);
        const text = readFileSync(filename, "utf8");
        const imports = text.matchAll(
          /\b(?:from\s*|import\s*\(\s*|import\s*)["'](\.{1,2}\/[^"']+)["']/gu
        );
        for (const match of imports) {
          const specifier = match[1];
          if (!specifier) continue;
          const target = relative(
            entryDir,
            resolve(dirname(filename), specifier)
          );
          if (
            target === ".." ||
            target.startsWith(`..${sep}`) ||
            isAbsolute(target)
          ) {
            violations.push({ source, specifier });
          }
        }
      }
      expect(violations).toEqual([]);
    }
  );
});
