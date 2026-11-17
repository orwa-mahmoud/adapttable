/**
 * Receive: what the session remembers about idempotency keys it has seen.
 */
import type { CapabilityRegistry } from "../capabilities/registry";
import { ApplyError, type SessionGuard } from "../commands/command";
import { errorMessage } from "../errorMessage";
import type { ExecuteResult } from "../types";

/** Replay records kept per session before the oldest non-mutation is dropped. */
export const DEFAULT_REPLAY_CACHE_SIZE = 200;

export interface ReplayRecord {
  readonly capabilityKey: string;
  readonly fingerprint: string;
  readonly args: unknown;
  /** A governed write reached its handler — never run this key again. */
  readonly mutation: boolean;
  readonly result: ExecuteResult;
}

export function executeFingerprint(key: string, args: unknown): string {
  return JSON.stringify({ key, args: args ?? {} });
}

/**
 * Bounded replay store. Results are evicted oldest-first; the identity of an
 * accepted mutation is retained for the session so its key can never execute
 * a second time.
 */
export class ReplayStore {
  readonly #capacity: number;
  readonly #records = new Map<string, ReplayRecord>();
  readonly #mutations = new Map<string, string>();
  readonly #attempted = new Set<string>();

  constructor(capacity: number) {
    this.#capacity = Math.max(1, Math.floor(capacity));
  }

  get(key: string): ReplayRecord | undefined {
    const record = this.#records.get(key);
    if (!record) return undefined;
    this.#records.delete(key);
    this.#records.set(key, record);
    return record;
  }

  /** Fingerprint of an accepted mutation whose result is no longer cached. */
  retiredMutation(key: string): string | undefined {
    if (this.#records.has(key)) return undefined;
    return this.#mutations.get(key);
  }

  reserve(key: string, fingerprint: string): void {
    this.#mutations.set(key, fingerprint);
    this.#attempted.add(key);
  }

  wasAttempted(key: string): boolean {
    return this.#attempted.has(key);
  }

  set(key: string, record: ReplayRecord): void {
    if (record.mutation) this.#mutations.set(key, record.fingerprint);
    this.#records.delete(key);
    this.#records.set(key, record);
    for (const oldest of this.#records.keys()) {
      if (this.#records.size <= this.#capacity) break;
      this.#records.delete(oldest);
    }
  }
}

/**
 * Re-derive a cached result against the current declaration. A replay never
 * discloses a column, a row count or a scope the table no longer permits; a
 * command without a `replay` step returns its cached result unchanged.
 */
export function refreshReplayResult(
  record: ReplayRecord,
  idempotencyKey: string,
  guard: SessionGuard,
  registry: CapabilityRegistry
): ExecuteResult {
  const key = record.capabilityKey;
  const replay = registry.builtIn(key)?.replay;
  if (!replay) return record.result;
  const observation = guard.observe();

  const denied = (code: string, message: string): ExecuteResult => ({
    ok: false,
    revision: observation.viewRevision,
    idempotencyKey,
    error: { code, message },
  });

  if (!guard.isEnabled(key, observation)) {
    return denied(
      "not-wired",
      `capability "${key}" is not wired on this table`
    );
  }
  if (!record.result.ok) {
    return { ...record.result, revision: observation.viewRevision };
  }
  try {
    return replay(record.result, record.args, observation);
  } catch (error) {
    const code = error instanceof ApplyError ? error.code : "apply-failed";
    return denied(code, errorMessage(error));
  }
}
