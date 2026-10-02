/** Angular's node and required kit controls for the neutral assistant model. */
import type {
  IconDescriptor,
  TableAssistantAvatars as NeutralAvatars,
  TableAssistantButtonProps as NeutralButton,
  TableAssistantComposerProps as NeutralComposer,
  TableAssistantFace as NeutralFace,
  TableAssistantMenuItem as NeutralMenuItem,
  TableAssistantMenuProps as NeutralMenu,
  TableAssistantPanelProps as NeutralPanel,
  TableAssistantPlacement,
  TableAssistantProps as NeutralProps,
  TableAssistantSheetProps as NeutralSheet,
  TableAssistantWindowProps as NeutralWindow,
} from "@adapttable/core/binding";
import type { TemplateRef, Type } from "@angular/core";

/** Content supplied by a host or the chrome, never executable backend markup. @public */
export type TableAssistantNode =
  string | TemplateRef<unknown> | IconDescriptor | null;
/** One host-provided speaker mark. @public */
export type TableAssistantFace = NeutralFace<TableAssistantNode>;
/** One suggested example. @public */
export type TableAssistantMenuItem = NeutralMenuItem<TableAssistantNode>;
/** The host's marks beside each speaker. @public */
export type TableAssistantAvatars = NeutralAvatars<TableAssistantNode>;
/** The kit assistant's public props. @public */
export type TableAssistantProps = NeutralProps<TableAssistantNode>;
/** A button drawn by the kit. @public */
export type TableAssistantButtonProps = NeutralButton<TableAssistantNode>;
/** The native keyboard contract. @public */
export type TableAssistantComposerProps = NeutralComposer<KeyboardEvent>;
/** An examples menu drawn by the kit. @public */
export type TableAssistantMenuProps = NeutralMenu<TableAssistantNode>;
/** The kit's in-flow surface. @public */
export type TableAssistantPanelProps = NeutralPanel<TemplateRef<unknown>>;
/** The kit's modal surface. @public */
export type TableAssistantSheetProps = NeutralSheet<TemplateRef<unknown>>;
/** The kit's floating surface. @public */
export type TableAssistantWindowProps = NeutralWindow<
  TemplateRef<unknown>,
  TableAssistantPlacement
>;
export type {
  SpeechInputHandle,
  TableAssistantBadgeProps,
  TableAssistantLanguageChipProps,
  TableAssistantPresentation,
} from "@adapttable/core/binding";

/** Every control is a component with one `props` input; no native fallbacks. @public */
export interface TableAssistantSlots {
  readonly Panel: Type<unknown>;
  readonly Sheet: Type<unknown>;
  readonly Window: Type<unknown>;
  readonly Button: Type<unknown>;
  readonly Composer: Type<unknown>;
  readonly Badge: Type<unknown>;
  readonly Menu?: Type<unknown>;
  readonly LanguageChip?: Type<unknown>;
}
