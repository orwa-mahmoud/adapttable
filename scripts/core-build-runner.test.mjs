import assert from "node:assert/strict";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { it } from "node:test";

import { originalPositionFor, TraceMap } from "@jridgewell/trace-mapping";
import ts from "typescript";

import {
  buildLibrary,
  declarationConfig,
  inlineDeclarationSources,
} from "./build-library.mjs";

it("keeps every core entry and bundler option while selecting the declaration module extension", () => {
  const packageDir = join(tmpdir(), "core-runner-package");
  const typesDir = join(tmpdir(), "core-runner-types");
  const original = {
    entry: ["src/index.ts", "src/pivot.ts"],
    format: ["esm", "cjs"],
    sourcemap: true,
    treeshake: true,
    dts: { eager: true },
  };
  for (const extension of [".d.ts", ".d.cts"]) {
    const result = declarationConfig(original, {
      packageDir,
      typesDir,
      extension,
    });
    assert.deepEqual(result.entry, {
      index: join(typesDir, "index.d.ts"),
      pivot: join(typesDir, "pivot.d.ts"),
    });
    assert.equal(result.sourcemap, true);
    assert.equal(result.treeshake, true);
    assert.equal(result.clean, false);
    assert.equal(result.dts.emitDtsOnly, true);
    assert.equal(result.outputOptions.entryFileNames, `[name]${extension}`);
  }
  assert.throws(
    () =>
      declarationConfig(
        { entry: ["../outside.ts"] },
        { packageDir, typesDir, extension: ".d.ts" }
      ),
    /outside src/
  );
  assert.throws(
    () =>
      declarationConfig(
        { entry: ["src/index.js"] },
        { packageDir, typesDir, extension: ".d.ts" }
      ),
    /not TypeScript/
  );
});

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "core-build-test-"));
  const packageDir = join(root, "package");
  const tempParent = join(root, "scratch");
  mkdirSync(packageDir);
  mkdirSync(join(packageDir, "src"));
  writeFileSync(
    join(packageDir, "src/model.ts"),
    "// Original implementation\nexport const spare = 0;\n\nexport interface Model { value: string }\n"
  );
  mkdirSync(tempParent);
  const calls = [];
  let typesDir;
  const run = (script, args, cwd) => {
    calls.push({ script, args, cwd });
    const out = join(packageDir, "dist");
    mkdirSync(out, { recursive: true });
    if (calls.length === 1) {
      writeFileSync(join(out, "index.js"), "export const value = 1;");
      writeFileSync(join(out, "index.cjs"), "exports.value = 1;");
    } else if (calls.length === 2) {
      typesDir = args[args.indexOf("--outDir") + 1];
      mkdirSync(typesDir, { recursive: true });
      writeFileSync(
        join(typesDir, "model.d.ts"),
        "\nexport interface Model { value: string }"
      );
      writeFileSync(
        join(typesDir, "model.d.ts.map"),
        JSON.stringify({
          version: 3,
          file: "model.d.ts",
          names: [],
          sources: [relative(typesDir, join(packageDir, "src/model.ts"))],
          mappings: ";AAGA",
        })
      );
    } else {
      const extension = calls.length === 3 ? ".d.ts" : ".d.cts";
      const file = join(out, `index${extension}.map`);
      writeFileSync(
        file,
        JSON.stringify({
          version: 3,
          file: `index${extension}`,
          sources: [relative(dirname(file), join(typesDir, "model.d.ts"))],
          names: [],
          mappings: "AACA",
        })
      );
    }
    return { status: 0 };
  };
  return {
    root,
    packageDir,
    tempParent,
    calls,
    run,
    cleanup: () => rmSync(root, { recursive: true, force: true }),
  };
}

it("runs all four phases serially and leaves self-contained declaration maps after cleaning staging", () => {
  const f = fixture();
  try {
    buildLibrary({ ...f, tools: { tsdown: "bundler", tsc: "compiler" } });
    assert.deepEqual(
      f.calls.map((call) => call.script),
      ["bundler", "compiler", "bundler", "bundler"]
    );
    assert.ok(f.calls.every((call) => call.cwd === f.packageDir));
    assert.deepEqual(f.calls[0].args, ["--no-dts", "--concurrency", "1"]);
    assert.ok(f.calls[1].args.includes("--emitDeclarationOnly"));
    for (const extension of [".d.ts", ".d.cts"]) {
      const map = JSON.parse(
        readFileSync(
          join(f.packageDir, "dist", `index${extension}.map`),
          "utf8"
        )
      );
      assert.deepEqual(map.sources, ["../src/model.ts"]);
      assert.deepEqual(map.sourcesContent, [
        "// Original implementation\nexport const spare = 0;\n\nexport interface Model { value: string }\n",
      ]);
      assert.equal(map.sourceRoot, undefined);
      assert.deepEqual(
        originalPositionFor(new TraceMap(map), { line: 1, column: 0 }),
        {
          source: "../src/model.ts",
          line: 4,
          column: 0,
          name: null,
        }
      );
      assert.equal(JSON.stringify(map).includes(f.root), false);
    }
    assert.ok(existsSync(join(f.packageDir, "dist/index.js")));
    assert.ok(existsSync(join(f.packageDir, "dist/index.cjs")));
    assert.deepEqual(readdirSync(f.tempParent), []);
  } finally {
    f.cleanup();
  }
});

