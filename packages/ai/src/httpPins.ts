/**
 * What a backend has acknowledged, remembered per connection and table.
 *
 * A pin says "this backend already has this table's contract, so the next turn
 * need not carry it." Getting that wrong is not a cache miss — it is a backend
 * answering with a contract it was never sent.
 *
 * Three things were wrong with keying it on the table session alone:
 *
 * - Two clients with different endpoints, or one endpoint after its credentials
 *   changed, shared a pin. A record therefore belongs to a *connection* as well
 *   as a table, and a host whose authentication identity changes says so with
 *   its own connection id.
 * - Any successful turn was taken as proof the backend supported pinning. A
 *   record is now written only when a reply acknowledges the exact version it
 *   was sent; everything else keeps sending the contract per request.
 * - The version stored was the one live when the reply landed, not the one the
 *   request carried. A contract that changed mid-exchange was marked current
 *   though the backend had never seen it. The sent version is what is kept, so
 *   a contract that moved during the exchange simply stays dirty.
 *
 * Nothing here performs I/O, reads a header, or holds a strong reference to a
 * session: secrets never enter a fingerprint, and a table that goes away takes
 * its records with it.
 */
import type { AgentManifest, AgentSession, CatalogEntry } from "./types";

/** How a backend answered the contract it was sent. @public */
export type PinStatus = "acknowledged" | "expired" | "unknown" | "unsupported";

/** One backend's acknowledgement, for one connection and one table. */
export interface PinRecord {
  /** Which backend connection acknowledged it. */
  readonly connectionId: string;
  /** The table the contract describes. */
  readonly tableId: string;
  /** The backend's own handle for this pin, when it issued one. */
  readonly sessionId?: string;
  /** The contract version the request carried and the reply acknowledged. */
  readonly contractVersion: string;
  /** Send order, so a slow reply cannot overwrite a newer acknowledgement. */
  readonly seq: number;
  /** When this record stops being usable. */
  readonly expiresAt: number;
}

/** Idle lifetime of a client-side pin when a backend names none. */
export const DEFAULT_PIN_TTL_MS = 30 * 60 * 1000;

/** Connections one table session may hold pins for at once. */
export const DEFAULT_PIN_CONNECTIONS = 8;

/**
 * A stable, unambiguous name for everything a backend was told.
 *
 * Structured rather than joined with separators: a column id containing the
 * separator would otherwise be able to spell a different contract. Turn-specific
 * state is deliberately absent — a view revision moving is not the contract
 * changing — while labels, types, limits and row addressing are present,
 * because a backend that was told the wrong label writes the wrong prompt even
 * though every key is still the same.
 */
export function contractFingerprint(
  manifest: AgentManifest,
  catalog: readonly CatalogEntry[]
): string {
  return JSON.stringify({
    tableId: manifest.tableId,
    capabilities: [...manifest.capabilities].sort((a, b) => a.localeCompare(b)),
    columns: [...manifest.columns]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((column) => ({
        id: column.id,
        label: column.label,
        type: column.type,
        readable: column.readable,
        writable: column.writable,
        sortable: column.sortable,
      })),
    rowAddressing: manifest.rowAddressing,
    limits: manifest.limits,
    policy: manifest.policy,
    source: manifest.source,
    catalog: [...catalog]
      .sort((a, b) => a.key.localeCompare(b.key))
      .map((entry) => ({ key: entry.key, summary: entry.summary })),
  });
}

interface ConnectionState {
  record?: PinRecord;
  seq: number;
  /** The refresh currently in flight, so simultaneous callers share one. */
  inflight?: { readonly version: string; readonly run: Promise<void> };
  lastUsedAt: number;
}

