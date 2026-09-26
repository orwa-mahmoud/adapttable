/**
 * The kits, and the framework each one is built on.
 *
 * A kit is an adapter package that renders the table with one UI kit's own
 * components. It lives at `packages/<framework>/<name>`, beside the binding it
 * builds on, and the guards that hold kits to a shared contract — parts parity,
 * feature parity, AI isolation — read this list rather than keeping their own.
 *
 * A kit for another framework is one entry here plus its package: the guards
 * resolve its folder, its binding and the files to scan from its framework, so
 * a Vue kit's single-file components and an Angular kit's templates are read
 * the same way a React kit's `.tsx` is. {@link kitRegistryErrors} holds the list
 * to the packages on disk, so a kit cannot sit outside the guards by being left
 * off it.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join } from "node:path";

import { listPackages, REPO_ROOT } from "./packages.mjs";

/** The framework key of the packages every binding builds on. */
export const NEUTRAL = "neutral";

/** The package group that holds the framework-neutral packages. */
export const NEUTRAL_GROUP = "shared";

/** The neutral engine's package folder. */
export const CORE = "core";

/** Script sources of the neutral packages. */
const NEUTRAL_SOURCES = Object.freeze([".ts", ".tsx"]);

/**
 * A framework a kit can be built on.
 *
 * @typedef {object} Framework
 * @property {string} binding Folder name of the framework's binding package,
 *   which sits at `packages/<framework>/<binding>`.
 * @property {readonly string[]} sources Extensions of the script sources under
 *   a package's `src`.
 * @property {readonly string[]} templates Extensions of the template files
 *   under a package's `src`: Vue single-file components, Angular component
 *   templates. JSX lives in React's sources, so React has none.
 */

/**
 * Every framework a kit can be built on, keyed by the package group its
 * packages sit in.
 *
 * @type {Readonly<Record<string, Framework>>}
 */
export const FRAMEWORKS = Object.freeze({
  react: { binding: "react", sources: [".ts", ".tsx"], templates: [] },
  vue: { binding: "vue", sources: [".ts"], templates: [".vue"] },
  angular: { binding: "angular", sources: [".ts"], templates: [".html"] },
});

/**
 * One kit.
 *
 * @typedef {object} Kit
 * @property {string} name Package folder name — `adapter-mantine`.
 * @property {string} framework Key of {@link FRAMEWORKS}; the kit's folder is
 *   `packages/<framework>/<name>`.
 * @property {"shell" | "native" | "derived" | "private"} role
 *   - `shell` renders the shared shell's chrome with its own kit's components;
 *     the shell kits agree part-for-part.
 *   - `native` builds the same shell out of native elements, because native is
 *     its kit, so it names the fallbacks every themed kit reaches through its
 *     own components.
 *   - `derived` renders the kit named in `base`, restyled, and inherits its
 *     part names and its header.
 *   - `private` is unpublished and outside every kit contract.
 * @property {string} [base] The kit a `derived` kit renders.
 */

/**
 * Every kit, in the order the guards report them.
 *
 * `adapter-bootstrap` is the private minimal reference: it is listed so the
 * registry covers every kit on disk, and its role keeps it out of the parts
 * contract, feature parity and every other kit contract.
 *
 * @type {readonly Kit[]}
 */
export const KITS = Object.freeze([
  { name: "adapter-mantine", framework: "react", role: "shell" },
  { name: "adapter-mui", framework: "react", role: "shell" },
  { name: "adapter-chakra", framework: "react", role: "shell" },
  { name: "adapter-antd", framework: "react", role: "shell" },
  { name: "adapter-radix", framework: "react", role: "shell" },
  { name: "adapter-base-ui", framework: "react", role: "shell" },
  { name: "adapter-unstyled", framework: "react", role: "native" },
  {
    name: "adapter-shadcn",
    framework: "react",
    role: "derived",
    base: "adapter-unstyled",
  },
  { name: "adapter-bootstrap", framework: "react", role: "private" },
]);

/** The folder-name prefix every kit package carries. */
const KIT_PREFIX = "adapter-";

/** The roles a kit can take. */
const ROLES = new Set(["shell", "native", "derived", "private"]);

/** A test file, whatever the framework calls it. */
const TEST_FILE = /\.(?:test|spec)\.[^.]+$/;

/**
 * The framework a kit is built on.
 *
 * @param {Kit} kit
 * @returns {Framework}
 */
export function frameworkOf(kit) {
  const framework = FRAMEWORKS[kit.framework];
  if (!framework) {
    throw new Error(
      `${kit.name}: "${kit.framework}" is not a framework in scripts/kits.mjs`
    );
  }
  return framework;
}

/**
 * The framework key of a package group: {@link NEUTRAL} for the shared
 * packages, the group itself for a framework's.
 *
 * @param {string} group
 * @returns {string}
 */
export const frameworkOfGroup = (group) =>
  group === NEUTRAL_GROUP ? NEUTRAL : group;

/**
 * Absolute path of a kit's package.
 *
 * @param {Kit} kit
 * @param {string} [root] repository root to read, for fixtures
 */
export const kitDir = (kit, root = REPO_ROOT) =>
  join(root, "packages", kit.framework, kit.name);

/**
 * Absolute path of a framework's binding package.
 *
 * @param {string} framework key of {@link FRAMEWORKS}
 * @param {string} [root] repository root to read, for fixtures
 */
export const bindingDir = (framework, root = REPO_ROOT) =>
  join(root, "packages", framework, FRAMEWORKS[framework].binding);

/**
 * Absolute path of the neutral engine's package.
 *
 * @param {string} [root] repository root to read, for fixtures
 */
