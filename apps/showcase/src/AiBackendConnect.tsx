/**
 * Where the conversation goes: this page's script, or your own backend.
 *
 * The demo is scripted and says so. Connecting is a deliberate act — nothing
 * here reaches the network until Connect is pressed, no credential is stored
 * anywhere, and the field asks for YOUR endpoint's token, never a provider
 * key. Model keys belong on the backend; this page never sees one.
 */
import type { AgentSession, AssistantTransport } from "@adapttable/ai";
import { Fragment, useEffect, useId, useRef, useState } from "react";

import {
  type AiProtocol,
  CONNECTION_STEPS,
  CONNECTION_TEXT,
  connectShowcaseBackend,
  PROTOCOLS,
  scriptedConnection,
  SHOWCASE_AI_ENDPOINT,
  type ShowcaseConnection,
} from "./aiBackendConnection";
import { docsUrl } from "./matrix/content";
import { codeSpans } from "./shared/codeSpans";

/** The conversation's transport, and where it goes. @internal */
export type AiConnection = ShowcaseConnection;

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
    connection.endpoint ?? SHOWCASE_AI_ENDPOINT
  );
  const [token, setToken] = useState("");
  const [protocol, setProtocol] = useState<AiProtocol>("http");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const connect = async (): Promise<void> => {
    if (!session) {
      setError(CONNECTION_TEXT.noSession);
      return;
    }
    setBusy(true);
    setError("");
    try {
      onChange(
        await connectShowcaseBackend(session, endpoint, token, protocol)
      );
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
    onChange(scriptedConnection(demoTransport));
    onClose();
  };

  return (
    <div className="ai-conn" aria-label="Assistant connection">
      <p className="ai-conn__now">
        {connection.mode === "simulated" ? (
          <>
            <strong>{CONNECTION_TEXT.scripted}</strong>
            <span>{CONNECTION_TEXT.scriptedHelp}</span>
          </>
        ) : (
          <>
            <strong>{CONNECTION_TEXT.connected(connection.mode)}</strong>
            <span>{connection.endpoint}</span>
          </>
        )}
      </p>

      {connection.mode === "simulated" ? (
        <ol className="ai-conn__steps">
          {CONNECTION_STEPS.map((step) => (
            <li key={step.title}>
              <strong>{step.title}</strong> <Copy text={step.body} />
            </li>
          ))}
        </ol>
      ) : null}

      {connection.mode === "simulated" ? null : (
        <button type="button" className="ai-conn__btn" onClick={disconnect}>
          {CONNECTION_TEXT.disconnect}
        </button>
      )}
      {connection.mode === "simulated" ? (
        <form
          className="ai-conn__form"
          onSubmit={(event) => {
            event.preventDefault();
            void connect();
          }}
        >
          <fieldset className="ai-conn__protocol">
            <legend>{CONNECTION_TEXT.protocol}</legend>
            {PROTOCOLS.map((option) => (
              <label key={option.value}>
                <input
                  type="radio"
                  name="ai-protocol"
                  value={option.value}
                  checked={protocol === option.value}
                  onChange={() => {
                    setProtocol(option.value);
                  }}
                />
                <span>
                  {option.label} — <Copy text={option.help} />
                </span>
              </label>
            ))}
          </fieldset>
          <label htmlFor={endpointId}>{CONNECTION_TEXT.endpoint}</label>
          <input
            id={endpointId}
            type="url"
            value={endpoint}
            onChange={(event) => {
              setEndpoint(event.target.value);
            }}
          />
          <label htmlFor={tokenId}>{CONNECTION_TEXT.token}</label>
          <input
            id={tokenId}
            type="password"
            autoComplete="off"
            value={token}
            placeholder={CONNECTION_TEXT.tokenPlaceholder}
            onChange={(event) => {
              setToken(event.target.value);
            }}
          />
          <p className="ai-conn__note">
            {CONNECTION_TEXT.note}{" "}
            <a href={docsUrl("ai-http")}>{CONNECTION_TEXT.runExample}</a>.
          </p>
          {error ? (
            <p className="ai-conn__error" role="alert">
              {error}
            </p>
          ) : null}
          <span className="ai-conn__row">
            <button type="submit" className="ai-conn__btn" disabled={busy}>
              {busy ? CONNECTION_TEXT.connecting : CONNECTION_TEXT.connect}
            </button>
            <button type="button" className="ai-conn__btn" onClick={onClose}>
              {CONNECTION_TEXT.cancel}
            </button>
          </span>
        </form>
      ) : null}
    </div>
  );
}

/** Copy with its `backticked` spans drawn as code. */
function Copy({ text }: Readonly<{ text: string }>) {
  return (
    <>
      {codeSpans(text).map((part, index) =>
        part.code ? (
          <code key={index}>{part.text}</code>
        ) : (
          <Fragment key={index}>{part.text}</Fragment>
        )
      )}
    </>
  );
}

/**
 * The connection settings as a modal.
 *
 * One dialog, reached from three places — the "Try it for real" button beside
 * the mode pill, the assistant's own settings control, and the reply a
 * scripted demo gives when it does not understand a question. A reader who
 * hits the limit of the demo should not have to go hunting for the way past
 * it.
 *
 * @internal
 */
export function AiConnectDialog({
  open,
  ...props
}: Readonly<AiConnectionSettingsProps & { open: boolean }>) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="ai-conn-dialog"
      aria-label={CONNECTION_TEXT.dialogLabel}
      // Escape dismisses it; the host owns the state, so the close has to
      // travel back rather than be swallowed by the element.
      onCancel={(event) => {
        event.preventDefault();
        props.onClose();
      }}
    >
      <header className="ai-conn-dialog__head">
        <h3>{CONNECTION_TEXT.title}</h3>
        <button
          type="button"
          className="ai-conn-dialog__close"
          aria-label="Close"
          onClick={props.onClose}
        >
          ✕
        </button>
      </header>
      <AiConnectionSettings {...props} />
    </dialog>
  );
}