/** The client's pin memory. @see createPinStore */
export interface PinStore {
  /** The usable record for this connection, or nothing when it has expired. */
  readonly read: (
    session: AgentSession,
    connectionId: string
  ) => PinRecord | undefined;
  /** Claim the next send order for this connection. */
  readonly claim: (session: AgentSession, connectionId: string) => number;
  /** Keep an acknowledgement, unless a newer one is already held. */
  readonly remember: (session: AgentSession, record: PinRecord) => void;
  /** Drop one connection's record, or every record for this table. */
  readonly forget: (session: AgentSession, connectionId?: string) => void;
  /**
   * Run one refresh per connection and version, shared by every caller that
   * asks for it while it is in flight.
   *
   * A caller that aborts rejects the shared work for everyone, which is the
   * safe direction: nobody ends up believing a contract was acknowledged
   * because someone else's request was cancelled.
   */
  readonly join: (
    session: AgentSession,
    connectionId: string,
    version: string,
    run: () => Promise<void>
  ) => Promise<void>;
}

/**
 * A pin store.
 *
 * `now` is injected so expiry is deterministic under test rather than a
 * suite that sleeps.
 */
export function createPinStore(
  options: {
    readonly now?: () => number;
    readonly ttlMs?: number;
    readonly maxConnections?: number;
  } = {}
): PinStore {
  const now = options.now ?? (() => Date.now());
  const ttlMs = options.ttlMs ?? DEFAULT_PIN_TTL_MS;
  const maxConnections = options.maxConnections ?? DEFAULT_PIN_CONNECTIONS;
  const byTable = new WeakMap<AgentSession, Map<string, ConnectionState>>();

  const connections = (session: AgentSession): Map<string, ConnectionState> => {
    const existing = byTable.get(session);
    if (existing) return existing;
    const created = new Map<string, ConnectionState>();
    byTable.set(session, created);
    return created;
  };

  const state = (
    session: AgentSession,
    connectionId: string
  ): ConnectionState => {
    const all = connections(session);
    const existing = all.get(connectionId);
    if (existing) {
      existing.lastUsedAt = now();
      return existing;
    }
    // Least recently used goes first, and only ever a pin: a record here is a
    // note about what a backend was told, never a receipt of work.
    if (all.size >= maxConnections) {
      let oldest: string | undefined;
      let oldestAt = Number.POSITIVE_INFINITY;
      for (const [id, entry] of all) {
        if (entry.lastUsedAt < oldestAt) {
          oldestAt = entry.lastUsedAt;
          oldest = id;
        }
      }
      if (oldest !== undefined) all.delete(oldest);
    }
    const created: ConnectionState = { seq: 0, lastUsedAt: now() };
    all.set(connectionId, created);
    return created;
  };

  return {
    read: (session, connectionId) => {
      const entry = state(session, connectionId);
      if (!entry.record) return undefined;
      if (entry.record.expiresAt <= now()) {
        entry.record = undefined;
        return undefined;
      }
      return entry.record;
    },
    claim: (session, connectionId) => {
      const entry = state(session, connectionId);
      entry.seq += 1;
      return entry.seq;
    },
    remember: (session, record) => {
      const entry = state(session, record.connectionId);
      // A reply that left before the one already kept says nothing newer.
      if (entry.record && entry.record.seq > record.seq) return;
      entry.record = record;
    },
    forget: (session, connectionId) => {
      const all = connections(session);
      if (connectionId === undefined) {
        all.clear();
        return;
      }
      all.delete(connectionId);
    },
    join: async (session, connectionId, version, run) => {
      const entry = state(session, connectionId);
      if (entry.inflight && entry.inflight.version === version) {
        await entry.inflight.run;
        return;
      }
      const started = run();
      entry.inflight = { version, run: started };
      try {
        await started;
      } finally {
        if (entry.inflight?.run === started) entry.inflight = undefined;
      }
    },
  };
}

/** Expiry for a record a backend said it would hold for `ttlMs`. */
export function pinExpiry(
  from: number,
  ttlMs: number | undefined,
  fallbackMs: number
): number {
  const held = ttlMs !== undefined && ttlMs > 0 ? ttlMs : fallbackMs;
  return from + held;
}
