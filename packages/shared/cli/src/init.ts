import { detectKit, type Kit, mergeDependencies, SHADCN } from "./detect";
import {
  choosePackageManager,
  installCommand,
  type PackageManager,
} from "./packageManager";
import { packagesFor, scaffoldFiles } from "./scaffold";

/**
 * The filesystem + logging surface `runInit` depends on (injectable).
 *
 * @public
 */
export interface InitIO {
  /** Read a file relative to the project root; `undefined` when missing. */
  readFile(relativePath: string): string | undefined;
  /** Write a file relative to the project root (creating dirs as needed). */
  writeFile(relativePath: string, contents: string): void;
  /** Whether a file exists relative to the project root. */
  exists(relativePath: string): boolean;
  /** List file names at the project root (for lockfile detection). */
  listRootFiles(): string[];
  /** Emit a user-facing line. */
  log(message: string): void;
}

/**
 * Options for {@link runInit}.
 *
 * @public
 */
export interface InitOptions {
  /** Overwrite existing scaffold files. Defaults to `false`. */
  force?: boolean;
}

/**
 * The outcome of a successful {@link runInit}.
 *
 * @public
 */
export interface InitResult {
  /** The detected kit identifier. */
  kit: Kit;
  /** The adapter package that was scaffolded. */
  adapter: string;
  /** The package manager chosen from lockfiles. */
  packageManager: PackageManager;
  /** Packages the printed install command will add. */
  packages: string[];
  /** The runnable install command. */
  installCommand: string;
  /** Scaffold paths that were written. */
  written: string[];
  /** Scaffold paths skipped because they already existed. */
  skipped: string[];
}

/**
 * Thrown when init cannot proceed (e.g. no package.json).
 *
 * @public
 */
export class InitError extends Error {}

/**
 * A heads-up when the detected Chakra is older than v3: `@adapttable/chakra`
 * targets Chakra v3, so a v2 project's scaffold would not compile as-is.
 */
function chakraVersionWarning(
  kit: string,
  chakraSpec: string | undefined
): string | undefined {
  if (kit !== "chakra" || !chakraSpec) return undefined;
  const major = /^\D*(\d+)/.exec(chakraSpec)?.[1];
  if (major === undefined || Number(major) >= 3) return undefined;
  return `   Note: @chakra-ui/react ${chakraSpec} detected — @adapttable/chakra targets Chakra v3. Upgrade @chakra-ui/react to v3, or use @adapttable/unstyled.`;
}

/**
 * Detect the project's UI kit, choose a package manager, write a starter
 * table component, and report the install command — all through injected
 * IO so it is fully testable. Side-effect-free except for the writes and
 * logs performed via {@link InitIO}.
 *
 * @param io - The injected filesystem + logger.
 * @param options - See {@link InitOptions}.
 * @returns The {@link InitResult}.
 * @throws {InitError} When no readable `package.json` is found.
 * @public
 */
export function runInit(io: InitIO, options: InitOptions = {}): InitResult {
  const raw = io.readFile("package.json");
  if (raw === undefined) {
    throw new InitError(
      "No package.json found in the current directory. Run this inside your project."
    );
  }

  let pkg: {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  try {
    pkg = JSON.parse(raw) as typeof pkg;
  } catch {
    throw new InitError("Could not parse package.json — is it valid JSON?");
  }

  const deps = mergeDependencies(pkg);
  const detected = detectKit(deps);
  // A Tailwind project with a shadcn config (`components.json`) is a shadcn/ui
  // project — scaffold its pre-wired adapter rather than the bare unstyled one.
  const info =
    detected.kit === "unstyled" && io.exists("components.json")
      ? SHADCN
      : detected;
  const pm = choosePackageManager(io.listRootFiles());
  const packages = packagesFor(info);
  const command = installCommand(pm, packages);

  const written: string[] = [];
  const skipped: string[] = [];
  for (const file of scaffoldFiles(info)) {
    if (!options.force && io.exists(file.path)) {
      skipped.push(file.path);
      continue;
    }
    io.writeFile(file.path, file.contents);
    written.push(file.path);
  }

  io.log(`AdaptTable — detected ${info.label}.`);
  const chakraNote = chakraVersionWarning(info.kit, deps["@chakra-ui/react"]);
  if (chakraNote) io.log(chakraNote);
  io.log("");
  io.log("1. Install the packages:");
  io.log(`   ${command}`);
  io.log("");
  if (written.length > 0) {
    io.log(`2. Scaffolded: ${written.join(", ")}`);
  }
  if (skipped.length > 0) {
    io.log(
      `   Skipped (already exist, use --force to overwrite): ${skipped.join(", ")}`
    );
  }
  io.log("");
  io.log(
    "3. Wrap your app in your UI kit's provider (MantineProvider / ThemeProvider / ChakraProvider / ConfigProvider — per its docs), render <PeopleTable />, done."
  );
  io.log("   Docs: https://github.com/orwa-mahmoud/adapttable");

  return {
    kit: info.kit,
    adapter: info.adapter,
    packageManager: pm,
    packages,
    installCommand: command,
    written,
    skipped,
  };
}
