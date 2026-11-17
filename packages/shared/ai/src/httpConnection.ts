/**
 * What one HTTP connection remembers: its pins, guides and backend handles,
 * and the compact request it can send.
 */
import { type AgentContext, buildAgentContext } from "./context";
import { type DiscoverySource, familyOf } from "./discovery";
import { createDiscoveryCache } from "./discoveryCache";
import { exchange } from "./httpFetch";
import {
  contractFingerprint,
  createPinStore,
  DEFAULT_PIN_TTL_MS,
  pinExpiry,
} from "./httpPins";
import {
  type AgentHttpClientOptions,
  type AgentHttpKind,
  type AgentHttpRequest,
  type AgentHttpResponse,
} from "./httpWire";
import { AGENT_SCHEMA_VERSION } from "./keys";
import type { AgentSession } from "./types";

/**
 * The session's own permitted view of itself, for expansion.
 *
 * `available` is the catalog, which the permission predicate has already
 * filtered, and `describe` refuses anything it would not list — so a family
 * cannot reach past either.
 */
export function discoverySource(session: AgentSession): DiscoverySource {
  return {
    available: () => session.catalog().map((entry) => entry.key),
    describe: (key) => session.describe(key),
    family: (key) => familyOf(key),
  };
}

export const pins = createPinStore();
/**
 * Guides already answered, per connection and contract version.
 *
 * Holding one is not the same as sending one: a cached guide still has to be
 * selected into a request. What this saves is the round that would have been
 * spent asking for it again.
 */
export const guideCache = createDiscoveryCache();

/**
 * Which connection these options describe.
 *
 * The endpoint, and never a header — a header is where the credentials are.
 *
 * Deliberately not the identity of the transport function. A host that builds
 * its options inside a render hands over a new closure every call, and keying
 * on that would mean such a host never keeps a pin at all: every turn would
 * look like a first one and carry the whole contract forever. A host that
 * genuinely has two connections to one endpoint — two credentials, two
 * tenants — says so with `connectionId`, which is what that option is for.
 */
export function connectionIdOf(options: AgentHttpClientOptions): string {
  return options.connectionId ?? `endpoint:${options.endpoint}`;
}

/** Everything the backend would be told, named unambiguously. */
export function schemaFingerprint(session: AgentSession): string {
  return contractFingerprint(session.manifest(), session.catalog());
}

/**
 * The handle a backend issued for a table, kept past the session that got it.
 *
 * The pin is a note about what one session was told, and a host that rebuilds
 * the session — a remounted provider, a re-keyed parent — has told a new one
 * nothing. The backend's handle is not that: it names a thread that backend
 * is holding for this table, and arriving without it makes a reader who has
 * been talking for ten minutes look like someone who has just walked in.
 *
 * Carried on its own, so nothing about the contract is assumed: a rebuilt
 * session still holds no pin, still sends the contract, and the backend
 * re-pins it against the thread it already had.
 */
export const sessionHandles = new Map<string, string>();

/** Tables whose handle is kept. Enough for any page; this is not a store. */
const MAX_SESSION_HANDLES = 16;

function rememberHandle(tableId: string, sessionId: string | undefined): void {
  if (!sessionId) return;
  // Re-inserted so the least recently confirmed is the one that goes.
  sessionHandles.delete(tableId);
  sessionHandles.set(tableId, sessionId);
  if (sessionHandles.size > MAX_SESSION_HANDLES) {
    const oldest = sessionHandles.keys().next().value;
    if (oldest !== undefined) sessionHandles.delete(oldest);
  }
}

/**
 * Keep a pin only when the reply acknowledged the exact version it was sent.
 *
 * An ordinary successful turn proves nothing about pinning; a backend that
 * says nothing about the contract keeps being sent it.
 */
export function rememberPin(
  session: AgentSession,
  connectionId: string,
  sent: { readonly version: string; readonly seq: number },
  response: AgentHttpResponse
): void {
  const ack = response.pin;
  if (ack?.status !== "acknowledged") return;
  if (
    ack.contractVersion !== undefined &&
    ack.contractVersion !== sent.version
  ) {
    // The backend answered for a different contract than this request carried.
    return;
  }
  const tableId = session.manifest().tableId;
  // A backend names its session handle when the connection opens and
  // acknowledges later contracts without repeating it. Silence is not
  // revocation: dropping the handle here sends the next request without one,
  // and a backend that keys its pin by session answers that request as a
  // stranger — a round trip spent resending the contract, and a turn the
  // backend then plans again from the beginning. Carried forward only for the
  // same table, because a handle is a handle on that table's contract.
  const held = pins.read(session, connectionId);
  const carried =
    held?.tableId === tableId && held.sessionId !== undefined
      ? held.sessionId
      : undefined;
  const handle = response.sessionId ?? carried;
  rememberHandle(tableId, handle);
  pins.remember(session, {
    connectionId,
    tableId,
    sessionId: handle,
    // The version SENT, never the one live now: a contract that moved during
    // the exchange is a contract this backend has not seen.
    contractVersion: sent.version,
    seq: sent.seq,
    expiresAt: pinExpiry(Date.now(), ack.ttlMs, DEFAULT_PIN_TTL_MS),
  });
}

