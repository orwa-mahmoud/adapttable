/**
 * The controls a kit must supply for the assistant panel.
 *
 * Core draws no button, no input and no surface: every visible control here
 * is a required slot, so a Mantine table's assistant is made of Mantine
 * components and an antd table's is made of antd ones. The chrome owns
 * structure, keyboard behaviour, part names and announcements — nothing a
 * reader can click.
 */
import type { ReactNode } from "react";

/** A kit button. @public */
export interface TableAssistantButtonProps {
  /** Accessible name. Also the visible text unless `children` is given. */
  readonly label: string;
  /** Part name, so styling and tests can target this element. */
  readonly part: string;
  readonly className?: string;
  readonly onClick: () => void;
  readonly disabled?: boolean;
  /** How prominent this control is in the kit's own vocabulary. */
  readonly variant?: "primary" | "secondary" | "subtle";
  /** Visible content, when it differs from the accessible name. */
  readonly children?: ReactNode;
  /** Set when the control owns an expandable region. */
  readonly expanded?: boolean;
}

/** The kit's own multiline input. @public */
export interface TableAssistantComposerProps {
  readonly label: string;
  readonly placeholder: string;
  readonly part: string;
  readonly className?: string;
  readonly value: string;
  readonly disabled?: boolean;
  readonly onChange: (value: string) => void;
  /**
   * Key handling the chrome owns — Enter to send, Shift+Enter for a newline,
   * and an IME composition left alone. A kit must forward this untouched.
   */
  readonly onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => void;
}

/** The compact connection indicator. @public */
export interface TableAssistantBadgeProps {
  readonly label: string;
  readonly part: string;
  readonly className?: string;
  /** Which of the kit's own tones this state deserves. */
  readonly tone: "neutral" | "busy" | "warning" | "danger";
}

/** The desktop surface that sits beside the table. @public */
export interface TableAssistantPanelProps {
  readonly label: string;
  readonly part: string;
  readonly className?: string;
  readonly children: ReactNode;
}

/** The modal surface a narrow viewport gets instead. @public */
export interface TableAssistantSheetProps {
  readonly label: string;
  readonly part: string;
  readonly className?: string;
  readonly open: boolean;
  readonly onClose: () => void;
  readonly children: ReactNode;
}

/**
 * Every control {@link TableAssistantChrome} needs from a kit.
 *
 * @public
 */
export interface TableAssistantSlots {
  /** The nonmodal desktop surface. */
  readonly Panel: (props: TableAssistantPanelProps) => ReactNode;
  /** The modal narrow-viewport surface, with the kit's own focus trap. */
  readonly Sheet: (props: TableAssistantSheetProps) => ReactNode;
  /** Every button: launcher, close, settings, send, stop, suggestion, detail. */
  readonly Button: (props: TableAssistantButtonProps) => ReactNode;
  /** The composer input. */
  readonly Composer: (props: TableAssistantComposerProps) => ReactNode;
  /** The connection badge. */
  readonly Badge: (props: TableAssistantBadgeProps) => ReactNode;
}
