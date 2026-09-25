/**
 * Guides a backend has already been given, kept per contract version.
 *
 * Answering `describe` twice for the same unchanged capability costs a model
 * round each time, which is the thing discovery exists to avoid. So the
 * answers are kept — but keyed on the **contract version**, not on the session,
 * because a session outlives the contract it answered under. A label change, a
 * permission change or a capability turning off produces a new version and the
 * old answers stop being reachable, rather than being served for a table that
 * no longer exists in that shape.
 *
 * Two rules make it safe to keep anything at all:
 *
 * - **Only guides.** Never an approval decision, never a completed mutation's
 *   payload, never a row window. A guide describes how to call something; the
 *   others are records of what happened, and re-presenting one as current
 *   context is how a model comes to believe a write is still pending or a row
 *   still says what it said.
 * - **Backend memory is not model context.** A cached guide still has to be
 *   selected into the request under the ordinary budget. Holding it here means
 *   not paying a round to fetch it again — not that it silently appears in
 *   every future prompt.
 */
import type { CapabilityGuide } from "./types";

/** Contract versions one cache will hold guides for at once. */
export const DEFAULT_CACHE_VERSIONS = 2;

/** Guides one contract version will hold. */
export const DEFAULT_CACHE_GUIDES = 64;

interface VersionEntry {
  readonly guides: Map<string, CapabilityGuide>;
  lastUsedAt: number;
}

/** Guides remembered for one connection and table. @public */
export interface DiscoveryCache {
  /** A guide already answered under this contract version, if any. */
  readonly read: (
    connectionId: string,
    contractVersion: string,
    key: string
  ) => CapabilityGuide | undefined;
  /** Keep answers for this contract version. */
  readonly remember: (
    connectionId: string,
    contractVersion: string,
    guides: readonly CapabilityGuide[]
  ) => void;
  /** Which of these keys are already held under this version. */
  readonly known: (
    connectionId: string,
    contractVersion: string,
    keys: readonly string[]
  ) => readonly string[];
  /** Drop one connection's guides, or every one. */
  readonly forget: (connectionId?: string) => void;
  /** How many versions are currently held, for a disposal check. */
  readonly size: () => number;
}

/**
 * A guide cache.
 *
 * `now` is injected so retention is deterministic under test.
 */
export function createDiscoveryCache(
  options: {
    readonly now?: () => number;
    readonly maxVersions?: number;
    readonly maxGuides?: number;
  } = {}
): DiscoveryCache {
  const now = options.now ?? (() => Date.now());
  const maxVersions = options.maxVersions ?? DEFAULT_CACHE_VERSIONS;
  const maxGuides = options.maxGuides ?? DEFAULT_CACHE_GUIDES;
  // Keyed by connection first: what one backend was told is not what another
  // was told, and HTTP pins are scoped the same way for the same reason.
  const byConnection = new Map<string, Map<string, VersionEntry>>();

  const versions = (connectionId: string): Map<string, VersionEntry> => {
    const existing = byConnection.get(connectionId);
    if (existing) return existing;
    const created = new Map<string, VersionEntry>();
    byConnection.set(connectionId, created);
    return created;
  };

  const entry = (
    connectionId: string,
    contractVersion: string,
    create: boolean
  ): VersionEntry | undefined => {
    const all = versions(connectionId);
    const existing = all.get(contractVersion);
    if (existing) {
      existing.lastUsedAt = now();
      return existing;
    }
    if (!create) return undefined;
    // A contract that moved is a different table as far as guidance goes. The
    // oldest version goes rather than growing a history nobody reads.
    if (all.size >= maxVersions) {
      let oldest: string | undefined;
      let oldestAt = Number.POSITIVE_INFINITY;
      for (const [version, held] of all) {
        if (held.lastUsedAt < oldestAt) {
          oldestAt = held.lastUsedAt;
          oldest = version;
        }
      }
      if (oldest !== undefined) all.delete(oldest);
    }
    const created: VersionEntry = { guides: new Map(), lastUsedAt: now() };
    all.set(contractVersion, created);
    return created;
  };

  return {
    read: (connectionId, contractVersion, key) =>
      entry(connectionId, contractVersion, false)?.guides.get(key),

    remember: (connectionId, contractVersion, guides) => {
      const held = entry(connectionId, contractVersion, true);
      if (!held) return;
      for (const guide of guides) {
        if (held.guides.size >= maxGuides && !held.guides.has(guide.key)) {
          // Bounded rather than unbounded: a table with hundreds of custom
          // capabilities must not turn a cache into a leak.
          continue;
        }
        held.guides.set(guide.key, guide);
      }
    },

    known: (connectionId, contractVersion, keys) => {
      const held = entry(connectionId, contractVersion, false);
      if (!held) return [];
      return keys.filter((key) => held.guides.has(key));
    },

    forget: (connectionId) => {
      if (connectionId === undefined) {
        byConnection.clear();
        return;
      }
      byConnection.delete(connectionId);
    },

    size: () => {
      let total = 0;
      for (const all of byConnection.values()) total += all.size;
      return total;
    },
  };
}
