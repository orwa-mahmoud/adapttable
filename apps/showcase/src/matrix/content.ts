/**
 * The matrix, typed for the app.
 *
 * `matrix.mjs` is plain JavaScript because the build scripts and the sitemap
 * read it from Node without a compile step. This is the seam where the app
 * picks it up: the types come from the module's own JSDoc, and everything the
 * pages need to look something up lives here rather than being re-derived in
 * each component.
 */
import {
  adapterByKey,
  builtAdapters,
  CANONICAL_AI_ADAPTER,
  featureBySlug,
  fillTemplate,
  introFor,
  LANDING,
  MATRIX_FEATURES,
  SHOWCASE_ADAPTERS,
} from "../../matrix.mjs";

export {
  adapterByKey,
  builtAdapters,
  CANONICAL_AI_ADAPTER,
  featureBySlug,
  fillTemplate,
  introFor,
  LANDING,
  MATRIX_FEATURES,
  SHOWCASE_ADAPTERS,
};

export type ShowcaseAdapter = (typeof SHOWCASE_ADAPTERS)[number];
export type MatrixFeature = (typeof MATRIX_FEATURES)[number];

/** Which adapter and feature a page is for, read from its own markup. */
export interface MatrixRoute {
  readonly adapter: ShowcaseAdapter;
  /** `null` on an adapter's landing page. */
  readonly feature: MatrixFeature | null;
}

/**
 * Resolve `mantine` or `mantine/saved-views` to the adapter and feature it
 * names.
 *
 * The identifier is written into `#root`'s `data-matrix-page` by the HTML
 * generator, so the page knows what it is from its own markup rather than by
 * parsing a URL that the dev server and the published site spell differently.
 *
 * @param id - The page identifier.
 * @returns The route, or `null` when the id names nothing.
 */
export function resolveMatrixRoute(id: string): MatrixRoute | null {
  const [adapterKey, featureSlug] = id.split("/");
  const adapter = adapterKey ? adapterByKey(adapterKey) : undefined;
  if (!adapter) return null;
  if (!featureSlug) return { adapter, feature: null };
  const feature = featureBySlug(featureSlug);
  return feature ? { adapter, feature } : null;
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

/** Where the docs site publishes the written reference. */
export const DOCS_URL = "https://orwa-mahmoud.github.io/adapttable/";

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
