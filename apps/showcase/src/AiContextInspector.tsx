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
import type {
  AgentContextInputs,
  AgentManifest,
  AgentSession,
} from "@adapttable/ai";
import { useMemo, useState } from "react";

import type { DemoContextProfile } from "./shared/aiDemo";
import {
  inspectedContext,
  INSPECTOR_LINKS,
  INSPECTOR_TEXT,
  inspectorView,
} from "./shared/aiInspector";

/** Props for {@link AiContextInspector}. */
export interface AiContextInspectorProps {
  /** The live session, or nothing before the table has published one. */
  readonly session: AgentSession | null;
  /** The manifest the table last published. */
  readonly manifest: AgentManifest | null;
  /** Live view and filter state; a stable function, read when the contract moves. */
  readonly contextInputs: () => AgentContextInputs;
  /** How much of the contract a turn carries. */
  readonly profile: DemoContextProfile;
  /** Tool names registered with the browser, when that is on. */
  readonly webmcpNames: readonly string[];
  /** The published URL of a docs page, by its `docs/*.md` basename. */
  readonly docsUrl: (page: string) => string;
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
  // A new manifest is published only when one actually differs, so this
  // rebuilds when the contract moves and not on every render.
  const context = useMemo(
    () => inspectedContext(session, manifest, profile, contextInputs),
    [session, profile, manifest, contextInputs]
  );
  const [picked, setPicked] = useState("");
  const view = inspectorView(
    context,
    manifest,
    picked,
    webmcpNames,
    session !== null
  );

  return (
    <section className="ai-demo__dev" data-testid="ai-inspector" dir="ltr">
      <h3 className="ai-demo__dev-title">{INSPECTOR_TEXT.title}</h3>
      <p className="ai-demo__revision">{view.revision}</p>

      <dl className="ai-demo__facts" data-testid="ai-context-facts">
        <div>
          <dt>{INSPECTOR_TEXT.version}</dt>
          <dd>
            <code data-testid="ai-contract-version">{view.version}</code>
          </dd>
        </div>
        <div>
          <dt>{INSPECTOR_TEXT.sent}</dt>
          <dd data-testid="ai-context-size">{view.sent}</dd>
        </div>
        <div>
          <dt>{INSPECTOR_TEXT.upfront}</dt>
          <dd data-testid="ai-context-upfront">{view.upfront}</dd>
        </div>
        <div>
          <dt>{INSPECTOR_TEXT.deferred}</dt>
          <dd data-testid="ai-context-deferred">{view.deferred}</dd>
        </div>
      </dl>

      {view.notes.length > 0 ? (
        <ul className="ai-demo__notes" data-testid="ai-context-notes">
          {view.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      ) : null}

      <p className="ai-demo__note" data-testid="ai-sampling-note">
        {view.sampling}
      </p>

      <p className="ai-demo__note" data-testid="ai-webmcp-tools">
        {view.webmcp}
      </p>

      <label className="ai-demo__pick">
        <span>{INSPECTOR_TEXT.capability}</span>
        <select
          data-testid="ai-catalog"
          value={view.selected}
          onChange={(event) => {
            setPicked(event.target.value);
          }}
        >
          {view.capabilities.length === 0 ? (
            <option value="">{INSPECTOR_TEXT.noCapabilities}</option>
          ) : null}
          {view.capabilities.map((entry) => (
            <option key={entry.key} value={entry.key}>
              {entry.label}
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
            void navigator.clipboard?.writeText(
              view.copyable ? view.schema : ""
            );
          }}
        >
          {INSPECTOR_TEXT.copy}
        </button>
        <pre
          className="ai-demo__schema"
          data-testid="ai-schema"
          dir="ltr"
          aria-label={INSPECTOR_TEXT.schemaFor(view.selected)}
        >
          {view.schema}
        </pre>
      </div>

      <p className="ai-demo__refs">
        {INSPECTOR_LINKS.map((link) => (
          <a key={link.page} href={docsUrl(link.page)}>
            {link.label}
          </a>
        ))}
      </p>
    </section>
  );
}
