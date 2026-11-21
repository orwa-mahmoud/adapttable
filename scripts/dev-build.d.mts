import type { TsdownPlugin } from "tsdown";

/** One of the two builds a library package ships. */
export interface Flavor {
  readonly outDir: string;
  readonly production: boolean;
}

/** The default export condition: no development warning. */
export declare const PRODUCTION: Flavor;
/** The `development` export condition, under `dist/dev`. */
export declare const DEVELOPMENT: Flavor;
/** Both builds, production first. */
export declare const FLAVORS: readonly Flavor[];

/** The package's own source modules under `sourceDir`. */
export declare function isSourceModuleOf(
  sourceDir: string
): (id: string) => boolean;

/** The plugins one flavor adds: the warning strip, for production only. */
export declare function devWarningPlugins(
  flavor: Flavor,
  sourceDir: string
): TsdownPlugin[];
