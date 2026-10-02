import {
  detectFramework,
  detectKit,
  type Framework,
  type Kit,
  mergeDependencies,
} from "./detect";
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
  /** The detected framework. */
  framework: Framework;
  /** The detected kit identifier. */
  kit: Kit;
  /** The adapter package that was scaffolded. */
  adapter: string;
  /** The package manager chosen from lockfiles. */
  packageManager: PackageManager;
  /** Packages the printed install command will add. */
  packages: string[];
  /** The install command; package availability is not checked. */
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
  const framework = detectFramework(deps, {
    hasAngularJson: io.exists("angular.json"),
  });
  const info = detectKit(deps, {
    framework,
    hasComponentsJson: io.exists("components.json"),
  });
  const pm = choosePackageManager(io.listRootFiles());
  const packages = packagesFor(info).filter((specifier) => {
    if (framework !== "angular" || !info.extras.includes(specifier))
      return true;
    // Angular extras in KITS carry version ranges; compare their bare names so
    // an existing host peer is not reinstalled or upgraded by the command.
    const name = specifier.slice(0, specifier.lastIndexOf("@"));
    return !Object.hasOwn(deps, name);
  });
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

  io.log(
    framework === "angular"
      ? `AdaptTable — detected Angular (${info.label}).`
      : `AdaptTable — detected ${info.label}.`
  );
  const chakraNote = chakraVersionWarning(info.kit, deps["@chakra-ui/react"]);
  if (chakraNote) io.log(chakraNote);
  if (framework === "angular") {
    io.log(
      "   Note: Angular kits are prepared for their first public release. Check registry availability before installing; use built local packages until your registry provides the Angular binding and kit."
    );
  }
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
  if (framework === "angular") {
    io.log(
      '3. Import { PeopleTable } from "./peopleTable" in your host component, add PeopleTable to its imports, and render <people-table />.'
    );
    if (info.kit === "ng-zorro") {
      io.log(
        '   NG-ZORRO requires Angular 22 and ng-zorro-antd 22.1.1-compatible peers. Match any missing Angular peers to your installed Angular version. Add @import "ng-zorro-antd/ng-zorro-antd.min.css"; to your global stylesheet.'
      );
    }
  } else {
    io.log(
      "3. Wrap your app in your UI kit's provider (MantineProvider / ThemeProvider / ChakraProvider / ConfigProvider — per its docs), render <PeopleTable />, done."
    );
  }
  io.log("   Docs: https://github.com/orwa-mahmoud/adapttable");

  return {
    framework,
    kit: info.kit,
    adapter: info.adapter,
    packageManager: pm,
    packages,
    installCommand: command,
    written,
    skipped,
  };
}
