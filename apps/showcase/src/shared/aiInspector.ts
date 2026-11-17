/**
 * What the AI page's developer inspector shows, written once for React, Vue
 * and Angular: the permitted contract as it stands, what each turn carries,
 * and the schema for one capability. It reads the same `buildAgentContext` a
 * backend receives, so a reader compares like with like. A framework adds
 * the markup and decides when to rebuild (when the manifest or the profile
 * moves).
 */
import {
  type AgentContext,
  type AgentContextInputs,
  type AgentManifest,
  type AgentSession,
  buildAgentContext,
} from "@adapttable/ai";

import type { DemoContextProfile } from "./aiDemo";

/** The docs pages the inspector links to, by `docs/*.md` basename. */
export const INSPECTOR_LINKS: readonly {
  readonly page: string;
  readonly label: string;
}[] = [
  { page: "ai-http", label: "Connect a backend" },
  { page: "ai-integrations", label: "AI integrations" },
  { page: "agent-capabilities", label: "Capabilities" },
];

/** The inspector's fixed words. */
export const INSPECTOR_TEXT = {
  title: "Developer inspector",
  version: "Contract version",
  sent: "Sent each turn",
  upfront: "Explained up front",
  deferred: "Asked for on demand",
  capability: "Capability",
  noCapabilities: "No capabilities wired",
  onDemand: " (on demand)",
  copy: "Copy",
  fetchedOnDemand:
    "This capability's guide is fetched on demand — ask for it in the conversation and it arrives with the answer.",
  noSession: "Attach a session to inspect a capability.",
  schemaFor: (key: string) => `Schema for ${key || "no capability"}`,
} as const;

/**
 * The contract a turn would carry now, or nothing before the table has
 * published its session and manifest. A framework rebuilds it when the
 * manifest or the profile moves: turning a feature off changes what the
 * table offers without moving the view.
 *
 * @param session - The live session.
 * @param manifest - The manifest the table last published.
 * @param profile - How much of the contract a turn carries.
 * @param inputs - Reads the live view the turn is judged against.
 * @returns The context.
 */
export function inspectedContext(
  session: AgentSession | null | undefined,
  manifest: AgentManifest | null | undefined,
  profile: DemoContextProfile,
  inputs: () => AgentContextInputs
): AgentContext | null {
  if (!session || !manifest) return null;
  return buildAgentContext(session, { profile }, inputs());
}

/** One capability in the picker. */
export interface InspectorCapability {
  readonly key: string;
  readonly label: string;
}

/** Everything the inspector draws, from one context. */
export interface InspectorView {
  readonly revision: string;
  readonly version: string;
  readonly sent: string;
  readonly upfront: string;
  readonly deferred: string;
  readonly notes: readonly string[];
  readonly sampling: string;
  readonly webmcp: string;
  readonly capabilities: readonly InspectorCapability[];
  /** The capability shown: the one picked, else the first. */
  readonly selected: string;
  /** Its schema as JSON, or the reason there is none. */
  readonly schema: string;
  /** Whether {@link schema} is JSON a reader can copy. */
  readonly copyable: boolean;
}

/** Bytes as something a reader can compare at a glance. */
function readableBytes(bytes: number): string {
  return bytes < 1024
    ? `${String(bytes)} B`
    : `${(bytes / 1024).toFixed(1)} kB`;
}

/**
 * What one turn carries, in bytes and tokens; the token count says when it
 * is an estimate.
 */
function sentEachTurn(
  selection: NonNullable<AgentContext["selection"]>
): string {
  const bytes = readableBytes(selection.contractBytes + selection.viewBytes);
  const tokens = String(selection.estimatedTokens);
  const qualifier = selection.estimated ? " (estimated)" : "";
  return `${bytes} · about ${tokens} tokens${qualifier}`;
}

/**
 * A contract version a reader can compare without scrolling: the version is
 * the whole contract serialized, so it is hashed for display.
 */
function shorten(version: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < version.length; index += 1) {
    hash ^= version.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

/**
 * The inspector's content.
 *
 * @param context - The context a turn would carry, or null.
 * @param manifest - The manifest the table last published.
 * @param picked - The capability the reader picked, or empty.
 * @param webmcpNames - Tool names registered with the browser.
 * @param hasSession - Whether the table has published a session.
 * @returns What to draw.
 */
export function inspectorView(
  context: AgentContext | null,
  manifest: AgentManifest | null | undefined,
  picked: string,
  webmcpNames: readonly string[],
  hasSession: boolean
): InspectorView {
  const capabilities = context?.contract.capabilities ?? [];
  const selection = context?.selection;
  const deferred = selection?.deferred ?? [];
  const selected =
    capabilities.find((entry) => entry.key === picked)?.key ??
    capabilities[0]?.key ??
    "";
  const guide = capabilities.find((entry) => entry.key === selected);
  const schema = guide
    ? JSON.stringify(
        {
          key: guide.key,
          summary: guide.summary,
          ...(guide.guide ? { guide: guide.guide } : {}),
          ...(guide.input ? { input: guide.input } : {}),
        },
        null,
        2
      )
    : "";
  const sampled = (context?.contract.columns ?? []).filter(
    (column) => column.sampled
  );
  return {
    revision: `Revision ${manifest?.viewRevision ?? "—"} · ${String(capabilities.length)} capabilities wired`,
    version: context ? shorten(context.contract.version) : "—",
    sent: selection ? sentEachTurn(selection) : "—",
    upfront: selection ? selection.selected.join(", ") || "none" : "—",
    deferred:
      deferred.length > 0
        ? deferred.map((entry) => entry.key).join(", ")
        : "none",
    notes: selection?.notes ?? [],
    sampling:
      sampled.length > 0
        ? `Live values sampled for ${sampled.map((column) => column.label).join(", ")}. Everything else shows the examples the author wrote.`
        : "No column values are sampled. A column's examples are what its author wrote; nothing here reads a row to build the contract.",
    webmcp:
      webmcpNames.length > 0
        ? `Registered as browser tools: ${webmcpNames.join(", ")}`
        : "Not registered as browser tools.",
    capabilities: capabilities.map((entry) => ({
      key: entry.key,
      label: deferred.some((left) => left.key === entry.key)
        ? `${entry.key}${INSPECTOR_TEXT.onDemand}`
        : entry.key,
    })),
    selected,
    schema:
      schema ||
      (hasSession ? INSPECTOR_TEXT.fetchedOnDemand : INSPECTOR_TEXT.noSession),
    copyable: schema !== "",
  };
}
