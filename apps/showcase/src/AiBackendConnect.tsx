/**
 * Shared Connect-backend chrome for every adapter AI page.
 *
 * Simulated mode never calls this. Connect sends one hello; Send runs a
 * turn through the live table session. Keys stay on the backend.
 */
import type { AgentSession, ExecuteResult } from "@adapttable/ai";
import {
  type AgentHttpTurnResult,
  createAgentHttpClient,
} from "@adapttable/ai/http";
import { useEffect, useRef, useState } from "react";

import { DOCS_URL } from "./matrix/content";

export type AiPlayMode = "simulated" | "backend";

interface AiBackendConnectProps {
  readonly session: AgentSession | null;
  readonly mode: AiPlayMode;
}

function outcomeLine(result: ExecuteResult): string {
  if (!result.ok) {
    return `${result.idempotencyKey} failed · ${result.error?.message ?? result.error?.code}`;
  }
  return `${result.idempotencyKey} ok`;
}

export function AiModeSwitch({
  mode,
  onMode,
}: {
  readonly mode: AiPlayMode;
  readonly onMode: (mode: AiPlayMode) => void;
}) {
  return (
    <div
      className="ai-play__modes"
      role="radiogroup"
      aria-label="Playground mode"
      data-testid="ai-mode"
    >
      <button
        type="button"
        role="radio"
        aria-checked={mode === "simulated"}
        className={`seg__btn${mode === "simulated" ? " is-on" : ""}`}
        data-testid="ai-mode-simulated"
        onClick={() => onMode("simulated")}
      >
        Simulated
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={mode === "backend"}
        className={`seg__btn${mode === "backend" ? " is-on" : ""}`}
        data-testid="ai-mode-backend"
        onClick={() => onMode("backend")}
      >
        Connect backend
      </button>
    </div>
  );
}

export function AiBackendConnect({ session, mode }: AiBackendConnectProps) {
  const [endpoint, setEndpoint] = useState("http://127.0.0.1:8787");
  const [status, setStatus] = useState<
    "idle" | "connecting" | "ready" | "error"
  >("idle");
  const [notice, setNotice] = useState("");
  const [draft, setDraft] = useState("");
  const [lines, setLines] = useState<string[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const clientRef = useRef<ReturnType<typeof createAgentHttpClient> | null>(
    null
  );

  useEffect(
    () => () => {
      abortRef.current?.abort();
    },
    []
  );

  const disconnect = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    clientRef.current = null;
    setStatus("idle");
    setNotice("");
    setLines([]);
  };

  const connect = async () => {
    if (!session) {
      setStatus("error");
      setNotice("Table session is not attached yet.");
      return;
    }
    const url = endpoint.trim();
    if (!url) return;
    setStatus("connecting");
    setNotice("");
    abortRef.current?.abort();
    const pending = new AbortController();
    abortRef.current = pending;
    try {
      const client = createAgentHttpClient({
        endpoint: url,
        timeoutMs: 20_000,
      });
      const hello = await client.connect(session, pending.signal);
      clientRef.current = client;
      setStatus("ready");
      setNotice(hello.text ?? "Connected.");
      setLines([]);
    } catch (error) {
      clientRef.current = null;
      setStatus("error");
      setNotice(error instanceof Error ? error.message : String(error));
    }
  };

  const send = async () => {
    const client = clientRef.current;
    if (!session || !client || status !== "ready") return;
    const message = draft.trim();
    if (!message) return;
    abortRef.current?.abort();
    const pending = new AbortController();
    abortRef.current = pending;
    setDraft("");
    setLines((current) => [...current, `You · ${message}`]);
    try {
      const result: AgentHttpTurnResult = await client.send(session, message, {
        signal: pending.signal,
      });
      const outcomes = result.results.map(outcomeLine);
      setLines((current) => [
        ...current,
        `Assistant · ${result.text || "(no text)"}`,
        ...outcomes.map((line) => `Action · ${line}`),
      ]);
    } catch (error) {
      setLines((current) => [
        ...current,
        `Error · ${error instanceof Error ? error.message : String(error)}`,
      ]);
    }
  };

  if (mode !== "backend") return null;

  return (
    <div className="ai-play__backend" data-testid="ai-backend">
      <p className="ai-play__note">
        Messages and permitted table context go to the endpoint you connect.
        Provider keys stay on that server.{" "}
        <a href={`${DOCS_URL}ai-http/`}>Connect a backend</a>
      </p>
      <div className="ai-play__actions">
        <label className="ai-play__field">
          <span>Endpoint URL</span>
          <input
            type="url"
            value={endpoint}
            autoComplete="off"
            data-testid="ai-backend-url"
            disabled={status === "ready" || status === "connecting"}
            onChange={(event) => setEndpoint(event.target.value)}
          />
        </label>
        {status === "ready" ? (
          <button
            type="button"
            className="ai-play__btn"
            data-testid="ai-backend-disconnect"
            onClick={disconnect}
          >
            Disconnect
          </button>
        ) : (
          <button
            type="button"
            className="ai-play__btn"
            data-testid="ai-backend-connect"
            disabled={!endpoint.trim() || !session || status === "connecting"}
            onClick={() => void connect()}
          >
            {status === "connecting" ? "Connecting…" : "Connect"}
          </button>
        )}
      </div>
      {notice ? (
        <p className="ai-play__note" data-testid="ai-backend-notice">
          {notice}
        </p>
      ) : null}
      {status === "ready" ? (
        <div className="ai-play__chat">
          <label className="ai-play__field">
            <span>Message</span>
            <input
              type="text"
              value={draft}
              data-testid="ai-backend-message"
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void send();
              }}
            />
          </label>
          <button
            type="button"
            className="ai-play__btn"
            data-testid="ai-backend-send"
            disabled={!draft.trim()}
            onClick={() => void send()}
          >
            Send
          </button>
          <button
            type="button"
            className="ai-play__btn"
            data-testid="ai-backend-cancel"
            onClick={() => abortRef.current?.abort()}
          >
            Cancel
          </button>
          <ol className="ai-play__log" data-testid="ai-backend-log">
            {lines.map((line, index) => (
              <li key={`${String(index)}:${line}`}>{line}</li>
            ))}
          </ol>
        </div>
      ) : null}
    </div>
  );
}
