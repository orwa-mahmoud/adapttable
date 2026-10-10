/** Vue render nodes over the neutral assistant contract; no AI runtime dependency. */
import type {
  AgentApprovalListProps as NeutralList,
  ApprovalReviewSlots as NeutralReviewSlots,
  TableAssistantAvatars as NeutralAvatars,
  TableAssistantButtonProps as NeutralButton,
  TableAssistantMenuProps as NeutralMenu,
  TableAssistantPanelProps as NeutralPanel,
  TableAssistantProps as NeutralProps,
  TableAssistantSheetProps as NeutralSheet,
  TableAssistantSlots as NeutralSlots,
  TableAssistantWindowProps as NeutralWindow,
} from "@adapttable/core/binding";
import type { CSSProperties, VNodeChild } from "vue";

/** @public */
export type TableAssistantProps = NeutralProps<VNodeChild>;
/** @public */
export type TableAssistantAvatars = NeutralAvatars<VNodeChild>;
/** @public */
export type TableAssistantSlots = Required<
  NeutralSlots<VNodeChild, KeyboardEvent, CSSProperties>
>;
/** @public */
export type TableAssistantButtonProps = NeutralButton<VNodeChild>;
/** @public */
export type TableAssistantMenuProps = NeutralMenu<VNodeChild>;
/** @public */
export type TableAssistantPanelProps = NeutralPanel<VNodeChild>;
/** @public */
export type TableAssistantSheetProps = NeutralSheet<VNodeChild>;
/** @public */
export type TableAssistantWindowProps = NeutralWindow<
  VNodeChild,
  CSSProperties
>;
/** @public */
export type ApprovalReviewSlots = NeutralReviewSlots<VNodeChild>;
/** @public */
export type AgentApprovalListProps = NeutralList<VNodeChild>;
export type {
  AgentApprovalButtonProps,
  AgentApprovalProps,
  SpeechInputHandle,
  TableAssistantBadgeProps,
  TableAssistantComposerProps,
  TableAssistantLanguageChipProps,
  TableAssistantView,
} from "@adapttable/core/binding";
