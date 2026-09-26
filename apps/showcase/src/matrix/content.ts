/**
 * The matrix, typed for the app.
 *
 * `matrix.mjs` is plain JavaScript because the build scripts and the sitemap
 * read it from Node without a compile step. This is the seam where the app
 * picks it up: the types come from the module's own JSDoc, and everything the
 * pages need to look something up lives here rather than being re-derived in
 * each component.
 */
import { docsRoute, siteUrl } from "../../../../scripts/site.mjs";
import {
  adapterByKey,
  builtAdapters,
  CANONICAL_AI_ADAPTER,
  featureBySlug,
  fillTemplate,
  frameworkOf,
  introFor,
  LANDING,
  MATRIX_FEATURES,
  SHOWCASE_ADAPTERS,
  SHOWCASE_FRAMEWORKS,
  snippetFor,
} from "../../matrix.mjs";

export {
  adapterByKey,
  builtAdapters,
  CANONICAL_AI_ADAPTER,
  featureBySlug,
  fillTemplate,
  frameworkOf,
  introFor,
  LANDING,
  MATRIX_FEATURES,
  SHOWCASE_ADAPTERS,
  SHOWCASE_FRAMEWORKS,
  snippetFor,
};

export type ShowcaseAdapter = (typeof SHOWCASE_ADAPTERS)[number];
export type MatrixFeature = (typeof MATRIX_FEATURES)[number];
export type ShowcaseFramework = (typeof SHOWCASE_FRAMEWORKS)[number];

/** Which adapter and feature a page is for, read from its own markup. */
export interface MatrixRoute {
  readonly adapter: ShowcaseAdapter;
  /** The framework the adapter's kit is built on — the one serving the page. */
  readonly framework: ShowcaseFramework;
  /** `null` on an adapter's landing page. */
  readonly feature: MatrixFeature | null;
}

/**
 * Resolve `mantine` or `mantine/saved-views` to the adapter and feature it
 * names, for an entry that serves one framework's kits.
 *
 * The identifier is written into `#root`'s `data-matrix-page` by the HTML
 * generator, so the page knows what it is from its own markup rather than by
 * parsing a URL that the dev server and the published site spell differently.
 * A kit built on another framework boots that framework's entry, so this entry
 * resolves it to nothing rather than rendering it with the wrong binding.
 *
 * @param id - The page identifier.
 * @param framework - The framework the calling entry serves.
 * @returns The route, or `null` when the id names nothing this entry serves.
 */
export function resolveMatrixRoute(
  id: string,
  framework: string
): MatrixRoute | null {
  const [adapterKey, featureSlug] = id.split("/");
  const adapter = adapterKey ? adapterByKey(adapterKey) : undefined;
  if (adapter?.framework !== framework) return null;
  const route = { adapter, framework: frameworkOf(adapter) };
  if (!featureSlug) return { ...route, feature: null };
  const feature = featureBySlug(featureSlug);
  return feature ? { ...route, feature } : null;
}

/**
 * The kit's accent for the current theme — the value every tinted rule on the
 * page reads through `--kit`.
 *
 * @param adapter - The adapter the page is for.
 * @param dark - Whether the page is in dark mode.
 * @returns The accent colour.
 */
export const kitAccent = (adapter: ShowcaseAdapter, dark: boolean): string =>
  dark ? adapter.accentDark : adapter.accentLight;

/** The site's home page — the landing the docs and the showcase share. */
export const SITE_HOME = siteUrl("/");

/**
 * Where the docs site publishes a page, in the section it is served in.
 *
 * @param page - The page's `docs/*.md` basename, e.g. `getting-started`.
 * @returns The page's absolute URL.
 */
export const docsUrl = (page: string): string => siteUrl(docsRoute(page));

/**
 * An absolute URL on the published site, for assets the showcase links to.
 *
 * @param route - A path starting with `/`.
 * @returns The absolute URL.
 */
export const siteAsset = (route: string): string => siteUrl(route);

/**
 * Where a kit's own pages live, or — until they are built — the live demo
 * pinned to that kit, which is a page that exists and shows it.
 *
 * @param adapter - The kit to link to.
 * @param root - The relative prefix back to the demo home.
 * @returns The href.
 */
export const adapterHref = (adapter: ShowcaseAdapter, root: string): string =>
  adapter.built ? `${root}/${adapter.key}/` : `${root}/?kit=${adapter.key}`;
