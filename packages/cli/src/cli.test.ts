import { describe, expect, it } from "vitest";

import { detectKit, KITS, mergeDependencies } from "./detect";
import { InitError, type InitIO, runInit } from "./init";
import { choosePackageManager, installCommand } from "./packageManager";
import { packagesFor, scaffoldFiles, starterComponent } from "./scaffold";

describe("detectKit", () => {
  it("detects each kit from its signal package", () => {
    expect(detectKit({ "@mantine/core": "8" }).kit).toBe("mantine");
    expect(detectKit({ "@mui/material": "6" }).kit).toBe("mui");
    expect(detectKit({ "@chakra-ui/react": "2" }).kit).toBe("chakra");
    expect(detectKit({ antd: "5" }).kit).toBe("antd");
    expect(detectKit({ "@radix-ui/themes": "3" }).kit).toBe("radix");
    expect(detectKit({ "@base-ui/react": "1" }).kit).toBe("base-ui");
    expect(detectKit({ tailwindcss: "3" }).kit).toBe("unstyled");
  });

  it("never auto-detects shadcn (it has no dependency signal)", () => {
    // shadcn ships no package of its own; a Tailwind project resolves to
    // unstyled here and is only upgraded to shadcn by runInit via components.json.
    expect(
      detectKit({ tailwindcss: "3", "class-variance-authority": "0.7" }).kit
    ).toBe("unstyled");
  });

  it("prefers Mantine when several kits are present", () => {
    expect(detectKit({ "@mui/material": "6", "@mantine/core": "8" }).kit).toBe(
      "mantine"
    );
  });

  it("falls back to unstyled when nothing matches", () => {
    expect(detectKit({ react: "18" }).kit).toBe("unstyled");
  });
});

describe("mergeDependencies", () => {
  it("merges deps and devDeps", () => {
    expect(
      mergeDependencies({
        dependencies: { a: "1" },
        devDependencies: { b: "2" },
      })
    ).toEqual({ a: "1", b: "2" });
  });
  it("handles missing sections", () => {
    expect(mergeDependencies({})).toEqual({});
  });
});

describe("choosePackageManager", () => {
  it("detects pnpm / yarn / bun / npm by lockfile", () => {
    expect(choosePackageManager(["pnpm-lock.yaml"])).toBe("pnpm");
    expect(choosePackageManager(["yarn.lock"])).toBe("yarn");
    expect(choosePackageManager(["bun.lockb"])).toBe("bun");
    expect(choosePackageManager(["bun.lock"])).toBe("bun");
    expect(choosePackageManager(["package-lock.json"])).toBe("npm");
  });
  it("defaults to npm when no lockfile is present", () => {
    expect(choosePackageManager(["README.md"])).toBe("npm");
  });
});

describe("installCommand", () => {
  it("builds per-manager commands", () => {
    expect(installCommand("pnpm", ["a", "b"])).toBe("pnpm add a b");
    expect(installCommand("yarn", ["a"])).toBe("yarn add a");
    expect(installCommand("bun", ["a"])).toBe("bun add a");
    expect(installCommand("npm", ["a"])).toBe("npm install a");
  });
});

describe("scaffold", () => {
  it("packagesFor lists core + adapter + extras", () => {
    const mantine = KITS.find((k) => k.kit === "mantine")!;
    expect(packagesFor(mantine)).toEqual([
      "@adapttable/core",
      "@adapttable/mantine",
      "@mantine/hooks",
    ]);
  });
  it("starterComponent imports from the adapter and references the kit", () => {
    const mui = KITS.find((k) => k.kit === "mui")!;
    const src = starterComponent(mui);
    expect(src).toContain('from "@adapttable/mui"');
    expect(src).toContain("Material UI");
    expect(src).toContain("PeopleTable");
  });
  it("scaffoldFiles returns the starter file", () => {
    const files = scaffoldFiles(KITS[0]!);
    expect(files[0]?.path).toBe("src/PeopleTable.tsx");
  });
});

