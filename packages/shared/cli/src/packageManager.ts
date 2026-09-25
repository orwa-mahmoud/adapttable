/**
 * Supported package managers.
 *
 * @public
 */
export type PackageManager = "pnpm" | "yarn" | "bun" | "npm";

/** Lockfile → package manager, in detection order. */
const LOCKFILES: readonly [string, PackageManager][] = [
  ["pnpm-lock.yaml", "pnpm"],
  ["yarn.lock", "yarn"],
  ["bun.lock", "bun"],
  ["bun.lockb", "bun"],
  ["package-lock.json", "npm"],
];

/**
 * Choose a package manager from the lockfiles present in a project.
 *
 * @param files - File names present at the project root.
 * @returns The detected manager, or `"npm"` when none match.
 * @public
 */
export function choosePackageManager(files: readonly string[]): PackageManager {
  const present = new Set(files);
  for (const [lockfile, pm] of LOCKFILES) {
    if (present.has(lockfile)) return pm;
  }
  return "npm";
}

/**
 * Build the install command for a manager + package list.
 *
 * @param pm - The package manager.
 * @param packages - Packages to install (preserves order).
 * @returns A runnable install command string.
 * @public
 */
export function installCommand(
  pm: PackageManager,
  packages: readonly string[]
): string {
  const list = packages.join(" ");
  switch (pm) {
    case "pnpm":
      return `pnpm add ${list}`;
    case "yarn":
      return `yarn add ${list}`;
    case "bun":
      return `bun add ${list}`;
    default:
      return `npm install ${list}`;
  }
}
