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
  /**
   * A leading glyph. With {@link TableAssistantButtonProps.iconOnly} it is
   * the whole visible control and `label` becomes the accessible name only.
   */
  readonly icon?: ReactNode;
  /** Draw the icon alone. The kit still exposes `label` to assistive tech. */
  readonly iconOnly?: boolean;
  /** Hover/focus description, when the kit has a tooltip of its own. */
  readonly tooltip?: string;
}

/**
 * One suggested prompt, drawn as the kit's own compact card or chip.
 *
 * Deliberately not a {@link TableAssistantSlots.Button}: a column of
 * full-width submit buttons reads as a form, and the empty conversation is
 * the first thing anyone sees.
 *
 * @public
 */
export interface TableAssistantSuggestionProps {
  readonly title: string;
  readonly description?: string;
  readonly icon?: ReactNode;
  readonly part: string;
  readonly className?: string;
  readonly onClick: () => void;
  readonly disabled?: boolean;
}

/**
 * The floating conversation window.
 *
 * Nonmodal and out of the document flow: opening it must not resize, squeeze
 * or move the table behind it, and the reader can still operate that table
 * while it is open. The kit supplies the surface — its own elevation, radius
 * and border — and the chrome positions it.
 *
 * @public
 */
export interface TableAssistantWindowProps {
  readonly label: string;
  readonly part: string;
  readonly className?: string;
  /** Inline styles the chrome computes for placement and size. */
  readonly style?: React.CSSProperties;
  readonly children: ReactNode;
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
  /** The nonmodal floating surface. */
  readonly Window: (props: TableAssistantWindowProps) => ReactNode;
  /** One suggested prompt, as a compact card or chip. */
  readonly Suggestion: (props: TableAssistantSuggestionProps) => ReactNode;
}
