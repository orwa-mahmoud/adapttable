import { readFileSync } from "node:fs";
import { isAbsolute, join } from "node:path";

import {
  ModuleKind,
  preProcessFile,
  ScriptTarget,
  transpileModule,
} from "typescript";
import { describe, expect, it } from "vitest";

const packageDir = process.env.ADAPTER_PACKAGE_DIR;
if (!packageDir || !isAbsolute(packageDir)) {
  throw new Error(
    "ADAPTER_PACKAGE_DIR must identify the absolute package root"
  );
}

const components = ["desktopTable", "mobileCards", "paginationFooter"];

describe("Taiga view-only table dependencies", () => {
  it.each(components)(
    "erases %s's dataTable import from emitted JavaScript",
    (component) => {
      const source = readFileSync(
        join(packageDir, "src/components", `${component}.ts`),
        "utf8"
      );
      const result = transpileModule(source, {
        fileName: `${component}.ts`,
        reportDiagnostics: true,
        compilerOptions: {
          target: ScriptTarget.ES2022,
          module: ModuleKind.ESNext,
          experimentalDecorators: true,
          // Match the package build: inline type specifiers alone retain an
          // empty runtime import and can cycle back to the component owner.
          verbatimModuleSyntax: true,
        },
      });
      expect(result.diagnostics).toEqual([]);
      const imports = preProcessFile(result.outputText).importedFiles.map(
        (reference) => reference.fileName
      );
      expect(imports).toContain("@angular/core");
      expect(imports).not.toContain("../dataTable");
    }
  );
});
