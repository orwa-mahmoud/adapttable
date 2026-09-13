/**
 * What the agent is actually told about this table.
 *
 * The developer's half of the page: the permitted contract as it stands right
 * now, what each turn would carry, and the schema for one capability. It is
 * the same `buildAgentContext` a backend receives — not a description of it —
 * so a reader comparing this against their own integration is comparing like
 * with like.
 *
 * Always LTR. The table beside it may be Arabic and mirrored; a JSON schema
 * read right-to-left is not a demonstration of anything.
 *
 * One inspector. `AiDemo` portals this into the documentation column rather
 * than rendering a second copy, because two would mean two subscriptions to
 * one session.
 */
import {
  type AgentContext,
  type AgentContextInputs,
  type AgentManifest,
  type AgentSession,
  buildAgentContext,
} from "@adapttable/ai";
import { useMemo, useState } from "react";

import type { DemoContextProfile } from "./AiDemoOptions";

/** Props for {@link AiContextInspector}. */
export interface AiContextInspectorProps {
  /** The live session, or nothing before the table has published one. */
  readonly session: AgentSession | null;
  /** The manifest the table last published. */
  readonly manifest: AgentManifest | null;
  /** Live view and filter state, read fresh on every render. */
  readonly contextInputs: () => AgentContextInputs;
  /** How much of the contract a turn carries. */
  readonly profile: DemoContextProfile;
  /** Tool names registered with the browser, when that is on. */
  readonly webmcpNames: readonly string[];
  /** Where the reference pages live. */
  readonly docsUrl: string;
}

/** Bytes as something a reader can compare at a glance. */
function readableBytes(bytes: number): string {
  return bytes < 1024
    ? `${String(bytes)} B`
    : `${(bytes / 1024).toFixed(1)} kB`;
}

/**
 * What one turn actually carries, in bytes and in tokens.
 *
 * The token count is the estimate the selection reports, and says so when it
 * is one — a reader comparing profiles needs to know which number is measured.
 */
function sentEachTurn(
  selection: NonNullable<AgentContext["selection"]>
): string {
  const bytes = readableBytes(selection.contractBytes + selection.viewBytes);
  const tokens = String(selection.estimatedTokens);
  const qualifier = selection.estimated ? " (estimated)" : "";
  return `${bytes} · about ${tokens} tokens${qualifier}`;
}

/** The contract, or why there is not one yet. */
function useContext(
  session: AgentSession | null,
  inputs: () => AgentContextInputs,
  profile: DemoContextProfile,
  revision: number | undefined
): AgentContext | null {
  return useMemo(() => {
    if (!session) return null;
    return buildAgentContext(session, { profile }, inputs());
    // Rebuilt when the table moves or the profile changes. `inputs` is read
    // inside, so it is deliberately not a dependency — a new closure every
    // render would rebuild the contract every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, profile, revision]);
}

/** The developer inspector. */
export function AiContextInspector({
  session,
  manifest,
  contextInputs,
  profile,
  webmcpNames,
  docsUrl,
}: Readonly<AiContextInspectorProps>) {
  const context = useContext(
    session,
    contextInputs,
    profile,
    manifest?.viewRevision
  );
  const capabilities = context?.contract.capabilities ?? [];
  const [selectedKey, setSelectedKey] = useState("");
  const selected =
    capabilities.find((entry) => entry.key === selectedKey)?.key ??
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
  const selection = context?.selection;
  const deferred = selection?.deferred ?? [];
  const sampled = (context?.contract.columns ?? []).filter(
    (column) => column.sampled
  );

  return (
    <section className="ai-demo__dev" data-testid="ai-inspector" dir="ltr">
      <h3 className="ai-demo__dev-title">Developer inspector</h3>
      <p className="ai-demo__revision">
        Revision {manifest?.viewRevision ?? "—"} · {capabilities.length}{" "}
        capabilities wired
      </p>

      <dl className="ai-demo__facts" data-testid="ai-context-facts">
        <div>
          <dt>Contract version</dt>
          {/* The whole contract, named. Two tables with the same version are
              the same table as far as an agent is concerned. */}
          <dd>
            <code data-testid="ai-contract-version">
              {context ? shorten(context.contract.version) : "—"}
            </code>
          </dd>
        </div>
        <div>
          <dt>Sent each turn</dt>
          <dd data-testid="ai-context-size">
            {selection ? sentEachTurn(selection) : "—"}
          </dd>
        </div>
        <div>
          <dt>Explained up front</dt>
          <dd data-testid="ai-context-upfront">
            {selection ? selection.selected.join(", ") || "none" : "—"}
          </dd>
        </div>
        <div>
          <dt>Asked for on demand</dt>
          <dd data-testid="ai-context-deferred">
            {deferred.length > 0
              ? deferred.map((entry) => entry.key).join(", ")
              : "none"}
          </dd>
        </div>
      </dl>

      {selection?.notes && selection.notes.length > 0 ? (
        <ul className="ai-demo__notes" data-testid="ai-context-notes">
          {selection.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      ) : null}

      <p className="ai-demo__note" data-testid="ai-sampling-note">
        {sampled.length > 0
          ? `Live values sampled for ${sampled.map((column) => column.label).join(", ")}. Everything else shows the examples the author wrote.`
          : "No column values are sampled. A column's examples are what its author wrote; nothing here reads a row to build the contract."}
      </p>

      <p className="ai-demo__note" data-testid="ai-webmcp-tools">
        {webmcpNames.length > 0
          ? `Registered as browser tools: ${webmcpNames.join(", ")}`
          : "Not registered as browser tools."}
      </p>

      <label className="ai-demo__pick">
        <span>Capability</span>
        <select
          data-testid="ai-catalog"
          value={selected}
          onChange={(event) => {
            setSelectedKey(event.target.value);
          }}
        >
          {capabilities.length === 0 ? (
            <option value="">No capabilities wired</option>
          ) : null}
          {capabilities.map((entry) => (
            <option key={entry.key} value={entry.key}>
              {entry.key}
              {deferred.some((left) => left.key === entry.key)
                ? " (on demand)"
                : ""}
            </option>
          ))}
        </select>
      </label>

      <div className="ai-demo__schema-wrap">
        <button
          type="button"
          className="ai-demo__copy"
          data-testid="ai-schema-copy"
          onClick={() => {
            void navigator.clipboard?.writeText(schema);
          }}
        >
          Copy
        </button>
        <pre
          className="ai-demo__schema"
          data-testid="ai-schema"
          dir="ltr"
          aria-label={`Schema for ${selected || "no capability"}`}
        >
          {schema ||
            (session
              ? "This capability's guide is fetched on demand — ask for it in the conversation and it arrives with the answer."
              : "Attach a session to inspect a capability.")}
        </pre>
      </div>

      <p className="ai-demo__refs">
        <a href={`${docsUrl}ai-http/`}>Connect a backend</a>
        <a href={`${docsUrl}ai-integrations/`}>AI integrations</a>
        <a href={`${docsUrl}agent-capabilities/`}>Capabilities</a>
      </p>
    </section>
  );
}

/**
 * A contract version a reader can compare without scrolling.
 *
 * The version is the whole contract serialized, which is what makes two of
 * them comparable; showing it whole would fill the panel.
 */
function shorten(version: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < version.length; index += 1) {
    hash ^= version.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}
