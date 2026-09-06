/**
 * How many Vitest workers a suite should start.
 *
 * CI (`ubuntu-latest`) is 2 cores and already shards packages across jobs —
 * each suite stays on one thread so cssinjs first-paint does not miss the
 * 30s budget. Local turbo already fans packages; each suite takes a slice
 * of the machine. A solo `pnpm --filter … test` takes half the cores.
 */
import { availableParallelism } from "node:os";

/**
 * @param {{ ci?: boolean, turbo?: boolean, cores?: number, forced?: string }} [env]
 */
export function vitestMaxWorkers({
  ci = Boolean(process.env.CI),
  turbo = Boolean(process.env.TURBO_HASH),
  cores = availableParallelism(),
  forced = process.env.ADAPTTABLE_TEST_WORKERS,
} = {}) {
  // An explicit count wins everywhere, so a machine can be measured rather
  // than guessed at.
  const asked = Number(forced);
  if (Number.isInteger(asked) && asked > 0) return asked;
  if (ci) return 1;
  // Most of a suite's wall time is module loading, not arithmetic — a full
  // local run pins only ~6 of 10 cores at the old slice — so both paths
  // oversubscribe on purpose. Turbo still runs packages side by side, so its
  // slice is smaller than a suite that has the machine to itself.
  if (turbo) return Math.max(3, Math.floor(cores / 3));
  return Math.max(4, cores);
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
