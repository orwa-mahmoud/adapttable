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
  /**
   * Writing direction for the surface.
   *
   * Every kit draws this one through a portal, which lands at the document
   * root and never sees the direction of the subtree the assistant lives in.
   * Passed explicitly for that reason: without it a right-to-left table opens
   * a left-to-right sheet, with the text in one direction and the layout in
   * the other. A kit applies it to the element it portals.
   */
  readonly dir?: "ltr" | "rtl";
  readonly children: ReactNode;
}

/**
 * One entry in the examples menu.
 *
 * Already in the reader's language — the chrome hands the kit words, never a
 * suggestion object, so nothing about the assistant's shape leaks into a
 * kit's menu.
 *
 * @public
 */
export interface TableAssistantMenuItem {
  /** Stable identity, handed back to {@link TableAssistantMenuProps.onSelect}. */
  readonly id: string;
  readonly title: string;
  readonly description?: string;
  readonly icon?: ReactNode;
  readonly part: string;
}

/**
 * A menu hung off one trigger.
 *
 * Items rather than children, because a kit's menu wants its own item
 * component — `Menu.Item`, `MenuItem`, `DropdownMenu.Item` — and children
 * would force one kit's markup through another kit's menu. The kit owns the
 * trigger, the surface, the placement and the keyboard; the chrome owns only
 * what the entries say.
 *
 * @public
 */
export interface TableAssistantMenuProps {
  /** Accessible name of the trigger, and its tooltip. */
  readonly label: string;
  /** Part name for the trigger. */
  readonly part: string;
  readonly className?: string;
  /** The trigger's glyph. */
  readonly icon?: ReactNode;
  readonly disabled?: boolean;
  readonly items: readonly TableAssistantMenuItem[];
  readonly onSelect: (id: string) => void;
  /**
   * How tall the list may grow before it scrolls inside itself.
   *
   * A table can offer a dozen shortcuts, and a menu that grows to fit them
   * all runs off the panel — past the composer it was opened from, and on a
   * short viewport off the screen. The kit applies this to its own surface,
   * because only the kit knows which element there scrolls.
   */
  readonly maxHeight?: string;
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
  /**
   * The examples menu in the composer.
   *
   * Optional, and the reason is the same as the chooser below: a kit that has
   * not filled it keeps the disclosure the chrome falls back to, rather than
   * losing the examples altogether. Every published kit fills it.
   */
  readonly Menu?: (props: TableAssistantMenuProps) => ReactNode;
  /**
   * The language chooser beside the mic.
   *
   * Optional: a kit that has not filled it simply offers no chip, and a table
   * with one language never needed one. A kit that fills it draws its own
   * menu — this is a chooser, not a button with a list bolted on.
   */
  readonly LanguageChip?: (props: TableAssistantLanguageChipProps) => ReactNode;
}

/**
 * The language chooser shown when dictation offers more than one.
 *
 * Only ever drawn beside a mic that is already there. One language shows no
 * chip at all: asking a reader which language they are about to speak, when
 * there is only one answer, is slower than typing.
 *
 * @public
 */
export interface TableAssistantLanguageChipProps {
  /** Accessible name for the chooser itself. */
  readonly label: string;
  /** The tag in force. */
  readonly value: string;
  /** Every tag on offer, with the name to show for each. */
  readonly options: readonly {
    readonly value: string;
    readonly label: string;
  }[];
  readonly part: string;
  readonly className?: string;
  readonly onChange: (value: string) => void;
  readonly disabled?: boolean;
}
