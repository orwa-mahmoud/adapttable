/**
 * A framework the CLI can scaffold a table for.
 *
 * @public
 */
export type Framework = "react" | "angular";

/**
 * A UI kit AdaptTable can scaffold for.
 *
 * @public
 */
export type Kit =
  | "mantine"
  | "mui"
  | "chakra"
  | "antd"
  | "radix"
  | "base-ui"
  | "shadcn"
  | "unstyled"
  | "angular-unstyled"
  | "ng-zorro"
  | "angular-material"
  | "ng-bootstrap"
  | "spartan"
  | "taiga-ui"
  | "angular-aria"
  | "angular-cdk"
  | "ngx-bootstrap";

/**
 * Metadata about a kit's adapter and the packages it needs.
 *
 * @public
 */
export interface KitInfo {
  /** The kit identifier. */
  kit: Kit;
  /** The kit's framework. Omitted for React, preserving existing callers. */
  framework?: Framework;
  /** The AdaptTable adapter package. */
  adapter: string;
  /** Dependency package names that signal this kit is present. */
  signals: string[];
  /** Extra peer package specifiers to install alongside the adapter. */
  extras: string[];
  /** An unpublished workspace preview: link a local build instead of npm. */
  privatePreview?: boolean;
  /** Human label for messages. */
  label: string;
}

/**
 * The kit registry, in detection-priority order.
 *
 * @public
 */
export const KITS: readonly KitInfo[] = [
  {
    kit: "mantine",
    adapter: "@adapttable/mantine",
    signals: ["@mantine/core"],
    extras: ["@mantine/hooks"],
    label: "Mantine",
  },
  {
    kit: "mui",
    adapter: "@adapttable/mui",
    signals: ["@mui/material"],
    extras: [],
    label: "Material UI",
  },
  {
    kit: "chakra",
    adapter: "@adapttable/chakra",
    signals: ["@chakra-ui/react"],
    // Chakra v3's own peers — without @emotion/react the printed install
    // command produced a broken setup.
    extras: ["@emotion/react"],
    label: "Chakra UI",
  },
  {
    kit: "antd",
    adapter: "@adapttable/antd",
    signals: ["antd"],
    extras: [],
    label: "Ant Design",
  },
  {
    kit: "radix",
    adapter: "@adapttable/radix",
    signals: ["@radix-ui/themes"],
    extras: [],
    label: "Radix Themes",
  },
  {
    kit: "base-ui",
    adapter: "@adapttable/base-ui",
    signals: ["@base-ui/react"],
    extras: [],
    label: "Base UI",
  },
  {
    // shadcn/ui ships no package of its own (its components are copied into the
    // project), so it has no dependency signal. A Tailwind project is upgraded
    // to shadcn when a `components.json` (the shadcn config) is present — see
    // `runInit`. Listed here so the adapter is scaffoldable.
    kit: "shadcn",
    adapter: "@adapttable/shadcn",
    signals: [],
    extras: [],
    label: "shadcn/ui",
  },
  {
    kit: "unstyled",
    adapter: "@adapttable/unstyled",
    signals: ["tailwindcss"],
    extras: [],
    label: "Tailwind / unstyled",
  },
  {
    kit: "angular-material",
    privatePreview: true,
    framework: "angular",
    adapter: "@adapttable/angular-material",
    signals: ["@angular/material"],
    extras: [
      "@angular/material@^22.2.1",
      "@angular/cdk@^22.2.1",
      "@angular/forms@^22.0.0",
    ],
    label: "Angular Material",
  },
  {
    kit: "ng-bootstrap",
    privatePreview: true,
    framework: "angular",
    adapter: "@adapttable/ng-bootstrap",
    signals: ["@ng-bootstrap/ng-bootstrap"],
    extras: [
      "@ng-bootstrap/ng-bootstrap@^21.0.0",
      "bootstrap@^5.3.8",
      "@popperjs/core@^2.11.8",
      "@angular/forms@^22.0.0",
      "@angular/localize@^22.0.0",
    ],
    label: "ng-bootstrap",
  },
  {
    kit: "spartan",
    privatePreview: true,
    framework: "angular",
    adapter: "@adapttable/spartan",
    signals: ["@spartan-ng/brain"],
    extras: [
      "@spartan-ng/brain@^1.5.0",
      "@angular/cdk@^22.0.0",
      "@angular/forms@^22.0.0",
      "tailwindcss@^4.0.0",
      "clsx@^2.1.1",
      "tw-animate-css@^1.0.0",
    ],
    label: "Spartan",
  },
  {
    kit: "taiga-ui",
    privatePreview: true,
    framework: "angular",
    adapter: "@adapttable/taiga-ui",
    signals: ["@taiga-ui/core"],
    extras: [
      "@taiga-ui/core@5.26.0",
      "@taiga-ui/kit@5.26.0",
      "@taiga-ui/cdk@5.26.0",
      "@taiga-ui/i18n@5.26.0",
      "@taiga-ui/styles@5.26.0",
      "@taiga-ui/icons@5.26.0",
      "@taiga-ui/event-plugins@^5.0.0",
      "@angular/cdk@^22.0.0",
      "@angular/forms@^22.0.0",
      "@angular/router@^22.0.0",
    ],
    label: "Taiga UI",
  },
  {
    kit: "ng-zorro",
    framework: "angular",
    adapter: "@adapttable/ng-zorro",
    signals: ["ng-zorro-antd"],
    // The kit targets Angular 22. Do not upgrade host peers to a newer major.
    extras: [
      "@angular/cdk@^22.0.0",
      "@angular/forms@^22.0.0",
      "@angular/router@^22.0.0",
    ],
    label: "NG-ZORRO",
  },
  {
    kit: "angular-aria",
    framework: "angular",
    privatePreview: true,
    adapter: "@adapttable/angular-aria",
    signals: ["@angular/aria"],
    extras: ["@angular/aria@22.2.1", "@angular/cdk@22.2.1"],
    label: "Angular Aria",
  },
  {
    kit: "ngx-bootstrap",
    framework: "angular",
    privatePreview: true,
    adapter: "@adapttable/ngx-bootstrap",
    signals: ["ngx-bootstrap"],
    extras: ["ngx-bootstrap@22.0.0", "@angular/forms@^22.0.0"],
    label: "ngx-bootstrap",
  },
  {
    kit: "angular-cdk",
    framework: "angular",
    privatePreview: true,
    adapter: "@adapttable/angular-cdk",
    signals: ["@angular/cdk"],
    extras: ["@angular/cdk@^22.2.1"],
    label: "Angular CDK",
  },
  {
    kit: "angular-unstyled",
    framework: "angular",
    adapter: "@adapttable/angular-unstyled",
    signals: [],
    extras: [],
    label: "Angular unstyled",
  },
];