/** A backend that lost its pin, before anything of this turn has run. */
export function pinLost(response: AgentHttpResponse): boolean {
  return (
    response.pin?.status === "expired" || response.pin?.status === "unknown"
  );
}

/**
 * The context this client would send, built once per exchange.
 *
 * Built from the live session through `buildAgentContext`, which has already
 * applied the permission predicate, so nothing excluded can reach the wire.
 * The caller decides whether it travels; this only decides what it says.
 */
export function currentContext(
  session: AgentSession,
  options: AgentHttpClientOptions,
  connectionId?: string,
  contractVersion?: string
): AgentContext {
  const chosen = options.context ?? {};
  // A guide this backend already asked for, under this same contract, is
  // evidence of what the conversation is about. It goes to the front of the
  // selection so the next turn carries it instead of spending another round
  // asking — through the ordinary budget, not around it, and never by
  // appending every guide ever answered.
  const remembered =
    connectionId && contractVersion
      ? guideCache.known(
          connectionId,
          contractVersion,
          session.catalog().map((entry) => entry.key)
        )
      : [];
  return buildAgentContext(
    session,
    remembered.length > 0
      ? { ...chosen, asked: [...remembered, ...(chosen.asked ?? [])] }
      : chosen,
    options.contextInputs?.(session) ?? {}
  );
}

export function compactRequest(
  session: AgentSession,
  kind: AgentHttpKind,
  extra: Partial<AgentHttpRequest> = {},
  mode: "full" | "question" = "full",
  pin?: {
    readonly connectionId: string;
    readonly version: string;
    readonly context: AgentContext;
  }
): AgentHttpRequest {
  const manifest = session.manifest();
  const record = pin ? pins.read(session, pin.connectionId) : undefined;
  const sessionId =
    extra.sessionId ??
    record?.sessionId ??
    sessionHandles.get(manifest.tableId);
  const contractVersion = pin?.version;
  const context = pin?.context;
  const versions = {
    ...(contractVersion ? { contractVersion } : {}),
    ...(context ? { selectionVersion: context.selection.version } : {}),
  };
  if (mode === "question") {
    // The contract is pinned; the view is not, and never is. It moves on every
    // turn, so a backend answering one is always answering against the view in
    // that request.
    return {
      schemaVersion: AGENT_SCHEMA_VERSION,
      kind,
      tableId: manifest.tableId,
      viewRevision: manifest.viewRevision,
      ...(sessionId ? { sessionId } : {}),
      ...versions,
      ...(context ? { view: context.view } : {}),
      ...extra,
    };
  }
  return {
    schemaVersion: AGENT_SCHEMA_VERSION,
    kind,
    tableId: manifest.tableId,
    // The contract is what a backend answers against. `manifest` and `catalog`
    // travel beside it as the compact form, for an endpoint written against
    // the earlier shape.
    ...(context
      ? {
          context: {
            contract: context.contract,
            selection: context.selection,
          },
          view: context.view,
        }
      : {}),
    manifest,
    catalog: session.catalog(),
    ...(sessionId ? { sessionId } : {}),
    ...versions,
    ...extra,
  };
}

/**
 * Whether this connection may leave the contract out of the next request.
 *
 * The stored version is compared against the live one, so a contract that
 * changed — during an exchange or since — is simply not current, and the next
 * request carries it again.
 */
export function usesPinnedCatalog(
  session: AgentSession,
  options: AgentHttpClientOptions
): boolean {
  if (options.pinCatalog === false) return false;
  const record = pins.read(session, connectionIdOf(options));
  return record?.contractVersion === schemaFingerprint(session);
}

/**
 * Bring this connection's pin up to date, if it can be.
 *
 * A backend that refuses or cannot pin is not an error: the contract travels
 * in each request instead. Only a transport failure propagates, and nothing is
 * ever marked current by a refresh that did not succeed.
 */
export async function refreshSchemaPin(
  session: AgentSession,
  options: AgentHttpClientOptions,
  signal?: AbortSignal
): Promise<void> {
  if (options.pinCatalog === false) return;
  const connectionId = connectionIdOf(options);
  const version = schemaFingerprint(session);
  const current = pins.read(session, connectionId);
  if (!current || current.contractVersion === version) return;
  await pins.join(session, connectionId, version, async () => {
    const seq = pins.claim(session, connectionId);
    const response = await exchange(
      options,
      compactRequest(session, "schema", {}, "full", {
        connectionId,
        version,
        context: currentContext(session, options),
      }),
      signal
    );
    if (response.ok === false) {
      // The backend declined this contract. Sending it per request is the
      // documented fallback, and marking anything current here would be a lie.
      pins.forget(session, connectionId);
      guideCache.forget(connectionId);
      return;
    }
    rememberPin(session, connectionId, { version, seq }, response);
  });
}
