import { describe, expect, it, vi } from "vitest";

import * as detection from "./detect";
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

  it.each(KITS.filter((info) => info.framework === "angular"))(
    "scaffolds a standalone Angular component for $kit through public imports",
    (info) => {
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

const angularReleaseKits = [
  {
    signal: "@angular/material",
    version: "^22.2.1",
    kit: "angular-material",
    adapter: "@adapttable/angular-material",
    peers: ["@angular/cdk@^22.2.1", "@angular/forms@^22.0.0"],
    setup: [
      "Configure an Angular Material Sass theme",
      "@adapttable/angular-material/styles.css",
      "@angular/cdk/overlay-prebuilt.css",
    ],
  },
  {
    signal: "@ng-bootstrap/ng-bootstrap",
    version: "^21.0.0",
    kit: "ng-bootstrap",
    adapter: "@adapttable/ng-bootstrap",
    peers: [
      "bootstrap@^5.3.8",
      "@popperjs/core@^2.11.8",
      "@angular/forms@^22.0.0",
      "@angular/localize@^22.0.0",
    ],
    setup: [
      "@angular/localize/init",
      "@adapttable/ng-bootstrap/styles.css",
      "Do not load global Bootstrap CSS or JavaScript",
    ],
  },
  {
    signal: "@spartan-ng/brain",
    version: "^1.5.0",
    kit: "spartan",
    adapter: "@adapttable/spartan",
    peers: [
      "@angular/cdk@^22.0.0",
      "@angular/forms@^22.0.0",
      "tailwindcss@^4.0.0",
      "clsx@^2.1.1",
      "tw-animate-css@^1.0.0",
    ],
    setup: [
      "@adapttable/spartan/styles.css through Tailwind 4",
      "@angular/cdk/overlay-prebuilt.css",
    ],
  },
  {
    signal: "@taiga-ui/core",
    version: "5.26.0",
    kit: "taiga-ui",
    adapter: "@adapttable/taiga-ui",
    peers: [
      "@taiga-ui/kit@5.26.0",
      "@taiga-ui/cdk@5.26.0",
      "@taiga-ui/i18n@5.26.0",
      "@taiga-ui/styles@5.26.0",
      "@taiga-ui/design-tokens@~0.320.0",
      "@taiga-ui/icons@5.26.0",
      "@taiga-ui/event-plugins@^5.0.0",
      "@taiga-ui/polymorpheus@^5.0.1",
      "@taiga-ui/font-watcher@~0.6.0",
      "@maskito/angular@^5.5.0",
      "@maskito/core@^5.5.0",
      "@maskito/kit@^5.5.0",
      "@maskito/phone@^5.5.0",
      "libphonenumber-js@^1.13.14",
      "@ng-web-apis/common@^5.3.0",
      "@ng-web-apis/intersection-observer@^5.3.0",
      "@ng-web-apis/mutation-observer@^5.3.0",
      "@ng-web-apis/platform@^5.3.0",
      "@ng-web-apis/resize-observer@^5.3.0",
      "@ng-web-apis/screen-orientation@^5.3.0",
      "@types/dom-speech-recognition@^0.0.12",
      "@angular/cdk@^22.0.0",
      "@angular/forms@^22.0.0",
      "@angular/router@^22.0.0",
    ],
    setup: [
      "provideAdaptTaiga() from @adapttable/taiga-ui in bootstrap providers",
      "configure Less",
      "@taiga-ui/icons@5.26.0 src assets from assets/taiga-ui/icons",
    ],
  },
  {
    signal: "@angular/aria",
    version: "22.2.1",
    kit: "angular-aria",
    adapter: "@adapttable/angular-aria",
    peers: ["@angular/cdk@22.2.1", "@angular/forms@^22.0.0"],
    setup: [
      "@angular/cdk/overlay-prebuilt.css",
      "@adapttable/angular-aria/styles.css",
    ],
  },
  {
    signal: "@angular/cdk",
    version: "^22.2.1",
    kit: "angular-cdk",
    adapter: "@adapttable/angular-cdk",
    peers: ["@angular/forms@^22.0.0"],
    setup: [
      "@angular/cdk/overlay-prebuilt.css",
      "@adapttable/angular-cdk/styles.css",
    ],
  },
  {
    signal: "ngx-bootstrap",
    version: "22.0.0",
    kit: "ngx-bootstrap",
    adapter: "@adapttable/ngx-bootstrap",
    peers: ["@angular/forms@^22.0.0"],
    setup: [
      "Use zoneless Angular 22",
      "@adapttable/ngx-bootstrap/styles.css",
      "Do not load global Bootstrap CSS or JavaScript",
    ],
  },
];

describe("Angular kit first-public-release discovery", () => {
  it.each(angularReleaseKits)(
    "detects $signal only in Angular and includes its public install target",
    ({ signal, version, kit, adapter, peers }) => {
      const info = detectKit({ [signal]: "*" }, { framework: "angular" });
      expect(info).toMatchObject({ kit, adapter, framework: "angular" });
      expect(info.privatePreview).toBeUndefined();
      expect(packagesFor(info)).toEqual([
        "@adapttable/core",
        "@adapttable/angular",
        adapter,
        `${signal}@${version}`,
        ...peers,
      ]);
      expect(detectKit({ [signal]: "*" }).kit).toBe("unstyled");
    }
  );

  it.each(angularReleaseKits.filter(({ kit }) => kit !== "angular-cdk"))(
    "prefers $kit when its transitive CDK peer is present",
    ({ signal, kit }) => {
      expect(
        detectKit(
          { [signal]: "*", "@angular/cdk": "22.2.1" },
          { framework: "angular" }
        ).kit
      ).toBe(kit);
    }
  );

  it.each([
    { signal: "@clr/angular", adapter: "@adapttable/clarity" },
    { signal: "@nebular/theme", adapter: "@adapttable/nebular" },
    { signal: "primeng", adapter: "@adapttable/primeng" },
  ])("does not register the excluded $signal kit", ({ signal, adapter }) => {
    expect(KITS.flatMap((info) => info.signals)).not.toContain(signal);
    expect(KITS.map((info) => info.adapter)).not.toContain(adapter);
  });
});

describe.each([
  { lockfile: "package-lock.json", command: "npm install" },
  { lockfile: "pnpm-lock.yaml", command: "pnpm add" },
  { lockfile: "yarn.lock", command: "yarn add" },
  { lockfile: "bun.lock", command: "bun add" },
])("Angular release scaffolding with $command", ({ lockfile, command }) => {
  it.each(angularReleaseKits)(
    "installs $kit with missing peers and keeps native host setup",
    ({ signal, version, kit, adapter, peers, setup }) => {
      const { io, logs, written } = makeIO(
        JSON.stringify({
          dependencies: { "@angular/core": "22.2.0" },
          devDependencies: { [signal]: version },
        }),
        [lockfile],
        ["angular.json"]
      );
      const result = runInit(io);
      const packages = [
        "@adapttable/core",
        "@adapttable/angular",
        adapter,
        ...peers,
      ];
      expect(result.framework).toBe("angular");
      expect(result.kit).toBe(kit);
      expect(result.adapter).toBe(adapter);
      expect(result.packages).toEqual(packages);
      expect(result.installCommand).toBe(`${command} ${packages.join(" ")}`);
      expect(result.written).toEqual(["src/app/peopleTable.ts"]);
      expect(Object.keys(written)).toEqual(result.written);
      expect(written["src/app/peopleTable.ts"]).toContain(
        `import { AdaptDataTable } from "${adapter}"`
      );
      const output = logs.join("\n");
      expect(output).toContain("1. Install the packages:");
      expect(output).toContain(result.installCommand);
      expect(output).toContain(
        "Angular kits are prepared for their first public release"
      );
      expect(output).toContain("Check registry availability before installing");
      expect(output).toContain(
        "add PeopleTable to its imports, and render <people-table />"
      );
      expect(output).not.toMatch(
        /private|workspace preview|published peers|Build and link/
      );
      for (const guidance of setup) expect(output).toContain(guidance);
    }
  );
});

describe("Angular release host ownership", () => {
  it.each(angularReleaseKits)(
    "preserves existing $kit peers and an edited component until --force",
    ({ signal, kit, adapter }) => {
      const info = detectKit({ [signal]: "*" }, { framework: "angular" });
      const existingPeers = Object.fromEntries(
        info.extras.map((specifier) => [
          specifier.slice(0, specifier.lastIndexOf("@")),
          specifier.slice(specifier.lastIndexOf("@") + 1),
        ])
      );
      const { io, written } = makeIO(
        JSON.stringify({
          dependencies: { "@angular/core": "22.2.0" },
          devDependencies: existingPeers,
        }),
        ["pnpm-lock.yaml"],
        ["angular.json"]
      );
      const path = "src/app/peopleTable.ts";
      io.writeFile(path, "// Keep this host-owned table");
      const result = runInit(io);
      expect(result.kit).toBe(kit);
      expect(result.packages).toEqual([
        "@adapttable/core",
        "@adapttable/angular",
        adapter,
      ]);
      expect(result.written).toEqual([]);
      expect(result.skipped).toEqual([path]);
      expect(written[path]).toBe("// Keep this host-owned table");
      const forced = runInit(io, { force: true });
      expect(forced.written).toEqual([path]);
      expect(forced.skipped).toEqual([]);
      expect(written[path]).toContain(`from "${adapter}"`);
      expect(written[path]).not.toContain("Keep this host-owned table");
    }
  );
});

describe("private preview metadata compatibility", () => {
  it("keeps the local-only flow for an explicitly marked preview", () => {
    const info = detectKit({}, { framework: "angular" });
    const detect = vi.spyOn(detection, "detectKit").mockReturnValue({
      ...info,
      privatePreview: true,
    });
    try {
      const { io, logs } = makeIO(
        JSON.stringify({ dependencies: { "@angular/core": "22.2.0" } }),
        ["pnpm-lock.yaml"],
        ["angular.json"]
      );
      const result = runInit(io);
      expect(result.packages).toEqual([
        "@adapttable/core",
        "@adapttable/angular",
      ]);
      expect(result.installCommand).not.toContain(info.adapter);
      expect(logs.join("\n")).toContain("1. Install the published peers:");
      expect(logs.join("\n")).toContain(
        `${info.adapter} is a private 0.0.0 workspace preview, not available on npm`
      );
      expect(logs.join("\n")).toContain(
        "Build and link its local package separately"
      );
    } finally {
      detect.mockRestore();
    }
  });
});

describe("required native peer closure", () => {
  it.each(["angular-aria", "angular-cdk"])(
    "%s supplies Forms required by its native CDK peer",
    (kit) => {
      const info = KITS.find((entry) => entry.kit === kit)!;
      expect(packagesFor(info)).toContain("@angular/forms@^22.0.0");
    }
  );

  it("supplies Taiga's nested nonoptional peers without relying on peer auto-install", () => {
    const taiga = KITS.find((entry) => entry.kit === "taiga-ui")!;
    const names = packagesFor(taiga).map((specifier) =>
      specifier.slice(0, specifier.lastIndexOf("@"))
    );
    // Taiga 5.26.0 peer manifests, plus the locked Maskito/ng-web-apis peers.
    for (const name of [
      "@taiga-ui/design-tokens",
      "@taiga-ui/polymorpheus",
      "@taiga-ui/font-watcher",
      "@maskito/angular",
      "@maskito/core",
      "@maskito/kit",
      "@maskito/phone",
      "libphonenumber-js",
      "@ng-web-apis/common",
      "@ng-web-apis/intersection-observer",
      "@ng-web-apis/mutation-observer",
      "@ng-web-apis/platform",
      "@ng-web-apis/resize-observer",
      "@ng-web-apis/screen-orientation",
      "@types/dom-speech-recognition",
    ]) {
      expect(names).toContain(name);
    }
  });

  it("does not add Spartan's optional Luxon peer", () => {
    const spartan = KITS.find((entry) => entry.kit === "spartan")!;
    expect(
      packagesFor(spartan).some((specifier) => specifier.startsWith("luxon@"))
    ).toBe(false);
  });
});
