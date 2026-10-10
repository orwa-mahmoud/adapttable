import type { TableAssistantNode } from "@adapttable/angular";
import type {
  TableAssistantButtonProps as NeutralButton,
  TableAssistantComposerProps as NeutralComposer,
  TableAssistantMenuItem as NeutralMenuItem,
  TableAssistantMenuProps as NeutralMenu,
  TableAssistantPanelProps as NeutralPanel,
  TableAssistantPlacement,
  TableAssistantSheetProps as NeutralSheet,
  TableAssistantWindowProps as NeutralWindow,
} from "@adapttable/core/binding";
import type { TemplateRef, Type } from "@angular/core";

/** One suggested example. @public */
export type TableAssistantMenuItem = NeutralMenuItem<TableAssistantNode>;

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
