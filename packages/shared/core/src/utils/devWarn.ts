/** Minimal shape of a Node-style `process` global, typed locally so the
 * package needs no Node type dependency. */
interface ProcessLike {
  env?: Record<string, string | undefined>;
}

/** True outside production builds. Bundlers inline `NODE_ENV` and drop the
 * dev-only branches; without a bundler (plain browser) this stays on. */
function isDev(): boolean {
  const proc = (globalThis as { process?: ProcessLike }).process;
  return proc?.env?.NODE_ENV !== "production";
}

const seen = new Set<string>();

/**
 * Log a development-only warning once per unique message. Silent in
 * production builds, never throws — safe to call from render paths via
 * effects. Used for misconfiguration that would otherwise fail silently
 * (a sort that cannot resolve, duplicate column keys, …).
 */
export function devWarn(message: string): void {
  if (!isDev() || seen.has(message)) return;
  seen.add(message);
  console.warn(`[adapttable] ${message}`);
}

/** Test-only seam: forget which warnings have fired. */
export function resetDevWarnings(): void {
  seen.clear();
}
