/**
 * A bounded pin store for the example backend.
 *
 * A backend that pins a table's contract is holding memory on behalf of
 * whoever connects to it, so the store is bounded in both directions: a
 * ceiling on how many sessions it will hold, and an idle lifetime after which
 * one is dropped. Neither is a detail of this example — an unbounded map keyed
 * by whatever a client sends is how a demo becomes a memory leak in someone's
 * staging environment.
 *
 * What is deliberately absent is a fallback key. Keying a pin on the table id
 * alone let any client that knew the table name pick up a contract negotiated
 * over someone else's connection; a pin belongs to the session it was issued
 * for, and a request that names no session gets no pin.
 *
 * Node only. Never import this from frontend code.
 */

/** What the backend remembers about one connected client. */
export interface ExamplePin<TCatalog, TManifest> {
  readonly tableId: string;
  readonly catalog: TCatalog;
  readonly manifest: TManifest;
  /** The contract version the client named when it sent this. */
  readonly contractVersion?: string;
}

interface Entry<TCatalog, TManifest> {
  readonly pin: ExamplePin<TCatalog, TManifest>;
  lastUsedAt: number;
}

/** Sessions one example backend will hold at once. */
export const EXAMPLE_PIN_MAX_SESSIONS = 100;

/** How long an untouched pin survives. */
export const EXAMPLE_PIN_TTL_MS = 30 * 60 * 1000;

/**
 * A pin store bounded by count and idle time.
 *
 * `now` is injected so expiry can be tested by moving a number rather than by
 * sleeping for half an hour.
 */
export function createExamplePinStore<TCatalog, TManifest>(
  options: {
    readonly maxSessions?: number;
    readonly ttlMs?: number;
    readonly now?: () => number;
  } = {}
) {
  const maxSessions = options.maxSessions ?? EXAMPLE_PIN_MAX_SESSIONS;
  const ttlMs = options.ttlMs ?? EXAMPLE_PIN_TTL_MS;
  const now = options.now ?? (() => Date.now());
  const entries = new Map<string, Entry<TCatalog, TManifest>>();

  const dropExpired = (): void => {
    const cutoff = now() - ttlMs;
    for (const [id, entry] of entries) {
      if (entry.lastUsedAt <= cutoff) entries.delete(id);
    }
  };

  return {
    /** How many sessions are currently held. */
    size: (): number => {
      dropExpired();
      return entries.size;
    },

    /** Remember one session's contract, evicting the least recently used. */
    set: (sessionId: string, pin: ExamplePin<TCatalog, TManifest>): void => {
      dropExpired();
      entries.delete(sessionId);
      if (entries.size >= maxSessions) {
        // Map iterates in insertion order and every touch re-inserts, so the
        // first key is the least recently used one.
        const oldest = entries.keys().next();
        if (!oldest.done) entries.delete(oldest.value);
      }
      entries.set(sessionId, { pin, lastUsedAt: now() });
    },

    /**
     * The contract for this session, or nothing.
     *
     * A miss is a real answer — the client is told its pin is gone and sends
     * the contract again — never an invitation to serve another session's.
     */
    get: (
      sessionId: string | undefined
    ): ExamplePin<TCatalog, TManifest> | undefined => {
      if (!sessionId) return undefined;
      dropExpired();
      const entry = entries.get(sessionId);
      if (!entry) return undefined;
      // Touch: a session in active use does not idle out underneath it.
      entries.delete(sessionId);
      entry.lastUsedAt = now();
      entries.set(sessionId, entry);
      return entry.pin;
    },

    /** Forget one session. */
    delete: (sessionId: string): void => {
      entries.delete(sessionId);
    },

    /** Forget everything. Tests call this so one case cannot leak into the next. */
    clear: (): void => {
      entries.clear();
    },
  };
}
