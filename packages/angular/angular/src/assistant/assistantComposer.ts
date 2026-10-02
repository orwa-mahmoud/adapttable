/** The one composer: Enter sends, Shift+Enter and IME composition stay text. */
import type { TableLabels } from "@adapttable/core";
import { assistantIsBusy, assistantIsUsable } from "@adapttable/core/binding";
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from "@angular/core";

import { AdaptLiveRegion } from "../a11y/liveRegion";
import { AdaptControl } from "../control";
import {
  ASSISTANT_EXAMPLES_ICON,
  ASSISTANT_SEND_ICON,
  ASSISTANT_STOP_ICON,
  assistantMicIcon,
} from "./assistantIcons";
import type {
  SpeechInputHandle,
  TableAssistantButtonProps,
  TableAssistantComposerProps,
  TableAssistantMenuProps,
  TableAssistantSlots,
} from "./assistantSlots";

const ASSISTANT_COMPOSER_PARTS = {
  stop: "assistant-stop",
  send: "assistant-send",
};

/** State and actions for the structural composer. @public */
export interface AssistantComposerProps {
  readonly labels?: TableLabels;
  readonly status: string;
  readonly busy?: boolean;
  readonly draft: string;
  readonly setDraft: (draft: string) => void;
  readonly onSend: () => void;
  readonly onStop: () => void;
  readonly speech?: SpeechInputHandle;
  readonly examples?: Pick<
    TableAssistantMenuProps,
    "label" | "items" | "onSelect"
  >;
  readonly placeholder?: string;
}
/** Draws composer structure while delegating every visible control to its kit. @public */
@Component({
  selector: "adapt-assistant-composer",
  imports: [AdaptControl, AdaptLiveRegion],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  templateUrl: "./assistantComposer.html",
})
export class AdaptAssistantComposer {
  /** Live composer state. */
  readonly props = input.required<AssistantComposerProps>();
  /** Required kit controls. */
  readonly slots = input.required<TableAssistantSlots>();
  protected readonly busy = computed(
    () => this.props().busy ?? assistantIsBusy(this.props().status)
  );
  protected readonly usable = computed(() =>
    assistantIsUsable(this.props().status)
  );
  protected readonly listening = computed(
    () => this.props().speech?.state.status === "listening"
  );
  protected readonly composer = computed((): TableAssistantComposerProps => ({
    label: this.props().labels?.assistantPlaceholder ?? "Ask about this table…",
    placeholder:
      this.props().placeholder ??
      this.props().labels?.assistantPlaceholder ??
      "Ask about this table…",
    part: "assistant-input",
    value: this.props().draft,
    disabled: !this.usable(),
    onChange: this.props().setDraft,
    onKeyDown: (event) => {
      this.onKeyDown(event);
    },
  }));
  protected readonly menu = computed(() => {
    const examples = this.props().examples;
    return examples?.items.length
      ? {
          ...examples,
          part: "assistant-examples-menu",
          icon: ASSISTANT_EXAMPLES_ICON,
          disabled: !this.usable(),
          maxHeight: "min(22em, 50vh)",
        }
      : null;
  });
  protected readonly language = computed(() => {
    const speech = this.props().speech;
    return speech?.available && speech.languages.length > 1
      ? {
          label:
            this.props().labels?.assistantVoiceLanguage ?? "Dictation language",
          value: speech.state.language,
          options: speech.languages.map((value) => ({ value, label: value })),
          part: "assistant-voice-language",
          disabled: this.listening(),
          onChange: speech.setLanguage,
        }
      : null;
  });
  protected readonly microphone = computed((): TableAssistantButtonProps => {
    const speech = this.props().speech;
    const label = this.listening()
      ? (this.props().labels?.assistantVoiceStop ?? "Stop dictation")
      : (this.props().labels?.assistantVoiceStart ?? "Dictate");
    return {
      label,
      tooltip: label,
      part: "assistant-voice",
      variant: this.listening() ? "primary" : "subtle",
      icon: assistantMicIcon(this.listening()),
      iconOnly: true,
      disabled: !this.usable(),
      onClick: () => {
        if (this.listening()) speech?.stop();
        else speech?.start();
      },
    };
  });
  protected readonly action = computed((): TableAssistantButtonProps => {
    const props = this.props();
    const busy = this.busy();
    const label = busy
      ? (props.labels?.assistantStop ?? "Stop")
      : (props.labels?.assistantSend ?? "Send");
    return {
      label,
      tooltip: label,
      part: busy
        ? ASSISTANT_COMPOSER_PARTS.stop
        : ASSISTANT_COMPOSER_PARTS.send,
      variant: busy ? "secondary" : "primary",
      icon: busy ? ASSISTANT_STOP_ICON : ASSISTANT_SEND_ICON,
      iconOnly: true,
      disabled: !busy && (!this.usable() || props.draft.trim() === ""),
      onClick: busy ? props.onStop : props.onSend,
    };
  });
  /** Stable kit-button props keep fallback examples out of render-time allocation. */
  protected readonly exampleButtons = computed(() =>
    (this.props().examples?.items ?? []).map((item) => {
      const button: TableAssistantButtonProps = {
        label: item.title,
        part: "assistant-examples-item",
        disabled: !this.usable(),
        onClick: () => {
          this.props().examples?.onSelect(item.id);
        },
      };
      return { id: item.id, button };
    })
  );
  private onKeyDown(event: KeyboardEvent): void {
    if (event.key !== "Enter" || event.isComposing || event.shiftKey) return;
    event.preventDefault();
    if (!this.busy() && this.usable()) this.props().onSend();
  }
}
