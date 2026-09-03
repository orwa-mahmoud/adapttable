/**
 * How many Vitest workers a suite should start.
 *
 * CI (`ubuntu-latest`) is 2 cores and already shards packages across jobs —
 * each suite stays on one thread so cssinjs first-paint does not miss the
 * 30s budget. Local turbo already fans packages; each suite takes a slice
 * of the machine. A solo `pnpm --filter … test` takes half the cores.
 */
import { availableParallelism } from "node:os";

/** @param {{ ci?: boolean, turbo?: boolean, cores?: number }} [env] */
export function vitestMaxWorkers({
  ci = Boolean(process.env.CI),
  turbo = Boolean(process.env.TURBO_HASH),
  cores = availableParallelism(),
} = {}) {
  if (ci) return 1;
  if (turbo) return Math.max(2, Math.floor(cores / 6));
  return Math.max(4, Math.floor(cores / 2));
}

/**
 * File-level parallelism. Off on CI (one worker already). On locally.
 *
 * @param {{ ci?: boolean }} [env]
 * @returns {boolean}
 */
export function vitestFileParallelism({ ci = Boolean(process.env.CI) } = {}) {
  return !ci;
}
