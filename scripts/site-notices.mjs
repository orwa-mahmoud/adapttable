/** Full, versioned notices for packages represented in browser build chunks. */
import {
  existsSync,
  readdirSync,
  readFileSync,
  realpathSync,
  statSync,
} from "node:fs";
import { dirname, isAbsolute, join, parse, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * @typedef {object} PackageManifest
 * @property {string} name
 * @property {string} version
 * @property {string} [license]
 * @property {boolean} [private]
 *
 * @typedef {{directory: string, data: PackageManifest}} LocatedPackage
 *
 * @typedef {object} NoticeFile
 * @property {string} name
 * @property {string} text
 * @property {string} [source]
 *
 * @typedef {object} PackageNotice
 * @property {string} name
 * @property {string} version
 * @property {string} license
 * @property {NoticeFile[]} files
 *
 * @typedef {object} FallbackEntry
 * @property {string[]} files
 * @property {string} [source]
 * @property {Record<string, string | undefined>} [sources]
 *
 * @typedef {object} NoticeInventory
 * @property {number} schemaVersion
 * @property {string[]} assets
 * @property {PackageNotice[]} packages
 *
 * @typedef {object} CollectNoticeOptions
 * @property {readonly string[]} [extraModules]
 * @property {string} [fallbackDirectory]
 *
 * @typedef {CollectNoticeOptions & {
 *   extraPackages?: readonly {name: string, via?: string}[]
 * }} SiteNoticeOptions
 */

/**
 * The common Vite/Rolldown and Astro/Rollup hook surface used here. Keeping
 * these structural avoids importing one app's bundler version into the other
 * or requiring a root-level Vite dependency just to read notice files.
 *
 * @typedef {{type: "chunk", moduleIds?: readonly string[],
 *   modules?: Record<string, unknown>} | {type: "asset"}} NoticeOutput
 * @typedef {Record<string, NoticeOutput>} NoticeBundle
 * @typedef {{type: "asset", fileName: string, source: string}} NoticeAsset
 *
 * @typedef {object} NoticePluginContext
 * @property {{config: {consumer?: "client" | "server",
 *   build: {ssr?: boolean | string}}}} [environment]
 * @property {(asset: NoticeAsset) => string} emitFile
 *
 * @typedef {object} NoticePlugin
 * @property {string} name
 * @property {"build"} apply
 * @property {"post"} enforce
 * @property {(config: {root: string}) => void} configResolved
 * @property {(this: NoticePluginContext, output: unknown,
 *   bundle: NoticeBundle) => void} generateBundle
 */

export const NOTICE_TEXT = "third-party-notices.txt";
export const NOTICE_JSON = "third-party-notices.json";
const FALLBACKS = new URL("./third-party-licenses/", import.meta.url);
const NOTICE_FILE =
  /^(?:licen[cs]e|copying|copyright(?:notice)?|notice)(?:[._-]|$)/i;

/**
 * Skip nested package.json files which only set the JavaScript module type.
 * @param {string} id
 * @returns {LocatedPackage | undefined}
 */
export function packageForModule(id) {
  // String.split always supplies its first element, even for an empty ID.
  const clean = /** @type {string} */ (id.split("?")[0]);
  if (clean.includes("\0") || !isAbsolute(clean)) return undefined;
  let directory = dirname(clean);
  while (directory !== parse(directory).root) {
    const manifest = join(directory, "package.json");
    if (existsSync(manifest)) {
      /** @type {PackageManifest} */
      const data = JSON.parse(readFileSync(manifest, "utf8"));
      if (data.name) return { directory, data };
    }
    directory = dirname(directory);
  }
  return undefined;
}

/**
 * Validate full grants, not SPDX identifiers or links in place of terms.
 * @param {string} text
 * @param {string | undefined} identifier
 * @returns {boolean}
 */
export function hasLicenseText(text, identifier) {
  if (text.trim().length < 200) return false;
  if (identifier === "MIT")
    return (
      /Permission is hereby granted/i.test(text) &&
      /SOFTWARE IS PROVIDED/i.test(text)
    );
  if (identifier === "Apache-2.0")
    return (
      /TERMS AND CONDITIONS FOR USE/i.test(text) &&
      /END OF TERMS AND CONDITIONS/i.test(text)
    );
  return /permission|redistribution|licensed|license|licence/i.test(text);
}

/**
 * @param {string} name
 * @param {string} version
 * @param {string} fallbackDirectory
 * @returns {NoticeFile[]}
 */
function fallbackFiles(name, version, fallbackDirectory) {
  const manifest = join(fallbackDirectory, "manifest.json");
  /** @type {Record<string, FallbackEntry | undefined>} */
  const entries = existsSync(manifest)
    ? JSON.parse(readFileSync(manifest, "utf8"))
    : {};
  const entry = entries[`${name}@${version}`];
  if (!entry) {
    if (name === "@pagefind/default-ui")
      throw new Error(
        `site-notices: review prebundled dependency notices for ${name}@${version}`
      );
    return [];
  }
  return entry.files.map((file) => ({
    name: file,
    source: entry.sources?.[file] ?? entry.source,
    text: readFileSync(join(fallbackDirectory, file), "utf8").trim(),
  }));
}

/**
 * @param {string} directory
 * @param {string} name
 * @returns {NoticeFile[]}
 */
function noticeFiles(directory, name) {
  const path = join(directory, name);
  if (statSync(path).isDirectory())
    return readdirSync(path)
      .sort()
      .flatMap((child) => noticeFiles(directory, join(name, child)));
  return [{ name, text: readFileSync(path, "utf8").trim() }];
}

/**
 * Preserve all shipped top-level license, copyright and NOTICE files.
 * @param {LocatedPackage} pkg
 * @param {string} [fallbackDirectory]
 * @returns {PackageNotice}
 */
export function readPackageNotice(
  pkg,
  fallbackDirectory = fileURLToPath(FALLBACKS)
) {
  const { directory, data } = pkg;
  const files = readdirSync(directory)
    .sort()
    .filter((name) => NOTICE_FILE.test(name))
    .flatMap((name) => noticeFiles(directory, name));
  if (!files.some((file) => hasLicenseText(file.text, data.license))) {
    const readme = readdirSync(directory)
      .sort()
      .find((name) => /^readme\./i.test(name));
    if (readme) {
      const text = readFileSync(join(directory, readme), "utf8");
      const start = text.search(/(?:The )?MIT License|Copyright \(c\)/i);
      const terms = start < 0 ? "" : text.slice(start).trim();
      if (hasLicenseText(terms, data.license))
        files.push({ name: `${readme} license section`, text: terms });
    }
  }
  files.push(...fallbackFiles(data.name, data.version, fallbackDirectory));
  if (!files.some((file) => hasLicenseText(file.text, data.license))) {
    throw new Error(
      `site-notices: missing full license text for ${data.name}@${data.version}; add a reviewed, version-scoped upstream license in scripts/third-party-licenses`
    );
  }
  return {
    name: data.name,
    version: data.version,
    license: data.license ?? "See included terms",
    files,
  };
}

/**
 * @param {readonly PackageNotice[]} packages
 * @returns {string}
 */
export function renderNotices(packages) {
  return (
    "AdaptTable website third-party notices\n\n" +
    "These license and attribution texts accompany the software included in this browser build.\n\n" +
    packages
      .map(
        (pkg) =>
          `${pkg.name}@${pkg.version}\nLicense: ${pkg.license}\n\n` +
          pkg.files
            .map(
              (file) =>
                `--- ${file.name}${file.source ? " (" + file.source + ")" : ""} ---\n${file.text}\n`
            )
            .join("\n")
      )
      .join("\n========================================\n\n")
  );
}

/**
 * Resolve installed packages without depending on package.json export maps.
 * @param {string} name
 * @param {string} from
 * @returns {string}
 */
export function installedPackage(name, from) {
  let directory = realpathSync(from);
  while (directory !== parse(directory).root) {
    const file = join(directory, "node_modules", name, "package.json");
    if (existsSync(file)) return realpathSync(file);
    directory = dirname(directory);
  }
  throw new Error(`site-notices: cannot locate ${name} from ${from}`);
}

/**
 * Resolve each actual chunk module to its owning package, without dependency guesses.
 * @param {NoticeBundle} bundle
 * @param {CollectNoticeOptions} [options]
 * @returns {PackageNotice[]}
 */
export function collectNotices(
  bundle,
  { extraModules = [], fallbackDirectory } = {}
) {
  const ids = [...extraModules];
  for (const chunk of Object.values(bundle)) {
    if (chunk.type === "chunk")
      ids.push(...(chunk.moduleIds ?? Object.keys(chunk.modules ?? {})));
  }
  /** @type {Map<string, PackageNotice>} */
  const packages = new Map();
  for (const id of ids) {
    const pkg = packageForModule(id);
    if (!pkg) continue;
    // Private workspace kits can embed copied third-party controls/styles.
    // Their package-owned NOTICE is still distributable attribution.
    if (
      pkg.data.private &&
      !readdirSync(pkg.directory).some((name) =>
        /^notice(?:[._-]|$)/i.test(name)
      )
    )
      continue;
    const key = `${pkg.data.name}@${pkg.data.version}`;
    if (!packages.has(key))
      packages.set(key, readPackageNotice(pkg, fallbackDirectory));
  }
  return [...packages.entries()]
    .sort(([a], [b]) => a.localeCompare(b, "en"))
    .map(([, pkg]) => pkg);
}

/**
 * Vite and Astro use the same hook; SSR-only code is not sent to browsers.
 * @param {SiteNoticeOptions} [options]
 * @returns {NoticePlugin}
 */
export function siteNotices(options = {}) {
  // Vite resolves this before invoking its build hooks.
  /** @type {string} */
  let root;
  return {
    name: "adapttable-site-notices",
    apply: "build",
    enforce: "post",
    configResolved(config) {
      root = config.root;
    },
    generateBundle(_output, bundle) {
      // Vite's Environment API is authoritative: Astro's client environment
      // can inherit build.ssr=true from the shared prerender configuration.
      const config = this.environment?.config;
      if (config?.consumer === "server") return;
      if (config?.consumer !== "client" && config?.build.ssr) return;
      const extraModules = [...(options.extraModules ?? [])];
      for (const extra of options.extraPackages ?? []) {
        const from = extra.via
          ? dirname(installedPackage(extra.via, root))
          : root;
        extraModules.push(installedPackage(extra.name, from));
      }
      const packages = collectNotices(bundle, { ...options, extraModules });
      if (packages.length === 0)
        throw new Error("site-notices: browser build has no package inventory");
      const assets = Object.keys(bundle)
        .filter((name) => /\.(?:m?js|css)$/.test(name))
        .sort();
      this.emitFile({
        type: "asset",
        fileName: NOTICE_JSON,
        source:
          JSON.stringify({ schemaVersion: 1, assets, packages }, null, 2) +
          "\n",
      });
      this.emitFile({
        type: "asset",
        fileName: NOTICE_TEXT,
        source: renderNotices(packages),
      });
    },
  };
}

/**
 * Verify a finished build or composed copy has complete matching notice files.
 * @param {string} directory
 * @returns {number}
 */
export function checkNotices(directory) {
  /** @type {NoticeInventory} */
  const inventory = JSON.parse(
    readFileSync(join(directory, NOTICE_JSON), "utf8")
  );
  if (
    inventory.schemaVersion !== 1 ||
    !inventory.packages?.length ||
    !inventory.assets?.length
  )
    throw new Error(
      `site-notices: empty or unsupported inventory at ${directory}`
    );
  for (const pkg of inventory.packages) {
    if (!pkg.files?.some((file) => hasLicenseText(file.text, pkg.license)))
      throw new Error(
        `site-notices: incomplete terms for ${pkg.name}@${pkg.version}`
      );
  }
  if (
    readFileSync(join(directory, NOTICE_TEXT), "utf8") !==
    renderNotices(inventory.packages)
  )
    throw new Error(
      `site-notices: text does not match inventory at ${directory}`
    );
  for (const asset of inventory.assets) {
    if (
      resolve(directory, asset).startsWith(resolve(directory) + "/") &&
      existsSync(join(directory, asset))
    )
      continue;
    throw new Error(`site-notices: missing or invalid browser asset ${asset}`);
  }
  return inventory.packages.length;
}
