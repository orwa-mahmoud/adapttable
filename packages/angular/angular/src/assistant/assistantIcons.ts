/** Core owns every assistant glyph; Angular only draws its descriptor. */
import type { IconDescriptor } from "@adapttable/core/binding";
import { NgTemplateOutlet } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  TemplateRef,
} from "@angular/core";

import { AdaptIcon } from "../icon";
import type { TableAssistantNode } from "./assistantSlots";

export {
  ASSISTANT_ACTIONS_ICON,
  ASSISTANT_AVATAR_ICON,
  ASSISTANT_CLOSE_ICON,
  ASSISTANT_EXAMPLES_ICON,
  ASSISTANT_SEND_ICON,
  ASSISTANT_SETTINGS_ICON,
  ASSISTANT_STOP_ICON,
  ASSISTANT_UNDO_ICON,
  assistantKindIcon,
  assistantMicIcon,
  assistantReceiptIcon,
  PERSON_AVATAR_ICON,
} from "@adapttable/core/binding";

/** Renders a host template, plain string, or core glyph without interpreting HTML. @public */
@Component({
  selector: "adapt-assistant-content",
  imports: [NgTemplateOutlet, AdaptIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @if (template(); as content) {
      <ng-container [ngTemplateOutlet]="content" />
    } @else if (icon(); as descriptor) {
      <svg [adaptIcon]="descriptor"></svg>
    } @else {
      {{ text() }}
    }
  `,
})
export class AdaptAssistantContent {
  /** Trusted presentation content, never backend markup. */
  readonly content = input<TableAssistantNode | undefined>();
  protected readonly template = computed(() => {
    const node = this.content();
    return node instanceof TemplateRef ? node : null;
  });
  protected readonly icon = computed((): IconDescriptor | null => {
    const node = this.content();
    return node && typeof node === "object" && "shapes" in node ? node : null;
  });
  protected readonly text = computed(() =>
    typeof this.content() === "string" ? this.content() : ""
  );
}
