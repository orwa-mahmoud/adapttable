/** Generate exact SFC module types before the unchanged typed ESLint rules run. */
import { spawnSync } from "node:child_process";
import {
  access,
  cp,
  mkdir,
  readFile,
  realpath,
  rm,
  writeFile,
} from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = dirname(dirname(fileURLToPath(import.meta.url)));

async function projectTool(tool, cwd) {
  const require = createRequire(join(cwd, "package.json"));
  const manifestPath = require.resolve(`${tool}/package.json`);
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const bin =
    typeof manifest.bin === "string" ? manifest.bin : manifest.bin?.[tool];
  if (typeof bin !== "string") throw new Error(`Missing ${tool} executable.`);
  return resolve(dirname(manifestPath), bin);
}

async function runProjectTool(tool, args, cwd) {
  const executable = await projectTool(tool, cwd);
  const result = spawnSync(process.execPath, [executable, ...args], {
    cwd,
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  return result.status ?? 1;
}

/**
 * Use the real Vue compiler, not a wildcard module declaration. The generated
 * tree is a package-local type layer so its dependencies resolve exactly as
 * the source package's do. rootDirs in that package's tsconfig exposes it to
 * ordinary TypeScript, including ESLint's project service.
 */
export async function lintVuePackage(
  {
    cwd = process.cwd(),
    lintArgs = [],
    root = repositoryRoot,
    tsconfig = "tsconfig.json",
  } = {},
  runTool = runProjectTool
) {
  const directory = resolve(cwd);
  const projectPath = relative(root, directory);
  if (projectPath.startsWith("..") || isAbsolute(projectPath))
    throw new Error("The Vue package must be inside the repository.");
  const project = resolve(directory, tsconfig);
  const output = join(directory, ".sfc-types");
  const emitted = join(output, ".emit");
  await access(project);
  await access(join(directory, "package.json"));
  // Neither old declarations nor a partial failed emission may reach lint.
  await rm(output, { recursive: true, force: true });
  await mkdir(output, { recursive: true });
  // Keep this config beneath the package as well: TypeScript resolves explicit
  // `types` libraries relative to it, even when those options are inherited.
  const config = join(output, "tsconfig.json");
  try {
    await writeFile(
      config,
      `${JSON.stringify(
        {
          extends: project,
          // This is the SFC declaration producer, not a second package test
          // typecheck. ESLint still visits the complete ordinary package target.
          include: [join(dirname(project), "**/*.vue")],
          compilerOptions: {
            noEmit: false,
            declaration: true,
            emitDeclarationOnly: true,
            declarationMap: false,
            sourceMap: false,
            noEmitOnError: true,
            incremental: false,
            // Existing package tests reference showcase SFCs and other source
            // projects. Preserve their real resolution while emitting declarations.
            rootDir: root,
            rootDirs: [directory],
            outDir: emitted,
          },
        },
        null,
        2
      )}\n`
    );
    let generated;
    try {
      generated = await runTool("vue-tsc", ["--project", config], directory);
    } catch (error) {
      await rm(output, { recursive: true, force: true });
      throw error;
    }
    if (generated !== 0) {
      await rm(output, { recursive: true, force: true });
      return generated;
    }
    // Keep only this package's own generated modules, at source-relative paths
    // understood by rootDirs. Imported projects remain source-owned as before.
    try {
      await cp(join(emitted, projectPath), output, { recursive: true });
      await rm(emitted, { recursive: true, force: true });
    } catch (error) {
      await rm(output, { recursive: true, force: true });
      throw error;
    }
    const args = lintArgs[0] === "--" ? lintArgs.slice(1) : lintArgs;
    return await runTool("eslint", args.length ? args : ["."], directory);
  } finally {
    await rm(config, { force: true });
  }
}

// Node resolves module URLs through symlinks but keeps the invoked argv path.
// Eval and stdin imports may have no filesystem entrypoint to resolve.
const entrypoint = process.argv[1]
  ? await realpath(process.argv[1]).catch(() => undefined)
  : undefined;
if (entrypoint === (await realpath(fileURLToPath(import.meta.url)))) {
  try {
    process.exitCode = await lintVuePackage({
      lintArgs: process.argv.slice(2),
    });
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  }
}
