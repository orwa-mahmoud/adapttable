/**
 * The agent session: a loop over the command registry.
 *
 * Every call is received (idempotency, replay, joining an identical call in
 * flight), validated (registered, wired, at the expected revision, arguments
 * against the command's schema), approved (governed writes only), applied
 * (the command changes the table through `apply`) and reported (one
 * `ExecuteResult`, recorded for replay). Transports translate to and from
 * this loop and nothing else.
 */
import { runExecute } from "./agentLoop/execute";
import type { CreateAgentSessionOptions } from "./agentLoop/options";
import {
  DEFAULT_REPLAY_CACHE_SIZE,
  executeFingerprint,
  refreshReplayResult,
  ReplayStore,
} from "./agentLoop/replay";
import type { LoopState } from "./agentLoop/validate";
import {
  type CapabilityRegistry,
  createCapabilityRegistry,
  shortForm,
} from "./capabilities/registry";
import type { SessionGuard } from "./commands/command";
import type { LiveApplyCoordinator } from "./controlledApply";
import { buildManifest } from "./manifest";
import type {
  AgentSession,
  CapabilityGuide,
  CatalogEntry,
  ExecuteResult,
} from "./types";

export type { CreateAgentSessionOptions } from "./agentLoop/options";

/**
 * Provider-neutral three-stage session.
 *
 * Runtimes that support typed tools can wrap each `describe` result; the
 * generic catalog/describe/execute calls stay the portable fallback.
 *
 * @public
 */
export function createAgentSession(
  options: CreateAgentSessionOptions
): AgentSession {
  return createAgentSessionInternal(options);
}

/** Receive: a cached, in-flight or retired identity answers without running. */
function received(
  state: LoopState,
  inflight: ReadonlyMap<string, InFlight>,
  key: string,
  args: unknown,
  idempotencyKey: string
): Promise<ExecuteResult> | undefined {
  const { options, replay } = state;
  const fingerprint = executeFingerprint(key, args);
  const mismatch = (): Promise<ExecuteResult> =>
    Promise.resolve({
      ok: false,
      revision: options.observe().viewRevision,
      idempotencyKey,
      error: {
        code: "idempotency-mismatch",
        message:
          "idempotency key was already used for a different capability or payload",
      },
    });

  const cached = replay.get(idempotencyKey);
  if (cached) {
    if (cached.fingerprint !== fingerprint) return mismatch();
    return Promise.resolve(
      refreshReplayResult(cached, idempotencyKey, state.guard, state.registry)
    );
  }

  const running = inflight.get(idempotencyKey);
  if (running) {
    if (running.fingerprint !== fingerprint) return mismatch();
    return running.promise;
  }

  // An accepted mutation keeps its identity after its result is evicted.
  const retired = replay.retiredMutation(idempotencyKey);
  if (retired === undefined) return undefined;
  if (retired !== fingerprint) return mismatch();
  return Promise.resolve({
    ok: false,
    revision: options.observe().viewRevision,
    idempotencyKey,
    error: {
      code: "replay-expired",
      message: replay.wasAttempted(idempotencyKey)
        ? "this mutation was already attempted; its result is no longer cached and it will not run again"
        : "this write was already accepted; its result is no longer cached and it will not run again",
    },
  });
}

interface InFlight {
  readonly fingerprint: string;
  readonly promise: Promise<ExecuteResult>;
}

function catalogOf(registry: CapabilityRegistry, state: LoopState) {
  return (): CatalogEntry[] => {
    const observation = state.options.observe();
    return registry.enabled(observation).map((definition) => ({
      key: definition.key,
      summary: definition.summary,
      summaryShort: shortForm(definition.summary),
      ...(definition.kind ? { kind: definition.kind } : {}),
      ...(definition.idempotent === undefined
        ? {}
        : { idempotent: definition.idempotent }),
    }));
  };
}

function describeOf(registry: CapabilityRegistry, state: LoopState) {
  return (key: string): CapabilityGuide => {
    if (!registry.has(key)) {
      throw new Error(`unknown capability "${key}"`);
    }
    const observation = state.options.observe();
    if (!registry.permits(key, observation)) {
      // Excluded and unwired are both "you cannot use this", and saying which
      // would tell a model something about the host's configuration that it
      // has no business learning from a refusal.
      throw new Error(`capability "${key}" is not wired on this table`);
    }
    const guide = registry.describe(key);
    return registry.builtIn(key)?.describe?.(guide, observation) ?? guide;
  };
}

/** Package-internal live-binding extension; the public constructor stays unchanged. */
export function createAgentSessionInternal(
  options: CreateAgentSessionOptions,
  coordinator?: LiveApplyCoordinator
): AgentSession {
  const guard: SessionGuard = {
    observe: () => options.observe(),
    // One predicate, asked here as everywhere else — including the
    // revalidation after an awaited boundary, which is the check an excluded
    // capability must not be able to walk past.
    isEnabled: (key, observation) => registry.permits(key, observation),
  };
  const registry: CapabilityRegistry = createCapabilityRegistry(
    options.capabilities ?? [],
    guard,
    options.excludeCapabilities ?? [],
    options.capabilityApproval ?? {}
  );
  const state: LoopState = {
    options,
    registry,
    guard,
    replay: new ReplayStore(
      options.replayCacheSize ?? DEFAULT_REPLAY_CACHE_SIZE
    ),
    coordinator,
  };
  const inflight = new Map<string, InFlight>();

  const execute = (
    key: string,
    args: unknown,
    expectedRevision: number,
    idempotencyKey: string,
    signal?: AbortSignal
  ): Promise<ExecuteResult> => {
    if (signal?.aborted) {
      return Promise.resolve({
        ok: false,
        revision: options.observe().viewRevision,
        idempotencyKey,
        error: { code: "cancelled", message: "execute cancelled" },
      });
    }
    const answered = received(state, inflight, key, args, idempotencyKey);
    if (answered) return answered;
    // Reserve the key before any handler can run, so a synchronous re-entry
    // joins this execution instead of starting a second one.
    const entry: InFlight = {
      fingerprint: executeFingerprint(key, args),
      promise: Promise.resolve().then(() =>
        runExecute(state, key, args, expectedRevision, idempotencyKey, signal)
      ),
    };
    inflight.set(idempotencyKey, entry);
    return entry.promise.finally(() => {
      inflight.delete(idempotencyKey);
    });
  };

  return {
    catalog: catalogOf(registry, state),
    describe: describeOf(registry, state),
    execute,
    manifest: () => {
      const observation = options.observe();
      return buildManifest(observation, registry.enabledKeys(observation));
    },
  };
}

export { AGENT_SCHEMA_VERSION } from "./keys";