function makeIO(
  pkgJson: string | undefined,
  rootFiles: string[] = [],
  existing: string[] = []
) {
  const written: Record<string, string> = {};
  const logs: string[] = [];
  const exists = new Set(existing);
  const io: InitIO = {
    readFile: (p) => (p === "package.json" ? pkgJson : undefined),
    writeFile: (p, c) => {
      written[p] = c;
      exists.add(p);
    },
    exists: (p) => exists.has(p),
    listRootFiles: () => rootFiles,
    log: (m) => logs.push(m),
  };
  return { io, written, logs };
}

describe("runInit", () => {
  it("detects, scaffolds, and reports the install command", () => {
    const { io, written, logs } = makeIO(
      JSON.stringify({ dependencies: { "@mantine/core": "8" } }),
      ["pnpm-lock.yaml"]
    );
    const result = runInit(io);
    expect(result.kit).toBe("mantine");
    expect(result.packageManager).toBe("pnpm");
    expect(result.installCommand).toContain("pnpm add @adapttable/core");
    expect(result.written).toEqual(["src/PeopleTable.tsx"]);
    expect(written["src/PeopleTable.tsx"]).toContain("PeopleTable");
    expect(logs.join("\n")).toContain("Mantine");
  });

  it("warns when Chakra v2 is detected (adapter targets v3)", () => {
    const { io, logs } = makeIO(
      JSON.stringify({ dependencies: { "@chakra-ui/react": "^2.10.4" } }),
      []
    );
    runInit(io);
    expect(logs.join("\n")).toContain("targets Chakra v3");
  });

  it("stays quiet for Chakra v3 (the supported major)", () => {
    const { io, logs } = makeIO(
      JSON.stringify({ dependencies: { "@chakra-ui/react": "^3.2.0" } }),
      []
    );
    runInit(io);
    expect(logs.join("\n")).not.toContain("targets Chakra v3");
  });

  it("upgrades a Tailwind project with components.json to shadcn", () => {
    const { io, written } = makeIO(
      JSON.stringify({ dependencies: { tailwindcss: "3" } }),
      [],
      ["components.json"]
    );
    const result = runInit(io);
    expect(result.kit).toBe("shadcn");
    expect(result.installCommand).toContain("@adapttable/shadcn");
    expect(written["src/PeopleTable.tsx"]).toContain("@adapttable/shadcn");
  });

  it("scaffolds the Radix adapter for a Radix Themes project", () => {
    const { io, written } = makeIO(
      JSON.stringify({ dependencies: { "@radix-ui/themes": "3" } }),
      []
    );
    const result = runInit(io);
    expect(result.kit).toBe("radix");
    expect(written["src/PeopleTable.tsx"]).toContain(
      'from "@adapttable/radix"'
    );
  });

  it("stays unstyled for a Tailwind project without components.json", () => {
    const { io } = makeIO(
      JSON.stringify({ dependencies: { tailwindcss: "3" } }),
      []
    );
    expect(runInit(io).kit).toBe("unstyled");
  });

  it("skips an existing starter unless --force", () => {
    const base = JSON.stringify({ devDependencies: { "@mui/material": "6" } });
    const a = makeIO(base, [], ["src/PeopleTable.tsx"]);
    expect(runInit(a.io).skipped).toEqual(["src/PeopleTable.tsx"]);
    expect(a.written["src/PeopleTable.tsx"]).toBeUndefined();

    const b = makeIO(base, [], ["src/PeopleTable.tsx"]);
    const forced = runInit(b.io, { force: true });
    expect(forced.written).toEqual(["src/PeopleTable.tsx"]);
  });

  it("throws InitError when package.json is missing", () => {
    const { io } = makeIO(undefined);
    expect(() => runInit(io)).toThrow(InitError);
  });

  it("throws InitError on invalid package.json", () => {
    const { io } = makeIO("{ not json");
    expect(() => runInit(io)).toThrow(/valid JSON/);
  });
});
