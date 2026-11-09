/**
 * Consumers of the tarballs users install, not of the workspace.
 *
 * `pnpm pack` builds each package's tarball exactly as it publishes —
 * `files`, rewritten `workspace:` ranges, the `exports` map. The tarballs are
 * unpacked offline into a scratch consumer under the system temp directory,
 * which has no parent `node_modules` to fall back on, so an import resolves
 * through what shipped or fails. Third-party runtime dependencies the packed
 * manifests declare are linked to the copies the lockfile installed.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, relative, sep } from "node:path";
import { gunzipSync } from "node:zlib";

import { resolvePnpm } from "./build-vue-browser-consumer.mjs";
import { listPackages, REPO_ROOT } from "./packages.mjs";

const SCOPE = "@adapttable/";
const BLOCK = 512;

/** Runtimes a framework-free Node consumer must never need on disk. */
export const FRAMEWORK_RUNTIMES = [
  "react",
  "react-dom",
  "vue",
  "@angular/core",
];

const readJson = (file) => JSON.parse(readFileSync(file, "utf8"));

/** Every workspace package by folder, with its npm name and manifest. */
export function workspacePackages(root = REPO_ROOT) {
  return new Map(
    listPackages(root).map(({ name, dir }) => {
      const manifest = readJson(join(dir, "package.json"));
      return [name, { folder: name, dir, name: manifest.name, manifest }];
    })
  );
}

/** The folder of the workspace package published as `name`. */
export function folderOf(name, packages = workspacePackages()) {
  for (const pkg of packages.values()) if (pkg.name === name) return pkg.folder;
  throw new Error(`no workspace package is published as ${name}`);
}

/** `folders` and every `@adapttable/*` package they depend on, sorted. */
export function packageClosure(folders, packages = workspacePackages()) {
  const seen = new Set();
  const pending = [...folders];
  while (pending.length) {
    const folder = pending.pop();
    if (seen.has(folder)) continue;
    const pkg = packages.get(folder);
    if (!pkg) throw new Error(`no package folder named "${folder}"`);
    seen.add(folder);
    for (const dependency of Object.keys(pkg.manifest.dependencies ?? {})) {
      if (dependency.startsWith(SCOPE))
        pending.push(folderOf(dependency, packages));
    }
  }
  return [...seen].sort();
}

/**
 * `file:` specifiers for packed tarballs, keyed by package name, so a
 * consumer resolves every packed workspace package, direct or transitive, to
 * the local build rather than the registry.
 */
export function localSpecs(packs) {
  return Object.fromEntries(
    packs.map((pack) => [pack.name, `file:${pack.file}`])
  );
}

/** Pack each folder with the repository's pinned pnpm. */
export function packTarballs(
  folders,
  destination,
  { packages = workspacePackages(), pnpm = resolvePnpm() } = {}
) {
  return folders.map((folder) => {
    const { dir, name, manifest } = packages.get(folder);
    if (!existsSync(join(dir, "dist")))
      throw new Error(`Build ${name} before packing it`);
    const output = execFileSync(
      pnpm.command,
      [...pnpm.args, "pack", "--pack-destination", destination],
      { cwd: dir, env: pnpm.env, encoding: "utf8" }
    );
    const file = output.trim().split("\n").at(-1).trim();
    return {
      folder,
      dir,
      name,
      version: manifest.version,
      file,
      sha256: createHash("sha256").update(readFileSync(file)).digest("hex"),
    };
  });
}

function headerField(header, start, length) {
  const field = header.subarray(start, start + length);
  const end = field.indexOf(0);
  return field.subarray(0, end === -1 ? length : end).toString("utf8");
}

function paxPath(body) {
  for (const record of body.toString("utf8").split("\n")) {
    const match = /^\d+ path=(.*)$/.exec(record);
    if (match) return match[1];
  }
  return undefined;
}

/**
 * The regular files of a gzipped package tarball, keyed by their path inside
 * the package (`package/` removed). A path that escapes the package throws.
 */
