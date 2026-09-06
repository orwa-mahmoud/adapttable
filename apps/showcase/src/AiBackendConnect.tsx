/**
 * Where the conversation goes: this page's script, or your own backend.
 *
 * The demo is scripted and says so. Connecting is a deliberate act — nothing
 * here reaches the network until Connect is pressed, no credential is stored
 * anywhere, and the field asks for YOUR endpoint's token, never a provider
 * key. Model keys belong on the backend; this page never sees one.
 */
import type { AgentSession, AssistantTransport } from "@adapttable/ai";
import { assistantHttpTransport, connectAgentHttp } from "@adapttable/ai/http";
import { useId, useState } from "react";

import { DOCS_URL } from "./matrix/content";

/** Which transport the conversation is using. @internal */
export type AiPlayMode = "simulated" | "backend";

/** A connected endpoint, or nothing. @internal */
export interface AiConnection {
  readonly mode: AiPlayMode;
  readonly endpoint?: string;
  readonly transport: AssistantTransport;
  /** Changes only when the transport is genuinely swapped. */
  readonly key: string;
}

interface AiConnectionSettingsProps {
  readonly session: AgentSession | null;
  readonly connection: AiConnection;
  readonly demoTransport: AssistantTransport;
  readonly onChange: (connection: AiConnection) => void;
  readonly onClose: () => void;
}

/**
 * Connection settings, opened from the assistant's own status badge.
 *
 * @internal
 */
export function AiConnectionSettings({
  session,
  connection,
  demoTransport,
  onChange,
  onClose,
}: Readonly<AiConnectionSettingsProps>) {
  const endpointId = useId();
  const tokenId = useId();
  const [endpoint, setEndpoint] = useState(
    connection.endpoint ?? "http://127.0.0.1:8787"
  );
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const connect = async (): Promise<void> => {
    if (!session) {
      setError("The table has not published a session yet.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      // One handshake, so a wrong endpoint is reported here rather than on
      // the reader's first question.
      const options = {
        endpoint,
        ...(token ? { headers: { authorization: `Bearer ${token}` } } : {}),
      };
      await connectAgentHttp(session, options);
      onChange({
        mode: "backend",
        endpoint,
        transport: assistantHttpTransport(options),
        key: `backend:${endpoint}`,
      });
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  };

  const disconnect = (): void => {
    // The token was only ever held in this form's state; dropping back to the
    // scripted transport leaves nothing behind that could reach the network.
    setToken("");
    onChange({
      mode: "simulated",
      transport: demoTransport,
      key: "demo",
    });
    onClose();
  };

  return (
    <section className="ai-conn" aria-label="Assistant connection">
      <p className="ai-conn__now">
        {connection.mode === "simulated" ? (
          <>
            <strong>Scripted demo · no model connected</strong>
            <span>
              The example requests below run real table operations. Nothing is
              sent anywhere.
            </span>
          </>
        ) : (
          <>
            <strong>Connected</strong>
            <span>{connection.endpoint}</span>
          </>
        )}
      </p>

      {connection.mode === "backend" ? (
        <button type="button" className="ai-conn__btn" onClick={disconnect}>
          Disconnect
        </button>
      ) : (
        <form
          className="ai-conn__form"
          onSubmit={(event) => {
            event.preventDefault();
            void connect();
          }}
        >
          <label htmlFor={endpointId}>Your endpoint</label>
          <input
            id={endpointId}
            type="url"
            value={endpoint}
            onChange={(event) => {
              setEndpoint(event.target.value);
            }}
          />
          <label htmlFor={tokenId}>Endpoint token (optional)</label>
          <input
            id={tokenId}
            type="password"
            autoComplete="off"
            value={token}
            placeholder="Your endpoint's own token — never a provider key"
            onChange={(event) => {
              setToken(event.target.value);
            }}
          />
          <p className="ai-conn__note">
            Your endpoint receives the table&apos;s capability list, its column
            names and the rows you ask about — never a cell the table marks
            unreadable. Model credentials stay on your backend.{" "}
            <a href={`${DOCS_URL}ai-http/`}>Run the local example</a>.
          </p>
          {error ? (
            <p className="ai-conn__error" role="alert">
              {error}
            </p>
          ) : null}
          <span className="ai-conn__row">
            <button type="submit" className="ai-conn__btn" disabled={busy}>
              {busy ? "Connecting…" : "Connect"}
            </button>
            <button type="button" className="ai-conn__btn" onClick={onClose}>
              Cancel
            </button>
          </span>
        </form>
      )}
    </section>
  );
}