for (const failedPhase of [1, 2, 3, 4]) {
  it(`propagates phase ${failedPhase} failure and removes partial artifacts and staging`, () => {
    const f = fixture();
    try {
      assert.throws(
        () =>
          buildLibrary({
            ...f,
            tools: { tsdown: "bundler", tsc: "compiler" },
            run: (...args) => {
              const result = f.run(...args);
              return f.calls.length === failedPhase ? { status: 7 } : result;
            },
          }),
        (error) => error.exitCode === 7
      );
      assert.equal(f.calls.length, failedPhase);
      assert.equal(existsSync(join(f.packageDir, "dist")), false);
      assert.deepEqual(readdirSync(f.tempParent), []);
    } finally {
      f.cleanup();
    }
  });
}

it("preserves process-signal failures and cleans staging when a process cannot start", () => {
  for (const result of [
    { status: null, signal: "SIGKILL" },
    { error: new Error("spawn failed") },
  ]) {
    const f = fixture();
    try {
      assert.throws(
        () =>
          buildLibrary({
            ...f,
            tools: { tsdown: "bundler", tsc: "compiler" },
            run: () => result,
          }),
        (error) =>
          result.error ? error === result.error : error.exitCode === 137
      );
      assert.equal(existsSync(join(f.packageDir, "dist")), false);
      assert.deepEqual(readdirSync(f.tempParent), []);
    } finally {
      f.cleanup();
    }
  }
});

it("fails closed rather than shipping a map without TypeScript's original-source mapping", () => {
  const f = fixture();
  try {
    assert.throws(
      () =>
        buildLibrary({
          ...f,
          tools: { tsdown: "bundler", tsc: "compiler" },
          run(script, args, cwd) {
            const result = f.run(script, args, cwd);
            if (args.includes("--emitDeclarationOnly"))
              rmSync(
                join(args[args.indexOf("--outDir") + 1], "model.d.ts.map")
              );
            return result;
          },
        }),
      /ENOENT/
    );
    assert.equal(existsSync(join(f.packageDir, "dist")), false);
    assert.deepEqual(readdirSync(f.tempParent), []);
  } finally {
    f.cleanup();
  }
});

it("traces a real TypeScript-emitted export back to its implementation line", () => {
  const f = fixture();
  try {
    const typesDir = join(f.root, "types");
    const outDir = join(f.packageDir, "dist");
    const source = join(f.packageDir, "src", "api.ts");
    const implementation =
      "// A real exported function\n\n// Its implementation starts on line four.\nexport function increment(value: number): number { return value + 1; }\n";
    writeFileSync(source, implementation);
    const program = ts.createProgram([source], {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      types: [],
      lib: ["lib.es2022.d.ts"],
      declaration: true,
      declarationMap: true,
      emitDeclarationOnly: true,
      rootDir: join(f.packageDir, "src"),
      outDir: typesDir,
    });
    assert.deepEqual(ts.getPreEmitDiagnostics(program), []);
    assert.equal(program.emit().emitSkipped, false);
    const declaration = readFileSync(join(typesDir, "api.d.ts"), "utf8");
    const lines = declaration.split("\n");
    const declarationLine = lines.findIndex((line) =>
      line.includes("function increment")
    );
    assert.ok(declarationLine >= 0);
    mkdirSync(outDir);
    for (const extension of [".d.ts", ".d.cts"]) {
      const mapFile = join(outDir, `index${extension}.map`);
      writeFileSync(
        mapFile,
        JSON.stringify({
          version: 3,
          file: `index${extension}`,
          names: [],
          sources: [relative(outDir, join(typesDir, "api.d.ts"))],
          mappings: ["AAAA", ...lines.slice(1).map(() => "AACA")].join(";"),
        })
      );
    }
    inlineDeclarationSources(outDir, typesDir, f.packageDir);
    for (const extension of [".d.ts", ".d.cts"]) {
      const map = JSON.parse(
        readFileSync(join(outDir, `index${extension}.map`), "utf8")
      );
      const location = originalPositionFor(new TraceMap(map), {
        line: declarationLine + 1,
        column: 0,
      });
      assert.equal(location.source, "../src/api.ts");
      assert.equal(location.line, 4);
      assert.deepEqual(map.sourcesContent, [implementation]);
    }
  } finally {
    f.cleanup();
  }
});
