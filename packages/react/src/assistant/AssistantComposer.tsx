/**
 * The composer, and the one keyboard contract the panel owns.
 *
 * Enter sends and Shift+Enter starts a line. The exception that matters is an
 * IME: while a Japanese, Chinese or Korean reader is composing, Enter is
 * choosing a candidate, and treating it as Send would post a half-written
 * word. `isComposing` is the only reliable signal for that, so it is checked
 * before anything else.
 */
import type { TableLabels } from "@adapttable/core";
import type { KeyboardEvent, ReactElement } from "react";

import { LiveRegion } from "../a11y/LiveRegion";

import { MicIcon, SendIcon, StopIcon } from "./assistantIcons";
import type { TableAssistantSlots } from "./assistantSlots";
import type { SpeechInputHandle } from "./useSpeechInput";
import { assistantIsBusy, assistantIsUsable } from "./assistantView";

/** Props for {@link AssistantComposer}. @internal */
export interface AssistantComposerProps {
  readonly slots: TableAssistantSlots;
  readonly labels: TableLabels | undefined;
  readonly status: string;
  /** Whether a turn is in flight. Falls back to the status when absent. */
  readonly busy?: boolean;
  readonly draft: string;
  readonly setDraft: (draft: string) => void;
  readonly onSend: () => void;
  readonly onStop: () => void;
  /** Dictation, when the host turned it on and this browser can do it. */
  readonly speech?: SpeechInputHandle;
}

/** The sticky bottom composer. @internal */
export function AssistantComposer({
  slots,
  labels,
  status,
  busy: busyProp,
  draft,
  setDraft,
  onSend,
  onStop,
  speech,
}: AssistantComposerProps): ReactElement {
  // A parked approval is still a turn: the host says so with `busy`, and
  // without it the status is the only signal there is.
  const busy = busyProp ?? assistantIsBusy(status);
  const usable = assistantIsUsable(status);
  const Composer = slots.Composer;
  const Button = slots.Button;
  const LanguageChip = slots.LanguageChip;
  const listening = speech?.state.status === "listening";
  const micLabel = listening
    ? (labels?.assistantVoiceStop ?? "Stop dictation")
    : (labels?.assistantVoiceStart ?? "Dictate");
  // A chip for one language is a question with one answer.
  const showChip =
    speech?.available === true &&
    speech.languages.length > 1 &&
    LanguageChip !== undefined;

  const onKeyDown = (event: KeyboardEvent<HTMLElement>): void => {
    if (event.key !== "Enter") return;
    // Mid-composition Enter belongs to the IME, not to Send.
    if (event.nativeEvent.isComposing) return;
    if (event.shiftKey) return;
    event.preventDefault();
    if (!busy) onSend();
  };

  return (
    <div
      data-adapttable-part="assistant-composer"
      style={{
        display: "flex",
        alignItems: "flex-end",
        gap: "0.35em",
        padding: "0.35em 0.35em 0.35em 0.6em",
        borderRadius: "1.1em",
        border: "1px solid currentColor",
        borderColor: "color-mix(in srgb, currentColor 22%, transparent)",
        background: "color-mix(in srgb, currentColor 3%, transparent)",
        position: "sticky",
        insetBlockEnd: 0,
        flexShrink: 0,
      }}
    >
      {/* Announced once when it starts, not on every interim result: a screen
          reader repeating every word heard is unusable. */}
      <LiveRegion
        message={
          listening ? (labels?.assistantVoiceListening ?? "Listening") : ""
        }
      />
      {/* The input takes the room that is left. Without `minWidth: 0` a
          textarea's intrinsic width wins the flex negotiation and pushes Send
          off the end of a 400px window. */}
      <span style={{ flex: "1 1 auto", minWidth: 0, display: "flex" }}>
        <Composer
          label={labels?.assistantPlaceholder ?? "Ask about this table…"}
          placeholder={labels?.assistantPlaceholder ?? "Ask about this table…"}
          part="assistant-input"
          value={draft}
          disabled={!usable}
          onChange={setDraft}
          onKeyDown={onKeyDown}
        />
      </span>
      {showChip && LanguageChip ? (
        <LanguageChip
          label={labels?.assistantVoiceLanguage ?? "Dictation language"}
          value={speech.state.language}
          options={speech.languages.map((value) => ({ value, label: value }))}
          part="assistant-voice-language"
          disabled={listening}
          onChange={speech.setLanguage}
        />
      ) : null}
      {speech?.available ? (
        <Button
          label={micLabel}
          tooltip={micLabel}
          part="assistant-voice"
          variant={listening ? "primary" : "subtle"}
          icon={<MicIcon listening={listening} />}
          iconOnly
          disabled={!usable}
          onClick={listening ? speech.stop : speech.start}
        />
      ) : null}
      {busy ? (
        <Button
          label={labels?.assistantStop ?? "Stop"}
          tooltip={labels?.assistantStop ?? "Stop"}
          part="assistant-stop"
          variant="secondary"
          icon={<StopIcon />}
          iconOnly
          onClick={onStop}
        />
      ) : (
        <Button
          label={labels?.assistantSend ?? "Send"}
          tooltip={labels?.assistantSend ?? "Send"}
          part="assistant-send"
          variant="primary"
          icon={<SendIcon />}
          iconOnly
          disabled={!usable || draft.trim() === ""}
          onClick={onSend}
        />
      )}
    </div>
  );
}
