/**
 * `@adapttable/cli` — the scaffolding CLI for AdaptTable.
 *
 * `npx @adapttable/cli init` detects your UI kit, picks your package manager,
 * writes a starter table, and prints the install command. This module
 * exposes the pure building blocks (also usable programmatically).
 *
 * @packageDocumentation
 */

export {
  detectKit,
  type Kit,
  type KitInfo,
  KITS,
  mergeDependencies,
  SHADCN,
} from "./detect";
export {
  InitError,
  type InitIO,
  type InitOptions,
  type InitResult,
  runInit,
} from "./init";
export {
  choosePackageManager,
  installCommand,
  type PackageManager,
} from "./packageManager";
export {
  packagesFor,
  type ScaffoldFile,
  scaffoldFiles,
  STARTER_PATH,
  starterComponent,
} from "./scaffold";