export const coreDir = (root = REPO_ROOT) =>
  join(root, "packages", NEUTRAL_GROUP, CORE);

/**
 * The `name` a package's manifest publishes it under.
 *
 * @param {string} dir absolute package folder
 * @returns {string}
 */
export const packageNameAt = (dir) =>
  JSON.parse(readFileSync(join(dir, "package.json"), "utf8")).name;

/** The kits the structural parts contract binds: every shell, every native. */
export const contractKits = (kits = KITS) =>
  kits.filter((kit) => kit.role === "shell" || kit.role === "native");

/** The kits that render the shared shell with their own kit's components. */
export const shellKits = (kits = KITS) =>
  kits.filter((kit) => kit.role === "shell");

/** The kits that build the shell out of native elements. */
export const nativeKits = (kits = KITS) =>
  kits.filter((kit) => kit.role === "native");

/** Every published kit — every kit outside the `private` role. */
export const publishedKits = (kits = KITS) =>
  kits.filter((kit) => kit.role !== "private");

/** The frameworks at least one of `kits` is built on, in first-seen order. */
export const frameworksIn = (kits = KITS) => [
  ...new Set(kits.map((kit) => kit.framework)),
];

/**
 * Every file under `dir` a framework's guards read — its sources and its
 * templates — tests excluded, sorted.
 *
 * @param {string} dir absolute folder, usually a package's `src`
 * @param {string} framework key of {@link FRAMEWORKS}, or {@link NEUTRAL}
 * @returns {string[]}
 */
export function frameworkFiles(dir, framework) {
  const extensions = new Set(extensionsOf(framework));
  const out = [];
  for (const entry of readdirSync(dir).sort()) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      out.push(...frameworkFiles(path, framework));
      continue;
    }
    if (!extensions.has(extname(entry)) || TEST_FILE.test(entry)) continue;
    out.push(path);
  }
  return out;
}

/**
 * The file extensions a framework's guards read.
 *
 * @param {string} framework key of {@link FRAMEWORKS}, or {@link NEUTRAL}
 * @returns {readonly string[]}
 */
function extensionsOf(framework) {
  if (framework === NEUTRAL) return NEUTRAL_SOURCES;
  const spec = FRAMEWORKS[framework];
  if (!spec) {
    throw new Error(`"${framework}" is not a framework in scripts/kits.mjs`);
  }
  return [...spec.sources, ...spec.templates];
}

/**
 * Whether a file is one of its framework's templates rather than a script.
 *
 * @param {string} file
 * @param {string} framework key of {@link FRAMEWORKS}, or {@link NEUTRAL}
 */
export const isTemplate = (file, framework) =>
  framework !== NEUTRAL &&
  (FRAMEWORKS[framework]?.templates.includes(extname(file)) ?? false);

/** Problems with one kit entry on its own. */
function kitEntryErrors(kit, root, names) {
  const errors = [];
  if (!ROLES.has(kit.role)) {
    errors.push(`${kit.name}: unknown role "${kit.role}"`);
  }
  if (!(kit.framework in FRAMEWORKS)) {
    errors.push(`${kit.name}: unknown framework "${kit.framework}"`);
    return errors;
  }
  const dir = kitDir(kit, root);
  if (!existsSync(join(dir, "package.json"))) {
    errors.push(
      `${kit.name}: no package at packages/${kit.framework}/${kit.name}`
    );
    return errors;
  }
  const isPrivate =
    JSON.parse(readFileSync(join(dir, "package.json"), "utf8")).private ===
    true;
  if (isPrivate !== (kit.role === "private")) {
    errors.push(
      isPrivate
        ? `${kit.name}: package.json is private but the kit's role is "${kit.role}"`
        : `${kit.name}: role "private" but package.json is published`
    );
  }
  if (kit.role === "derived") {
    const base = names.get(kit.base);
    if (!base || base.framework !== kit.framework) {
      errors.push(
        `${kit.name}: renders "${kit.base}", which is not a ${kit.framework} kit in the registry`
      );
    }
  }
  return errors;
}

/**
 * The registry held to the packages on disk.
 *
 * Every entry names a package that exists under its framework's group, carries
 * a known role, and agrees with its manifest about being private; every
 * framework a kit uses has its binding package; and every `adapter-*` package
 * under a framework group is registered — a kit left off the list would be a
 * kit no guard reads.
 *
 * @param {string} [root] repository root to read, for fixtures
 * @param {readonly Kit[]} [kits]
 * @returns {string[]}
 */
export function kitRegistryErrors(root = REPO_ROOT, kits = KITS) {
  const errors = [];
  const names = new Map();
  for (const kit of kits) {
    if (names.has(kit.name)) errors.push(`${kit.name}: registered twice`);
    names.set(kit.name, kit);
  }
  for (const kit of kits) errors.push(...kitEntryErrors(kit, root, names));
  for (const framework of frameworksIn(kits)) {
    if (!(framework in FRAMEWORKS)) continue;
    const binding = FRAMEWORKS[framework].binding;
    if (!existsSync(join(bindingDir(framework, root), "package.json"))) {
      errors.push(
        `${framework}: kits are built on it but its binding packages/${framework}/${binding} is missing`
      );
    }
  }
  for (const pkg of listPackages(root)) {
    if (pkg.group === NEUTRAL_GROUP || !pkg.name.startsWith(KIT_PREFIX)) {
      continue;
    }
    const kit = names.get(pkg.name);
    if (!kit || kit.framework !== pkg.group) {
      errors.push(
        `${pkg.rel}: a kit package that scripts/kits.mjs does not register under "${pkg.group}"`
      );
    }
  }
  return errors;
}
