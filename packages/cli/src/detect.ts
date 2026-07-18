/** A UI kit AdaptTable can scaffold for. */
export type Kit =
  | "mantine"
  | "mui"
  | "chakra"
  | "antd"
  | "radix"
  | "base-ui"
  | "shadcn"
  | "unstyled";

/** Metadata about a kit's adapter and the packages it needs. */
export interface KitInfo {
  /** The kit identifier. */
  kit: Kit;
  /** The AdaptTable adapter package. */
  adapter: string;
  /** Dependency package names that signal this kit is present. */
  signals: string[];
  /** Extra peer packages to install alongside the adapter. */
  extras: string[];
  /** Human label for messages. */
  label: string;
}

/** The kit registry, in detection-priority order. */
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
    extras: [],
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
];

const UNSTYLED = KITS.find((k) => k.kit === "unstyled")!;

/** The shadcn/ui kit — selected by `runInit` when a `components.json` is found. */
export const SHADCN = KITS.find((k) => k.kit === "shadcn")!;

/**
 * Detect which UI kit a project uses from its merged dependency map. The
 * first kit (in priority order) whose signal package is present wins;
 * falls back to the unstyled adapter when none match.
 *
 * @param dependencies - Merged `dependencies` + `devDependencies` map.
 * @returns The chosen {@link KitInfo}.
 */
export function detectKit(
  dependencies: Readonly<Record<string, string>>
): KitInfo {
  for (const info of KITS) {
    if (info.signals.some((pkg) => pkg in dependencies)) return info;
  }
  return UNSTYLED;
}

/**
 * Merge a package.json's `dependencies` and `devDependencies` into one map.
 *
 * @param pkg - A parsed package.json (or a partial of it).
 * @returns The merged dependency map.
 */
export function mergeDependencies(pkg: {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}): Record<string, string> {
  return { ...pkg.dependencies, ...pkg.devDependencies };
}
