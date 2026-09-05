/**
 * Shared Connect-backend chrome for every adapter AI page.
 *
 * Simulated mode never calls this. Connect sends one hello; Send runs a
 * turn through the live table session. Keys stay on the backend.
 */
import type {
  AgentSession,
  ExecuteResult,
  WriteExecuteResult,
} from "@adapttable/ai";
import {
  type AgentHttpMessage,
  type AgentHttpTurnResult,
  createAgentHttpClient,
} from "@adapttable/ai/http";
import { useEffect, useRef, useState } from "react";

import { DOCS_URL } from "./matrix/content";
import { focusRovingRadio, moveRovingRadioIndex } from "./rovingRadio";

export type AiPlayMode = "simulated" | "backend";

interface AiBackendConnectProps {
  readonly session: AgentSession | null;
  readonly mode: AiPlayMode;
  readonly onFilterCore?: () => void;
  readonly onClearFilter?: () => void;
}

function isWriteResult(value: unknown): value is WriteExecuteResult {
  return (
    typeof value === "object" &&
    value !== null &&
    "approval" in value &&
    typeof (value as WriteExecuteResult).approval === "string"
  );
}

function outcomeLine(result: ExecuteResult): string {
  if (!result.ok) {
    return `${result.idempotencyKey} failed · ${result.error?.message ?? result.error?.code ?? "error"}`;
  }
  if (isWriteResult(result.result)) {
    const write = result.result;
    const parts = [result.idempotencyKey, write.approval];
    if (write.approval === "cancelled") parts.push("cancelled");
    else if (write.approval === "rejected") parts.push("rejected");
    else if (write.approval === "approved" && write.applied)
      parts.push("applied");
    else if (write.approval === "approved" && !write.applied)
      parts.push("staged");
    else if (write.approval === "not-required" && write.applied)
      parts.push("applied");
    if (write.results?.some((row) => !row.ok)) parts.push("partial");
    return parts.join(" · ");
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
  const groupRef = useRef<HTMLDivElement>(null);
  const modes: AiPlayMode[] = ["simulated", "backend"];

  const onKeyDown = (event: React.KeyboardEvent) => {
    const next = moveRovingRadioIndex(event, modes.length, modes.indexOf(mode));
    if (next === undefined) return;
    event.preventDefault();
    onMode(modes[next]);
    focusRovingRadio(groupRef.current, next);
  };

  return (
    <div
      ref={groupRef}
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
        // Roving tabindex: the checked radio is the group's tab stop.
        tabIndex={mode === "simulated" ? 0 : -1}
        onClick={() => onMode("simulated")}
        onKeyDown={onKeyDown}
      >
        Simulated
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={mode === "backend"}
        className={`seg__btn${mode === "backend" ? " is-on" : ""}`}
        data-testid="ai-mode-backend"
        tabIndex={mode === "backend" ? 0 : -1}
        onClick={() => onMode("backend")}
        onKeyDown={onKeyDown}
      >
        Connect backend
      </button>
    </div>
  );
}

export function AiBackendConnect({
  session,
  mode,
  onFilterCore,
  onClearFilter,
}: AiBackendConnectProps) {
  const [endpoint, setEndpoint] = useState("http://127.0.0.1:8787");
  const [endpointToken, setEndpointToken] = useState("");
  const [status, setStatus] = useState<
    "idle" | "connecting" | "ready" | "processing" | "error"
  >("idle");
  const [liveMessage, setLiveMessage] = useState("");
  const [notice, setNotice] = useState("");
  const [draft, setDraft] = useState("");
  const [lines, setLines] = useState<string[]>([]);
  const [conversation, setConversation] = useState<AgentHttpMessage[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const clientRef = useRef<ReturnType<typeof createAgentHttpClient> | null>(
    null
  );
  const generationRef = useRef(0);

  const announce = (message: string) => {
    setLiveMessage(message);
  };

  const resetWork = (clearCredentials: boolean) => {
    generationRef.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;
    clientRef.current = null;
    setStatus("idle");
    setNotice("");
    setLines([]);
    setConversation([]);
    setDraft("");
    if (clearCredentials) setEndpointToken("");
  };

  useEffect(
    () => () => {
      abortRef.current?.abort();
    },
    []
  );

  useEffect(() => {
    if (mode !== "backend") resetWork(false);
  }, [mode]);

  const disconnect = () => {
    resetWork(true);
    announce("Disconnected from backend.");
  };

  const connect = async () => {
    if (!session) {
      setStatus("error");
      setNotice("Table session is not attached yet.");
      announce("Connection failed. Table session is not attached.");
      return;
    }
    const url = endpoint.trim();
    if (!url) return;
    const generation = generationRef.current + 1;
    generationRef.current = generation;
    setStatus("connecting");
    setNotice("");
    announce("Connecting to backend.");
    abortRef.current?.abort();
    const pending = new AbortController();
    abortRef.current = pending;
    try {
      const token = endpointToken.trim();
      const client = createAgentHttpClient({
        endpoint: url,
        timeoutMs: 20_000,
        ...(token ? { headers: { authorization: `Bearer ${token}` } } : {}),
      });
      const hello = await client.connect(session, pending.signal);
      if (generation !== generationRef.current) return;
      clientRef.current = client;
      setStatus("ready");
      const text = hello.text ?? "Connected.";
      setNotice(text);
      announce(`Connected. ${text}`);
      setLines([]);
      setConversation([]);
    } catch (error) {
      if (generation !== generationRef.current) return;
      clientRef.current = null;
      setStatus("error");
      const message = error instanceof Error ? error.message : String(error);
      setNotice(message);
      announce(`Connection failed. ${message}`);
    }
  };

  const send = async () => {
    const client = clientRef.current;
    if (!session || !client || status !== "ready") return;
    const message = draft.trim();
    if (!message) return;
    const generation = generationRef.current + 1;
    generationRef.current = generation;
    abortRef.current?.abort();
    const pending = new AbortController();
    abortRef.current = pending;
    setDraft("");
    setStatus("processing");
    announce("Sending message to backend.");
    setLines((current) => [...current, `You · ${message}`]);
    const prior = conversation;
    try {
      const result: AgentHttpTurnResult = await client.send(session, message, {
        signal: pending.signal,
        returnResults: true,
        conversation: prior,
      });
      if (generation !== generationRef.current) return;
      const assistant = result.text || "(no text)";
      const outcomes = result.results.map(outcomeLine);
      setConversation([
        ...prior,
        { role: "user", text: message },
        { role: "assistant", text: assistant },
      ]);
      setLines((current) => [
        ...current,
        `Assistant · ${assistant}`,
        ...outcomes.map((line) => `Action · ${line}`),
      ]);
      setStatus("ready");
      announce(
        outcomes.length
          ? `Assistant replied. ${String(outcomes.length)} action receipt(s).`
          : `Assistant replied. ${assistant}`
      );
    } catch (error) {
      if (generation !== generationRef.current) return;
      const messageText =
        error instanceof Error ? error.message : String(error);
      setLines((current) => [...current, `Error · ${messageText}`]);
      setStatus("ready");
      announce(`Request failed. ${messageText}`);
    } finally {
      if (generation === generationRef.current) abortRef.current = null;
    }
  };

  const cancel = () => {
    generationRef.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;
    if (status === "processing" || status === "connecting") {
      setStatus(status === "connecting" ? "idle" : "ready");
      announce("Request cancelled.");
      setLines((current) => [...current, "System · Request cancelled."]);
    }
  };

  if (mode !== "backend") return null;

  return (
    <div className="ai-play__backend" data-testid="ai-backend">
      <div className="visually-hidden" aria-live="polite" aria-atomic="true">
        {liveMessage}
      </div>
      <p className="ai-play__note">
        Messages and permitted table context go to the endpoint you connect.
        Provider keys stay on that server. Endpoint token is the backend Bearer
        (`AGENT_HTTP_TOKEN`), not a model key.{" "}
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
            disabled={
              status === "ready" ||
              status === "connecting" ||
              status === "processing"
            }
            onChange={(event) => setEndpoint(event.target.value)}
          />
        </label>
        <label className="ai-play__field">
          <span>Endpoint token</span>
          <input
            type="password"
            value={endpointToken}
            autoComplete="off"
            data-testid="ai-backend-token"
            disabled={
              status === "ready" ||
              status === "connecting" ||
              status === "processing"
            }
            placeholder="AGENT_HTTP_TOKEN (Bearer)"
            onChange={(event) => setEndpointToken(event.target.value)}
          />
        </label>
        {status === "ready" || status === "processing" ? (
          <button
            type="button"
            className="ai-play__btn"
            data-testid="ai-backend-disconnect"
            disabled={status === "processing"}
            onClick={disconnect}
          >
            Disconnect
          </button>
        ) : (
          <>
            <button
              type="button"
              className="ai-play__btn"
              data-testid="ai-backend-connect"
              disabled={!endpoint.trim() || !session || status === "connecting"}
              onClick={() => void connect()}
            >
              {status === "connecting" ? "Connecting…" : "Connect"}
            </button>
            {/* A connect that never answers has to be abandonable. */}
            {status === "connecting" ? (
              <button
                type="button"
                className="ai-play__btn"
                data-testid="ai-backend-cancel-connect"
                onClick={cancel}
              >
                Cancel
              </button>
            ) : null}
          </>
        )}
      </div>
      {notice ? (
        <p className="ai-play__note" data-testid="ai-backend-notice">
          {notice}
        </p>
      ) : null}
      {status === "error" ? (
        <div className="ai-play__actions">
          <button
            type="button"
            className="ai-play__btn"
            data-testid="ai-backend-retry"
            onClick={() => void connect()}
          >
            Retry connection
          </button>
        </div>
      ) : null}
      {/*
        These two drive the LIVE session directly, not the backend, so they
        work in backend mode before a connection exists — and stay put while
        one is in flight. Only the message exchange below needs a connection.
      */}
      <div className="ai-play__actions">
        <button
          type="button"
          className="ai-play__btn"
          data-testid="ai-backend-filter-core"
          disabled={status === "processing"}
          onClick={onFilterCore}
        >
          Filter Core team
        </button>
        <button
          type="button"
          className="ai-play__btn"
          data-testid="ai-backend-clear-filter"
          disabled={status === "processing"}
          onClick={onClearFilter}
        >
          Clear filter
        </button>
      </div>
      {status === "ready" || status === "processing" ? (
        <div className="ai-play__chat">
          <label className="ai-play__field">
            <span>Message</span>
            <input
              type="text"
              value={draft}
              data-testid="ai-backend-message"
              disabled={status === "processing"}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && status === "ready") void send();
              }}
            />
          </label>
          <button
            type="button"
            className="ai-play__btn"
            data-testid="ai-backend-send"
            disabled={!draft.trim() || status === "processing"}
            onClick={() => void send()}
          >
            {status === "processing" ? "Sending…" : "Send"}
          </button>
          <button
            type="button"
            className="ai-play__btn"
            data-testid="ai-backend-cancel"
            disabled={status !== "processing"}
            onClick={cancel}
          >
            Cancel
          </button>
          <ol className="ai-play__log" data-testid="ai-backend-log">
            {lines.length === 0 ? (
              <li data-testid="ai-backend-log-empty">
                Send a message to start a turn.
              </li>
            ) : (
              lines.map((line, index) => (
                <li key={`${String(index)}:${line}`}>{line}</li>
              ))
            )}
          </ol>
        </div>
      ) : null}
    </div>
  );
}