export function tarballFiles(file) {
  const data = gunzipSync(readFileSync(file));
  const files = new Map();
  let longName;
  for (let offset = 0; offset + BLOCK <= data.length;) {
    const header = data.subarray(offset, offset + BLOCK);
    if (header.every((byte) => byte === 0)) break;
    const size = Number.parseInt(headerField(header, 124, 12).trim() || "0", 8);
    const type = headerField(header, 156, 1) || "0";
    const body = data.subarray(offset + BLOCK, offset + BLOCK + size);
    offset += BLOCK + Math.ceil(size / BLOCK) * BLOCK;
    if (type === "x") {
      longName = paxPath(body) ?? longName;
      continue;
    }
    if (type === "L") {
      longName = headerField(body, 0, body.length);
      continue;
    }
    const prefix = headerField(header, 345, 155);
    const short = headerField(header, 0, 100);
    const name = longName ?? (prefix ? `${prefix}/${short}` : short);
    longName = undefined;
    if (type !== "0") continue;
    const path = name.replace(/^package\//, "");
    if (isAbsolute(path) || path.split("/").includes(".."))
      throw new Error(`${file} holds a path outside its package: ${name}`);
    files.set(path, Buffer.from(body));
  }
  return files;
}

/** Unpack a package tarball into `destination`, as an install would. */
export function extractTarball(file, destination) {
  for (const [path, body] of tarballFiles(file)) {
    const target = join(destination, ...path.split("/"));
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, body);
  }
}

function installedCopy(name, dirs) {
  for (const dir of dirs) {
    const candidate = join(dir, "node_modules", ...name.split("/"));
    if (existsSync(candidate)) return realpathSync(candidate);
  }
  return undefined;
}

/**
 * The third-party packages an install links, each with whether it must exist
 * and the package folders to look for it from.
 */
function wantedLinks(packs, manifests, peers, extra) {
  const wanted = new Map();
  const want = (name, required, from) => {
    if (name.startsWith(SCOPE)) return;
    const entry = wanted.get(name) ?? { required: false, from: [] };
    entry.required ||= required;
    entry.from.push(from);
    wanted.set(name, entry);
  };
  for (const pack of packs) {
    const manifest = manifests.get(pack.name);
    for (const name of Object.keys(manifest.dependencies ?? {}))
      want(name, true, pack.dir);
    if (!peers) continue;
    for (const name of Object.keys(manifest.peerDependencies ?? {}))
      want(name, false, pack.dir);
  }
  for (const name of extra) want(name, true, REPO_ROOT);
  return wanted;
}

/**
 * Install `packs` into `dir/node_modules` from their tarballs.
 *
 * Each packed manifest's third-party `dependencies` are linked to the
 * lockfile's copy and must exist. `peers` also links each package's declared
 * peers where the workspace has them; `extra` links named packages (types for
 * a compiler run) and requires each one.
 */
export function installPacked(packs, dir, { peers = false, extra = [] } = {}) {
  const modules = join(dir, "node_modules");
  mkdirSync(modules, { recursive: true });
  writeFileSync(
    join(dir, "package.json"),
    JSON.stringify(
      { name: "adapttable-packed-consumer", private: true, type: "module" },
      null,
      2
    )
  );
  const manifests = new Map();
  for (const pack of packs) {
    const target = join(modules, ...pack.name.split("/"));
    extractTarball(pack.file, target);
    manifests.set(pack.name, readJson(join(target, "package.json")));
  }
  const workspaceDirs = [...packs.map((pack) => pack.dir), REPO_ROOT];
  const wanted = wantedLinks(packs, manifests, peers, extra);
  for (const [name, { required, from }] of wanted) {
    const link = join(modules, ...name.split("/"));
    if (existsSync(link)) continue;
    const copy = installedCopy(name, [...from, ...workspaceDirs]);
    if (copy) {
      mkdirSync(dirname(link), { recursive: true });
      symlinkSync(
        copy,
        link,
        process.platform === "win32" ? "junction" : "dir"
      );
    } else if (required) {
      throw new Error(`${name} is required but the workspace has no copy`);
    }
  }
  return manifests;
}

function exportTargets(value) {
  if (typeof value === "string") return [value];
  if (value && typeof value === "object")
    return Object.values(value).flatMap(exportTargets);
  return [];
}

/**
 * The public specifier that serves `dist/<file>` from a packed manifest:
 * `core` + `pivot.js` → `@adapttable/core/pivot`. A file the `exports` map does
 * not publish throws, whatever the workspace build holds.
 */
export function exportSpecifier(manifest, file) {
  const target = `./dist/${file}`;
  for (const [key, value] of Object.entries(manifest.exports ?? {})) {
    if (exportTargets(value).includes(target))
      return key === "." ? manifest.name : `${manifest.name}${key.slice(1)}`;
  }
  throw new Error(`${manifest.name} publishes no export for dist/${file}`);
}

/**
 * Where a graph's modules came from. `files` are the packed `@adapttable/*`
 * files, relative to the consumer; `unpacked` is anything that reached
 * workspace `packages/` — source or a build that never went through a tarball.
 */
