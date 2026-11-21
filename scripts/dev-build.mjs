/**
 * The two builds a library package ships.
 *
 * The production build is the default export condition and carries no
 * development warning: every `devWarn` statement and its message is compiled
 * out of the package's own source. The development build, under the
 * `development` condition bundlers select in development, keeps them.
 */
import { stripDevWarnings } from "./strip-dev-warnings.mjs";

/** @typedef {{ readonly outDir: string, readonly production: boolean }} Flavor */

/** @type {Flavor} */
export const PRODUCTION = Object.freeze({ outDir: "dist", production: true });

/** @type {Flavor} */
export const DEVELOPMENT = Object.freeze({
  outDir: "dist/dev",
  production: false,
});

/** Both builds, production first: it clears `dist/`, `dist/dev/` included. */
export const FLAVORS = Object.freeze([PRODUCTION, DEVELOPMENT]);

/**
 * The package's own source modules under `sourceDir`, whose warnings a
 * production build drops.
 *
 * @param {string} sourceDir - Absolute path of the package's `src/`, with a
 *   trailing separator.
 * @returns {(id: string) => boolean}
 */
export function isSourceModuleOf(sourceDir) {
  return (id) =>
    id.startsWith(sourceDir) && /\.tsx?$/.test(id) && !id.endsWith(".d.ts");
}

/**
 * The plugins one flavor adds: the warning strip, for production only.
 *
 * @param {Flavor} flavor
 * @param {string} sourceDir - Absolute path of the package's `src/`.
 */
export function devWarningPlugins(flavor, sourceDir) {
  return flavor.production
    ? [
        stripDevWarnings({
          callee: "devWarn",
          include: isSourceModuleOf(sourceDir),
        }),
      ]
    : [];
}
