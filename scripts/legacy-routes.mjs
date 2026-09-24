/**
 * The site's previous address, and where each of its paths is served now.
 *
 * `https://orwa-mahmoud.github.io/adapttable/` is the previous address: docs
 * pages at the root of that base, the showcase under `/demo/`. It answers with
 * a redirect page for every page the site serves (`build-legacy-site.mjs`), and
 * the Cloudflare `_redirects` file maps the same path shapes on the new origin.
 * Both read the mapping below.
 */
import { DOCS_VERSIONS } from "../apps/docs/versions.mjs";
import { DEMO_ROOT, docsSlug, FRAMEWORK } from "./site.mjs";

/** The origin the site was published on before it moved. */
export const LEGACY_ORIGIN = "https://orwa-mahmoud.github.io";

/** The base path the site was published under on {@link LEGACY_ORIGIN}. */
export const LEGACY_BASE = "/adapttable";

/** The previous site root, without a trailing slash. */
export const LEGACY_SITE = `${LEGACY_ORIGIN}${LEGACY_BASE}`;

const VERSIONS = new Set(DOCS_VERSIONS.map(({ slug }) => slug));

/** Top-level folders that hold files rather than pages. */
const FILE_DIRS = new Set(["media", "og", "_astro", "pagefind"]);

const PAGE_SEGMENT = /^[a-z0-9-]+$/;

const LEGACY_DEMO = "/demo/";

/**
 * Where a path of the previous site is served now.
 *
 * @param {string} path - A path below {@link LEGACY_BASE}, starting with `/`:
 *   `/filtering/`, `/demo/mantine/pivot/`, `/v1/columns/`, `/media/x.gif`.
 * @returns {string} The path on the current site. Files keep their path.
 */
export const currentRoute = (path) => {
  if (path === "/demo") return DEMO_ROOT;
  if (path.startsWith(LEGACY_DEMO)) {
    return `${DEMO_ROOT}${path.slice(LEGACY_DEMO.length)}`;
  }
  const [, first = "", ...rest] = path.split("/");
  if (VERSIONS.has(first)) {
    const inner = currentRoute(`/${rest.join("/")}`);
    return inner === "/" ? `/${first}/` : `/${first}${inner}`;
  }
  if (first === "" || FILE_DIRS.has(first) || !PAGE_SEGMENT.test(first)) {
    return path;
  }
  const isPage = rest.length === 0 || (rest.length === 1 && rest[0] === "");
  return isPage ? `/${docsSlug(first)}/` : path;
};

/**
 * The previous path of a page the current site serves — the inverse of
 * {@link currentRoute} for page routes.
 *
 * @param {string} route - A current route, starting and ending with `/`.
 * @returns {string} The path it answered at below {@link LEGACY_BASE}.
 */
export const legacyRoute = (route) => {
  if (route.startsWith(DEMO_ROOT)) {
    return `${LEGACY_DEMO}${route.slice(DEMO_ROOT.length)}`;
  }
  const [, first = "", ...rest] = route.split("/");
  if (VERSIONS.has(first)) {
    const inner = legacyRoute(`/${rest.join("/")}`);
    return inner === "/" ? `/${first}/` : `/${first}${inner}`;
  }
  if (first === FRAMEWORK) return `/${rest.join("/")}`;
  return route;
};
