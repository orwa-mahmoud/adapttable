/** One composer and keyboard contract for every Vue kit. */
import {
  ASSISTANT_EXAMPLES_ICON,
  ASSISTANT_LABELS,
  ASSISTANT_SEND_ICON,
  ASSISTANT_STOP_ICON,
  assistantComposerState,
  assistantIsBusy,
  assistantIsUsable,
  assistantMicIcon,
  resolveFeatureLabels,
} from "@adapttable/core/binding";
import { h } from "vue";

import { withProps } from "../functionalProps";
import { assistantIcon } from "./assistantIcon";
import type { TableAssistantProps, TableAssistantSlots } from "./contracts";

const ASSISTANT_GROUPS = [ASSISTANT_LABELS] as const;
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
  const copy = resolveFeatureLabels(props.labels, ASSISTANT_GROUPS);
  const listening = speech.state.status === "listening";
  return props.slots.Button({
    label: listening ? copy.assistantVoiceStop : copy.assistantVoiceStart,
    part: "assistant-voice",
    icon: assistantIcon(assistantMicIcon(listening)),
    iconOnly: true,
    variant: listening ? "primary" : "subtle",
    disabled: !usable && !listening,
    onClick: listening ? speech.stop : speech.start,
  });
}
export const AssistantComposer = /* @__PURE__ */ withProps(
  function AssistantComposer(props: AssistantComposerProps) {
    const { assistant, speech, slots } = props;
    const copy = resolveFeatureLabels(props.labels, ASSISTANT_GROUPS);
    const composer = assistantComposerState(assistant);
    const busy = composer.busy ?? assistantIsBusy(assistant.status);
    const usable = assistantIsUsable(assistant.status);
    const listening = speech?.state.status === "listening";
    const onSend = props.onSend ?? composer.send;
    const send = () => {
      if (usable && !busy && assistant.draft.trim()) onSend();
    };
    return h(
      "div",
      {
        "data-adapttable-part": "assistant-composer",
        style: {
          display: "flex",
          flexDirection: "column",
          alignItems: "stretch",
          gap: "0.35em",
          padding: "0.35em 0.35em 0.35em 0.6em",
          borderRadius: "1.1em",
          border: "1px solid color-mix(in srgb, currentColor 22%, transparent)",
          background: "color-mix(in srgb, currentColor 3%, transparent)",
          flexShrink: 0,
          minWidth: 0,
        },
      },
      [
        h(
          "div",
          {
            "data-adapttable-part": "assistant-composer-controls",
            style: {
              display: "flex",
              alignItems: "flex-end",
              gap: "0.35em",
              minWidth: 0,
            },
          },
          [
            h(
              "span",
              {
                "data-adapttable-part": "assistant-voice-status",
                role: "status",
                "aria-live": "polite",
                style: {
                  position: "absolute",
                  inlineSize: "1px",
                  blockSize: "1px",
                  overflow: "hidden",
                  clipPath: "inset(50%)",
                },
              },
              listening ? copy.assistantVoiceListening : ""
            ),
            assistant.suggestions.length
              ? slots.Menu({
                  label: copy.assistantExamples,
                  part: "assistant-examples-menu",
                  icon: assistantIcon(ASSISTANT_EXAMPLES_ICON),
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
            h(
              "span",
              {
                "data-adapttable-part": "assistant-input-container",
                style: {
                  display: "flex",
                  flexGrow: 1,
                  flexShrink: 1,
                  minWidth: 0,
                },
              },
              [
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
                    if (
                      event.key !== "Enter" ||
                      event.shiftKey ||
                      event.isComposing
                    )
                      return;
                    event.preventDefault();
                    send();
                  },
                }),
              ]
            ),
            speech?.available && speech.languages.length > 1
              ? slots.LanguageChip({
                  label: copy.assistantVoiceLanguage,
                  value: speech.state.language,
                  options: speech.languages.map((value) => ({
                    value,
                    label: value,
                  })),
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
                  icon: assistantIcon(ASSISTANT_STOP_ICON),
                  iconOnly: true,
                  variant: "secondary",
                  onClick: assistant.stop,
                })
              : slots.Button({
                  label: composer.answering
                    ? copy.assistantAnswerSend
                    : copy.assistantSend,
                  part: "assistant-send",
                  icon: assistantIcon(ASSISTANT_SEND_ICON),
                  iconOnly: true,
                  variant: "primary",
                  disabled: !usable || !assistant.draft.trim(),
                  onClick: send,
                }),
          ]
        ),
        speech?.state.error
          ? h(
              "p",
              {
                "data-adapttable-part": "assistant-voice-error",
                role: "alert",
                style: { margin: 0, minWidth: 0, overflowWrap: "anywhere" },
              },
              speech.state.error
            )
          : null,
      ]
    );
  },
  ["assistant", "speech", "labels", "slots", "onSend"]
);
