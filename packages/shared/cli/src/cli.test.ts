import { describe, expect, it } from "vitest";

import {
  detectFramework,
  detectKit,
  type KitInfo,
  KITS,
  mergeDependencies,
} from "./detect";
import { InitError, type InitIO, runInit } from "./init";
import { choosePackageManager, installCommand } from "./packageManager";
import { packagesFor, scaffoldFiles, starterComponent } from "./scaffold";

describe("detectFramework", () => {
  it("requires both the Angular dependency and workspace file", () => {
    expect(
      detectFramework({ "@angular/core": "^22.2.0" }, { hasAngularJson: true })
    ).toBe("angular");
    expect(detectFramework({ "@angular/core": "^22.2.0" })).toBe("react");
    expect(
      detectFramework({ "@angular/core": "^22.2.0" }, { hasAngularJson: false })
    ).toBe("react");
    expect(detectFramework({}, { hasAngularJson: true })).toBe("react");
  });
});

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

  it("never auto-detects shadcn from dependencies alone", () => {
    // shadcn ships no package of its own; without the components.json
    // hint a Tailwind project resolves to unstyled.
    expect(
      detectKit({ tailwindcss: "3", "class-variance-authority": "0.7" }).kit
    ).toBe("unstyled");
  });

  it("resolves shadcn when components.json is present (parity with runInit)", () => {
    expect(
      detectKit({ tailwindcss: "3" }, { hasComponentsJson: true }).kit
    ).toBe("shadcn");
    expect(detectKit({}, { hasComponentsJson: true }).kit).toBe("shadcn");
    // A concrete kit signal still wins over the shadcn hint.
    expect(
      detectKit({ "@mantine/core": "8" }, { hasComponentsJson: true }).kit
    ).toBe("mantine");
  });

  it("chakra's printed install includes its real @emotion/react peer", () => {
    const chakra = detectKit({ "@chakra-ui/react": "3" });
    expect(chakra.extras).toContain("@emotion/react");
  });

  it("prefers Mantine when several kits are present", () => {
    expect(detectKit({ "@mui/material": "6", "@mantine/core": "8" }).kit).toBe(
      "mantine"
    );
  });

  it("falls back to unstyled when nothing matches", () => {
    expect(detectKit({ react: "18" }).kit).toBe("unstyled");
  });

  it("selects NG-ZORRO only for the Angular framework", () => {
    const dependencies = {
      "@angular/core": "^22.2.0",
      "ng-zorro-antd": "^22.1.1",
    };
    expect(detectKit(dependencies, { framework: "angular" })).toMatchObject({
      kit: "ng-zorro",
      framework: "angular",
      adapter: "@adapttable/ng-zorro",
    });
    expect(detectKit(dependencies).kit).toBe("unstyled");
    expect(detectKit(dependencies, { framework: "react" }).kit).toBe(
      "unstyled"
    );
  });

  it("keeps Angular kit selection independent of React and shadcn signals", () => {
    const dependencies = {
      "@mantine/core": "8",
      "@mui/material": "6",
      tailwindcss: "4",
    };
    expect(
      detectKit(dependencies, { framework: "angular", hasComponentsJson: true })
    ).toMatchObject({
      kit: "angular-unstyled",
      framework: "angular",
      adapter: "@adapttable/angular-unstyled",
    });
    expect(
      detectKit(
        { ...dependencies, "ng-zorro-antd": "^22.1.1" },
        { framework: "angular", hasComponentsJson: true }
      ).kit
    ).toBe("ng-zorro");
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

  it("preserves the React scaffold for existing KitInfo literals", () => {
    const info: KitInfo = {
      kit: "unstyled",
      adapter: "@adapttable/unstyled",
      signals: [],
      extras: [],
      label: "Native HTML",
    };
    expect(scaffoldFiles(info)).toEqual([
      { path: "src/PeopleTable.tsx", contents: starterComponent(info) },
    ]);
    expect(starterComponent(info)).toContain("export function PeopleTable()");
    expect(packagesFor(info)).toEqual([
      "@adapttable/core",
      "@adapttable/unstyled",
    ]);
  });

  it.each(["angular-unstyled", "ng-zorro"])(
    "scaffolds a standalone Angular component for %s through public imports",
    (kit) => {
      const info = KITS.find((entry) => entry.kit === kit)!;
      const files = scaffoldFiles(info);
      expect(files.map((file) => file.path)).toEqual([
        "src/app/peopleTable.ts",
      ]);
      const source = files[0]!.contents;
      expect(source).toContain('import { Component } from "@angular/core"');
      expect(source).toContain(
        'import type { ColumnDef } from "@adapttable/angular"'
      );
      expect(source).toContain(
        `import { AdaptDataTable } from "${info.adapter}"`
      );
      expect(source).toContain('selector: "people-table"');
      expect(source).toContain("standalone: true");
      expect(source).toContain("imports: [AdaptDataTable]");
      expect(source).toContain("export class PeopleTable");
      expect(source).toContain('[data]="people"');
      expect(source).toContain('[columns]="columns"');
      expect(source).toContain('[rowKey]="rowKey"');
      expect(source).toContain(
        'name: "Ada Lovelace", email: "ada@example.com", role: "Engineer"'
      );
      expect(source).toContain(
        'name: "Alan Turing", email: "alan@example.com", role: "Founder"'
      );
      expect(source).toContain(
        'name: "Grace Hopper", email: "grace@example.com", role: "Admiral"'
      );
      expect(source).toContain(
        'key: "name", header: "Name", accessor: (r) => r.name, sortable: true'
      );
      expect(source).toContain(
        'key: "role", header: "Role", accessor: (r) => r.role, sortable: true'
      );
      expect(source).not.toContain('"use client"');
      expect(source).not.toContain("@adapttable/react");
    }
  );

  it("includes the Angular binding and the NG-ZORRO kit's Angular 22 peers", () => {
    expect(packagesFor(detectKit({}, { framework: "angular" }))).toEqual([
      "@adapttable/core",
      "@adapttable/angular",
      "@adapttable/angular-unstyled",
    ]);
    expect(
      packagesFor(
        detectKit({ "ng-zorro-antd": "^22.1.1" }, { framework: "angular" })
      )
    ).toEqual([
      "@adapttable/core",
      "@adapttable/angular",
      "@adapttable/ng-zorro",
      "@angular/cdk@^22.0.0",
      "@angular/forms@^22.0.0",
      "@angular/router@^22.0.0",
    ]);
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
    expect(result.framework).toBe("react");
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

  it("scaffolds native Angular from devDependencies and reports standalone setup", () => {
    const { io, written, logs } = makeIO(
      JSON.stringify({
        dependencies: { "@mantine/core": "8", tailwindcss: "4" },
        devDependencies: { "@angular/core": "^22.2.0" },
      }),
      ["yarn.lock"],
      ["angular.json", "components.json"]
    );
    const result = runInit(io);
    expect(result).toEqual({
      framework: "angular",
      kit: "angular-unstyled",
      adapter: "@adapttable/angular-unstyled",
      packageManager: "yarn",
      packages: [
        "@adapttable/core",
        "@adapttable/angular",
        "@adapttable/angular-unstyled",
      ],
      installCommand:
        "yarn add @adapttable/core @adapttable/angular @adapttable/angular-unstyled",
      written: ["src/app/peopleTable.ts"],
      skipped: [],
    });
    expect(Object.keys(written)).toEqual(["src/app/peopleTable.ts"]);
    expect(written["src/app/peopleTable.ts"]).toContain(
      "export class PeopleTable"
    );
    expect(logs.join("\n")).toContain("detected Angular (Angular unstyled)");
    expect(logs.join("\n")).toContain(
      "Angular kits are prepared for their first public release"
    );
    expect(logs.join("\n")).toContain(
      "add PeopleTable to its imports, and render <people-table />"
    );
    expect(logs.join("\n")).toContain(
      "Check registry availability before installing; use built local packages"
    );
    expect(logs.join("\n")).not.toContain("private workspace packages");
    expect(logs.join("\n")).not.toContain("MantineProvider");
    expect(logs.join("\n")).not.toContain("ng-zorro-antd.min.css");
  });

  it("reports NG-ZORRO setup without reinstalling existing Angular peers", () => {
    const { io, written, logs } = makeIO(
      JSON.stringify({
        dependencies: {
          "@angular/core": "22.2.0",
          "@angular/forms": "22.2.0",
          "ng-zorro-antd": "^22.1.1",
        },
        devDependencies: { "@angular/cdk": "22.1.0" },
      }),
      ["bun.lock"],
      ["angular.json"]
    );
    const result = runInit(io);
    expect(result.framework).toBe("angular");
    expect(result.kit).toBe("ng-zorro");
    expect(result.adapter).toBe("@adapttable/ng-zorro");
    expect(result.packages).toEqual([
      "@adapttable/core",
      "@adapttable/angular",
      "@adapttable/ng-zorro",
      "@angular/router@^22.0.0",
    ]);
    expect(result.installCommand).toBe(
      "bun add @adapttable/core @adapttable/angular @adapttable/ng-zorro @angular/router@^22.0.0"
    );
    expect(written["src/app/peopleTable.ts"]).toContain(
      'from "@adapttable/ng-zorro"'
    );
    expect(logs.join("\n")).toContain(
      "Angular kits are prepared for their first public release"
    );
    expect(logs.join("\n")).toContain(
      "Check registry availability before installing; use built local packages"
    );
    expect(logs.join("\n")).not.toContain("private workspace packages");
    expect(logs.join("\n")).toContain("NG-ZORRO requires Angular 22");
    expect(logs.join("\n")).toContain(
      '@import "ng-zorro-antd/ng-zorro-antd.min.css";'
    );
    expect(Object.keys(written)).toEqual(["src/app/peopleTable.ts"]);
  });

  it.each([
    {
      dependencies: { "@angular/core": "^22.2.0", tailwindcss: "4" },
      markers: ["components.json"],
    },
    {
      dependencies: { tailwindcss: "4" },
      markers: ["angular.json", "components.json"],
    },
  ])(
    "keeps the React shadcn scaffold when one Angular marker is missing ($markers)",
    ({ dependencies, markers }) => {
      const { io, written } = makeIO(
        JSON.stringify({ dependencies }),
        [],
        markers
      );
      const result = runInit(io);
      expect(result.framework).toBe("react");
      expect(result.kit).toBe("shadcn");
      expect(result.written).toEqual(["src/PeopleTable.tsx"]);
      expect(Object.keys(written)).toEqual(["src/PeopleTable.tsx"]);
      expect(written["src/PeopleTable.tsx"]).toContain('"use client"');
    }
  );

  it("preserves an edited Angular component until --force is requested", () => {
    const { io, written, logs } = makeIO(
      JSON.stringify({ dependencies: { "@angular/core": "^22.2.0" } }),
      ["pnpm-lock.yaml"],
      ["angular.json"]
    );
    const path = "src/app/peopleTable.ts";
    const original = runInit(io);
    expect(original.written).toEqual([path]);
    io.writeFile(path, "// host-owned Angular component");
    const repeated = runInit(io);
    expect(repeated.written).toEqual([]);
    expect(repeated.skipped).toEqual([path]);
    expect(written[path]).toBe("// host-owned Angular component");
    expect(logs.join("\n")).toContain(
      `Skipped (already exist, use --force to overwrite): ${path}`
    );
    const forced = runInit(io, { force: true });
    expect(forced.written).toEqual([path]);
    expect(forced.skipped).toEqual([]);
    expect(written[path]).toContain("export class PeopleTable");
    expect(written[path]).not.toContain("host-owned Angular component");
  });
});

describe("starterComponent (v2 shape)", () => {
  it("scaffolds the zero-ceremony data tier with a use client banner", () => {
    const mantine = detectKit({ "@mantine/core": "8" });
    const src = starterComponent(mantine);
    expect(src.startsWith('"use client";')).toBe(true);
    expect(src).toContain("data={PEOPLE}");
    expect(src).not.toContain("useFrontendData");
  });
});

describe("private Angular kit discovery", () => {
  it("links private kits locally instead of claiming registry installation", () => {
    const { io, logs } = makeIO(
      JSON.stringify({
        dependencies: { "@angular/core": "22.2.0", "@angular/aria": "22.2.1" },
      }),
      ["pnpm-lock.yaml"]
    );
    const result = runInit(io);
    expect(result.kit).toBe("angular-aria");
    expect(result.installCommand).not.toContain("@adapttable/angular-aria");
    expect(logs.join("\n")).toContain(
      "private 0.0.0 workspace preview, not available on npm"
    );
    expect(logs.join("\n")).toContain(
      "Build and link its local package separately"
    );
  });
  it("prefers a specific UI kit when its transitive CDK peer is present", () => {
    expect(
      detectKit(
        { "@angular/aria": "22.2.1", "@angular/cdk": "22.2.1" },
        { framework: "angular" }
      ).kit
    ).toBe("angular-aria");
    expect(
      detectKit(
        { "@clr/angular": "18.3.0", "@angular/cdk": "22.2.1" },
        { framework: "angular" }
      ).kit
    ).toBe("clarity");
  });

  it.each([
    ["@angular/material", "angular-material", "@adapttable/angular-material"],
    ["@ng-bootstrap/ng-bootstrap", "ng-bootstrap", "@adapttable/ng-bootstrap"],
    ["@spartan-ng/brain", "spartan", "@adapttable/spartan"],
    ["@taiga-ui/core", "taiga-ui", "@adapttable/taiga-ui"],
    ["@angular/aria", "angular-aria", "@adapttable/angular-aria"],
    ["@angular/cdk", "angular-cdk", "@adapttable/angular-cdk"],
    ["@clr/angular", "clarity", "@adapttable/clarity"],
    ["ngx-bootstrap", "ngx-bootstrap", "@adapttable/ngx-bootstrap"],
  ])("detects %s only in Angular", (signal, kit, adapter) => {
    expect(
      detectKit({ [signal]: "*" }, { framework: "angular" })
    ).toMatchObject({ kit, adapter, framework: "angular" });
    expect(detectKit({ [signal]: "*" }).kit).toBe("unstyled");
  });
});
