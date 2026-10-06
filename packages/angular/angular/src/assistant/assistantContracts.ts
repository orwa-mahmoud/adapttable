import type {
  IconDescriptor,
  TableAssistantAvatars as NeutralAvatars,
  TableAssistantFace as NeutralFace,
  TableAssistantProps as NeutralProps,
} from "@adapttable/core/binding";
import type { TemplateRef } from "@angular/core";

export type { TableAssistantPresentation } from "@adapttable/core/binding";

/** Content supplied by a host or the chrome, never executable backend markup. @public */
export type TableAssistantNode =
  string | TemplateRef<unknown> | IconDescriptor | null;
/** One host-provided speaker mark. @public */
export type TableAssistantFace = NeutralFace<TableAssistantNode>;

/** The host's marks beside each speaker. @public */
export type TableAssistantAvatars = NeutralAvatars<TableAssistantNode>;
/** The kit assistant's public props. @public */
export type TableAssistantProps = NeutralProps<TableAssistantNode>;
