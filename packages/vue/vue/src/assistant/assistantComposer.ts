/** One composer and keyboard contract for every Vue kit. */
import { resolveLabels } from "@adapttable/core";
import {
  assistantComposerState,
  assistantIsBusy,
  assistantIsUsable,
} from "@adapttable/core/binding";
import { h } from "vue";

import type { TableAssistantProps, TableAssistantSlots } from "./contracts";
export interface AssistantComposerProps extends Pick<
  TableAssistantProps,
  "assistant" | "speech" | "labels"
> {
  readonly slots: TableAssistantSlots;
  readonly onSend?: () => void;
}
function speechButton(props: AssistantComposerProps, usable: boolean) {
  const speech = props.speech;
  if (!speech?.available) return null;
  const copy = resolveLabels(props.labels);
  const listening = speech.state.status === "listening";
  return props.slots.Button({
    label: listening ? copy.assistantVoiceStop : copy.assistantVoiceStart,
    part: "assistant-voice",
    disabled: !usable && !listening,
    onClick: listening ? speech.stop : speech.start,
  });
}
export function AssistantComposer(props: AssistantComposerProps) {
  const { assistant, speech, slots } = props;
  const copy = resolveLabels(props.labels);
  const composer = assistantComposerState(assistant);
  const busy = composer.busy ?? assistantIsBusy(assistant.status);
  const usable = assistantIsUsable(assistant.status);
  const listening = speech?.state.status === "listening";
  const onSend = props.onSend ?? composer.send;
  const send = () => {
    if (usable && !busy && assistant.draft.trim()) onSend();
  };
  return h("div", { "data-adapttable-part": "assistant-composer" }, [
    h(
      "span",
      {
        "data-adapttable-part": "assistant-voice-status",
        role: "status",
        "aria-live": "polite",
      },
      listening ? copy.assistantVoiceListening : ""
    ),
    assistant.suggestions.length
      ? slots.Menu({
          label: copy.assistantExamples,
          part: "assistant-examples-menu",
          disabled: !usable || busy,
          maxHeight: "min(22em, 50vh)",
          items: assistant.suggestions.map((item) => ({
            ...item,
            part: "assistant-examples-item",
          })),
          onSelect: (id) => {
            void assistant.runSuggestion(id);
          },
        })
      : null,
    slots.Composer({
      label: composer.answering
        ? copy.assistantAnswerLabel
        : copy.assistantPlaceholder,
      placeholder: composer.answering
        ? copy.assistantAnswerPlaceholder
        : copy.assistantPlaceholder,
      part: "assistant-input",
      value: assistant.draft,
      disabled: !usable,
      onChange: assistant.setDraft,
      onKeyDown: (event) => {
        if (event.key !== "Enter" || event.shiftKey || event.isComposing)
          return;
        event.preventDefault();
        send();
      },
    }),
    speech?.available && speech.languages.length > 1
      ? slots.LanguageChip({
          label: copy.assistantVoiceLanguage,
          value: speech.state.language,
          options: speech.languages.map((value) => ({ value, label: value })),
          part: "assistant-voice-language",
          disabled: listening,
          onChange: speech.setLanguage,
        })
      : null,
    speechButton(props, usable),
    busy
      ? slots.Button({
          label: copy.assistantStop,
          part: "assistant-stop",
          onClick: assistant.stop,
        })
      : slots.Button({
          label: composer.answering
            ? copy.assistantAnswerSend
            : copy.assistantSend,
          part: "assistant-send",
          disabled: !usable || !assistant.draft.trim(),
          onClick: send,
        }),
    speech?.state.error
      ? h(
          "p",
          { "data-adapttable-part": "assistant-voice-error", role: "alert" },
          speech.state.error
        )
      : null,
  ]);
}
AssistantComposer.props = ["assistant", "speech", "labels", "slots", "onSend"];
