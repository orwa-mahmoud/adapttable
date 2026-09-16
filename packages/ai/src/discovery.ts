/**
 * Answering "tell me how to do this" in one round.
 *
 * A model that wants to edit a cell needs the edit guide *and* the row
 * addressing rules, and a model configuring aggregations needs the grouping
 * ones. Making it discover that in three serialized rounds is three model
 * invocations to answer one question, so a capability may declare what it
 * belongs with and a request for one may expand into the family.
 *
 * The rules that keep expansion from becoming a hole:
 *
 * - **A family is not a permission.** Every key still goes through the
 *   session, which applies the same predicate the catalog does. A bundle
 *   naming an excluded capability returns it as unavailable, not as a guide.
 * - **There is no second registry.** Dependencies reference capability keys
 *   that already exist; a family is metadata on definitions, not a parallel
 *   list a backend prompt could disagree with.
 * - **Cycles end.** Visited keys are tracked, so `a` depending on `b`
 *   depending on `a` expands once and stops rather than recursing.
 * - **Bounded, and it says when.** Expansion stops at a ceiling and reports
 *   what it deferred, because a family that silently returns half of itself is
 *   a model calling something it was never shown how to call.
 */
import type { CapabilityFamily, CapabilityGuide } from "./types";

/** The most guides one discovery round will answer with. */
export const MAX_FAMILY_GUIDES = 8;

export type { CapabilityFamily };

/** The built-in families, from what each capability actually needs. */
const BUILT_IN_FAMILIES: Readonly<Record<string, CapabilityFamily>> = {
  "edit.cells": { family: "editing", dependsOn: ["rows.resolve"] },
  "rows.add": { family: "editing" },
  "rows.delete": { family: "editing", dependsOn: ["rows.resolve"] },
  "rows.reorder": { family: "editing", dependsOn: ["rows.resolve"] },
  "rows.resolve": { family: "addressing" },
  "rows.read": { family: "addressing" },
  "view.setAggregations": {
    family: "grouping",
    dependsOn: ["view.setGroupBy"],
  },
  "view.setGroupBy": { family: "grouping" },
  "view.setFilters": { family: "view" },
  "view.setSort": { family: "view" },
  "view.setSearch": { family: "view" },
  "view.setPage": { family: "view" },
  "view.pinColumn": { family: "view" },
  "view.hideColumn": { family: "view" },
  "view.setColumnOrder": { family: "view" },
  "view.pinRow": { family: "view", dependsOn: ["rows.resolve"] },
};

/** What a capability belongs with, whether built in or the host's own. */
export function familyOf(
  key: string,
  declared?: CapabilityFamily
): CapabilityFamily {
  return declared ?? BUILT_IN_FAMILIES[key] ?? {};
}

/** What one discovery request asked for. */
export interface DiscoveryRequest {
  /** Capability keys, as `describe` has always taken them. */
  readonly keys?: readonly string[];
  /** A family name, expanded locally into its members. */
  readonly bundle?: string;
}

/** What a discovery round answered with. */
export interface DiscoveryResult {
  /** Guides, in the order they were expanded. */
  readonly guides: readonly CapabilityGuide[];
  /** Keys that were asked for and answered. */
  readonly fulfilled: readonly string[];
  /**
   * Keys this table cannot offer.
   *
   * Excluded, unwired, or simply not a capability. Which of the three is
   * deliberately not said: that would tell a model about the host's
   * configuration.
   */
  readonly unavailable: readonly string[];
  /** Keys left out because the round was full, named so they can be asked for. */
  readonly deferred: readonly string[];
}

/** Everything expansion needs from the live session. */
export interface DiscoverySource {
  /** Keys the agent may use right now. */
  readonly available: () => readonly string[];
  /** The guide for one key. Throws when the key is not permitted. */
  readonly describe: (key: string) => CapabilityGuide;
  /** What this key belongs with, when the definition declared it. */
  readonly family: (key: string) => CapabilityFamily | undefined;
}

/**
 * Expand a request into the keys it actually needs, once each.
 *
 * Breadth-first from what was asked, so the requested keys come before the
 * dependencies they dragged in — a budget that cuts the tail cuts the
 * supporting reading rather than the thing the model asked about.
 */
function expand(
  request: DiscoveryRequest,
  source: DiscoverySource
): readonly string[] {
  return walk(seedOf(request, source), source);
}

/**
 * What the request asked about, before any dependency is followed.
 *
 * A family is expanded from what this table actually offers, so asking for one
 * on a table that wires two of its five members gets two.
 */
function seedOf(
  request: DiscoveryRequest,
  source: DiscoverySource
): readonly string[] {
  const seed = [...(request.keys ?? [])];
  if (!request.bundle) return seed;
  for (const key of source.available()) {
    if (source.family(key)?.family !== request.bundle) continue;
    if (!seed.includes(key)) seed.push(key);
  }
  return seed;
}

/**
 * The seed, then whatever its members depend on, breadth first.
 *
 * A dependency exists to make its capability usable, so one is followed only
 * out of a capability this table offers: answering with a guide for something
 * that cannot run reads to a model as an invitation to try it. The key itself
 * still travels, so the answer still says it is unavailable.
 */
function walk(
  seed: readonly string[],
  source: DiscoverySource
): readonly string[] {
  const offered = new Set(source.available());
  const ordered: string[] = [];
  const visited = new Set<string>();
  const queue = [...seed];

  // The queue is appended to while it is walked, and an array iterator visits
  // what arrives after it — which is the breadth-first order this wants.
  for (const key of queue) {
    // Visited before ordered: a cycle revisits a key that is already queued,
    // and this is what stops it.
    if (visited.has(key)) continue;
    visited.add(key);
    ordered.push(key);
    if (!offered.has(key)) continue;
    queue.push(...(source.family(key)?.dependsOn ?? []));
  }
  return ordered;
}

/**
 * Answer one discovery request.
 *
 * @param request - The keys and optional family the backend asked for.
 * @param source - The live session's permitted view of itself.
 * @param limit - The most guides to answer with. Defaults to
 *   {@link MAX_FAMILY_GUIDES}.
 * @returns The guides, and what was unavailable or deferred.
 */
export function discover(
  request: DiscoveryRequest,
  source: DiscoverySource,
  limit: number = MAX_FAMILY_GUIDES
): DiscoveryResult {
  const available = new Set(source.available());
  const keys = expand(request, source);
  const guides: CapabilityGuide[] = [];
  const fulfilled: string[] = [];
  const unavailable: string[] = [];
  const deferred: string[] = [];

  for (const key of keys) {
    // Asked again per key, so a family cannot carry an excluded capability in
    // on the back of one the agent may use.
    if (!available.has(key)) {
      unavailable.push(key);
      continue;
    }
    if (guides.length >= limit) {
      deferred.push(key);
      continue;
    }
    guides.push(source.describe(key));
    fulfilled.push(key);
  }

  return { guides, fulfilled, unavailable, deferred };
}