export function packedModules(moduleIds, dir, root = REPO_ROOT) {
  const consumer = realpathSync(dir);
  const repository = realpathSync(root);
  const scope = join(consumer, "node_modules", "@adapttable") + sep;
  const workspace = join(repository, "packages") + sep;
  const posix = (path) => path.split(sep).join("/");
  const files = new Set();
  const unpacked = new Set();
  for (const id of moduleIds) {
    const path = id.split("?")[0];
    if (!path || !isAbsolute(path) || !existsSync(path)) continue;
    const actual = realpathSync(path);
    if (actual.startsWith(scope)) files.add(posix(relative(consumer, actual)));
    else if (actual.startsWith(workspace))
      unpacked.add(posix(relative(repository, actual)));
  }
  return { files: [...files].sort(), unpacked: [...unpacked].sort() };
}

/**
 * Packs `folders` with their dependency closure and installs them into one
 * scratch consumer. `dispose` removes the tarballs and the consumer.
 */
export function packedConsumer(folders, options = {}) {
  const packages = options.packages ?? workspacePackages();
  // Real path: bundlers name modules by their real paths, and macOS links
  // the temp directory through /var → /private/var.
  const scratch = realpathSync(
    mkdtempSync(join(tmpdir(), "adapttable-packed-"))
  );
  try {
    const packDir = join(scratch, "packs");
    const dir = join(scratch, "consumer");
    mkdirSync(packDir);
    mkdirSync(dir);
    const packs = packTarballs(packageClosure(folders, packages), packDir, {
      packages,
      pnpm: options.pnpm,
    });
    const manifests = installPacked(packs, dir, options);
    return {
      dir,
      packs,
      packages: packs.map(({ name, version, sha256 }) => ({
        name,
        version,
        sha256,
      })),
      specifier(folder, file) {
        return exportSpecifier(manifests.get(packages.get(folder).name), file);
      },
      dispose() {
        rmSync(scratch, { recursive: true, force: true });
      },
    };
  } catch (error) {
    rmSync(scratch, { recursive: true, force: true });
    throw error;
  }
}

/**
 * Run `code` in Node from an install of only `packs`, no peers linked. A
 * framework runtime on disk, or a failure to load, is reported.
 */
export function nodeConsumerProblems(packs, code) {
  const dir = mkdtempSync(join(tmpdir(), "adapttable-node-consumer-"));
  try {
    installPacked(packs, dir);
    const present = FRAMEWORK_RUNTIMES.filter((name) =>
      existsSync(join(dir, "node_modules", ...name.split("/")))
    );
    if (present.length) return present.map((name) => `${name} is installed`);
    writeFileSync(join(dir, "entry.mjs"), code);
    try {
      execFileSync(process.execPath, ["entry.mjs"], {
        cwd: dir,
        stdio: "pipe",
      });
    } catch (error) {
      return [
        String(error.stderr ?? error.message)
          .trim()
          .split("\n")
          .slice(0, 6)
          .join("\n"),
      ];
    }
    return [];
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const TSC = createRequire(import.meta.url).resolve("typescript/bin/tsc");

/**
 * Type-check each `{ id, code }` as its own module in `dir/declarations`, in
 * one compiler run against the packed declarations. Returns each id's
 * errors; a compiler error outside the consumers throws.
 */
export function declarationProblems(dir, consumers) {
  const root = join(dir, "declarations");
  rmSync(root, { recursive: true, force: true });
  mkdirSync(root);
  writeFileSync(join(root, "styles.d.ts"), 'declare module "*.css";\n');
  for (const { id, code } of consumers)
    writeFileSync(join(root, `${id}.ts`), code);
  writeFileSync(
    join(root, "tsconfig.json"),
    JSON.stringify({
      compilerOptions: {
        target: "ES2022",
        lib: ["ES2022", "DOM"],
        module: "ESNext",
        moduleResolution: "Bundler",
        strict: true,
        noEmit: true,
        skipLibCheck: true,
        types: [],
      },
      files: ["styles.d.ts", ...consumers.map(({ id }) => `${id}.ts`)],
    })
  );
  const problems = new Map(consumers.map(({ id }) => [id, []]));
  let output = "";
  try {
    execFileSync(
      process.execPath,
      [TSC, "-p", "tsconfig.json", "--pretty", "false"],
      {
        cwd: root,
        encoding: "utf8",
      }
    );
  } catch (error) {
    output = String(error.stdout ?? "");
  }
  for (const line of output.split("\n").filter(Boolean)) {
    const match = /^(.+)\.ts\(\d+,\d+\): error (TS\d+: .*)$/.exec(line);
    if (!match || !problems.has(match[1])) {
      if (/error TS\d+/.test(line)) throw new Error(`tsc: ${line}`);
      continue;
    }
    problems.get(match[1]).push(match[2]);
  }
  return problems;
}