const UNSTYLED = KITS.find((k) => k.kit === "unstyled")!;
const ANGULAR_UNSTYLED = KITS.find((k) => k.kit === "angular-unstyled")!;

/**
 * The shadcn/ui kit — selected by `runInit` when a `components.json` is found.
 *
 * @public
 */
export const SHADCN = KITS.find((k) => k.kit === "shadcn")!;

/**
 * Detect Angular only when both its dependency and workspace file are present.
 * All other projects retain the React scaffold.
 *
 * @param dependencies - Merged `dependencies` + `devDependencies` map.
 * @param options - Whether the project contains `angular.json`.
 * @returns The framework to scaffold.
 * @public
 */
export function detectFramework(
  dependencies: Readonly<Record<string, string>>,
  options?: { hasAngularJson?: boolean }
): Framework {
  return options?.hasAngularJson && Object.hasOwn(dependencies, "@angular/core")
    ? "angular"
    : "react";
}

/**
 * Detect which UI kit a project uses from its merged dependency map. The
 * first kit (in priority order) whose signal package is present wins;
 * falls back to that framework's unstyled adapter when none match. The
 * framework defaults to React for existing callers.
 *
 * shadcn/ui ships no package of its own, so it has no dependency signal —
 * pass `hasComponentsJson` (the presence of shadcn's `components.json`)
 * and a Tailwind project resolves to the shadcn adapter, exactly as
 * `runInit` does.
 *
 * @param dependencies - Merged `dependencies` + `devDependencies` map.
 * @param options - Extra detection context beyond the dependency map.
 * @returns The chosen {@link KitInfo}.
 * @public
 */
export function detectKit(
  dependencies: Readonly<Record<string, string>>,
  options?: { hasComponentsJson?: boolean; framework?: Framework }
): KitInfo {
  const framework = options?.framework ?? "react";
  for (const info of KITS) {
    if ((info.framework ?? "react") !== framework) continue;
    if (info.signals.some((pkg) => Object.hasOwn(dependencies, pkg))) {
      return info.kit === "unstyled" && options?.hasComponentsJson
        ? SHADCN
        : info;
    }
  }
  if (framework === "angular") return ANGULAR_UNSTYLED;
  return options?.hasComponentsJson ? SHADCN : UNSTYLED;
}

/**
 * Merge a package.json's `dependencies` and `devDependencies` into one map.
 *
 * @param pkg - A parsed package.json (or a partial of it).
 * @returns The merged dependency map.
 * @public
 */
export function mergeDependencies(pkg: {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}): Record<string, string> {
  return { ...pkg.dependencies, ...pkg.devDependencies };
}
