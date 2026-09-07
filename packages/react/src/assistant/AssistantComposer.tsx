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

import { SendIcon, StopIcon } from "./assistantIcons";
import type { TableAssistantSlots } from "./assistantSlots";
import { assistantIsBusy, assistantIsUsable } from "./assistantView";

/** Props for {@link AssistantComposer}. @internal */
export interface AssistantComposerProps {
  readonly slots: TableAssistantSlots;
  readonly labels: TableLabels | undefined;
  readonly status: string;
  readonly draft: string;
  readonly setDraft: (draft: string) => void;
  readonly onSend: () => void;
  readonly onStop: () => void;
}

/** The sticky bottom composer. @internal */
export function AssistantComposer({
  slots,
  labels,
  status,
  draft,
  setDraft,
  onSend,
  onStop,
}: AssistantComposerProps): ReactElement {
  const busy = assistantIsBusy(status);
  const usable = assistantIsUsable(status);
  const Composer = slots.Composer;
  const Button = slots.Button;

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
