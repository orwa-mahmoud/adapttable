/**
 * The components a React kit hands the binding.
 *
 * The binding draws every control of every feature from these: a kit writes
 * each one once, in its own library's components, and the binding composes
 * them into the find bar, the row editors, the header filters and the rest.
 * Each primitive takes the semantic props below plus the DOM attributes the
 * structure needs (`aria-*`, `data-*`, handlers), and draws them its kit's way.
 *
 * Refs travel as `elementRef`, not `ref`, so a primitive written as a plain
 * function works under React 18 as well as 19.
 */
import type {
  ButtonHTMLAttributes,
  ComponentType,
  CSSProperties,
  HTMLAttributes,
  KeyboardEvent,
  ReactNode,
  Ref,
} from "react";

/**
 * How much a button stands out: quiet text, an outline, or filled.
 *
 * @public
 */
export type KitButtonVariant = "text" | "outlined" | "filled";

/**
 * The colour role a control carries.
 *
 * @public
 */
export type KitTone = "neutral" | "primary" | "danger";

/**
 * `data-*` attributes the structure writes on the element a primitive draws.
 *
 * @public
 */
export type KitDataAttributes = Readonly<
  Partial<Record<`data-${string}`, string>>
>;

/**
 * A pressable button with a visible caption.
 *
 * @public
 */
export interface KitButtonProps
  extends
    Omit<ButtonHTMLAttributes<HTMLButtonElement>, "color">,
    KitDataAttributes {
  /** The button element, for focus and anchoring. */
  readonly elementRef?: Ref<HTMLButtonElement>;
  /** How much it stands out. Absent, the kit's own default for the control. */
  readonly variant?: KitButtonVariant;
  /** Its colour role. Absent, `"neutral"`. */
  readonly tone?: KitTone;
  /** Stretch to the width of its container. */
  readonly fullWidth?: boolean;
  /** Where the caption sits in a full-width button. Absent, centred. */
  readonly justify?: "start";
  /**
   * The action is in flight: the kit shows its own working state and the
   * button takes no presses until it ends.
   */
  readonly busy?: boolean;
}

/**
 * A button that shows a glyph, named by `aria-label`.
 *
 * @public
 */
export interface KitIconButtonProps extends KitButtonProps {
  /** The accessible name the glyph stands for. */
  readonly "aria-label": string;
}

/**
 * A single-line text field.
 *
 * @public
 */
export interface KitTextInputProps extends KitDataAttributes {
  /** The current text. */
  readonly value: string;
  /** Called with the new text on every change. */
  readonly onValueChange: (value: string) => void;
  /** The accessible name. */
  readonly "aria-label": string;
  /** The input's type. Absent, `"text"`. */
  readonly type?: "text" | "search" | "number" | "date" | "datetime-local";
  /** Hint shown while empty. */
  readonly placeholder?: string;
  /** Class on the field's root element. */
  readonly className?: string;
  /** Part name written on the field's root element. */
  readonly rootPart?: string;
  /** Inline style on the field's root element. */
  readonly style?: CSSProperties;
  /** Stretch to the width of its container. */
  readonly fullWidth?: boolean;
  /** Whether the field accepts input. */
  readonly disabled?: boolean;
  /** The input element, for focus. */
  readonly elementRef?: Ref<HTMLInputElement>;
  /** Keys pressed in the input. */
  readonly onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
  /** The input's id, for a label that names it. */
  readonly id?: string;
  /** Whether the value is rejected; the kit draws its error state. */
  readonly invalid?: boolean;
  /** The input lost focus. */
  readonly onBlur?: () => void;
  /** Tells assistive technology the value is rejected. */
  readonly "aria-invalid"?: "true";
  /** The element that explains the rejection. */
  readonly "aria-describedby"?: string;
}

/**
 * One choice of a {@link KitSelectProps} list.
 *
 * @public
 */
export interface KitOption {
  /** The value the choice stands for. */
  readonly value: string;
  /** What the person reads. */
  readonly label: string;
}

/**
 * A single choice from a list.
 *
 * @public
 */
export interface KitSelectProps extends KitDataAttributes {
  /** The chosen value. */
  readonly value: string;
  /** The choices, in order. */
  readonly options: readonly KitOption[];
  /** Called with the new value. */
  readonly onValueChange: (value: string) => void;
  /** The accessible name. */
  readonly "aria-label": string;
  /** Class on the select's root element. */
  readonly className?: string;
  /** Part name written on the select's root element. */
  readonly rootPart?: string;
  /** Stretch to the width of its container. */
  readonly fullWidth?: boolean;
  /** Whether the select accepts input. */
  readonly disabled?: boolean;
  /** A visible label, where the control shows one. */
  readonly label?: string;
  /** Styles for the control's root. */
  readonly style?: CSSProperties;
}

/**
 * A checkbox, with or without a visible label.
 *
 * @public
 */
export interface KitCheckboxProps extends KitDataAttributes {
  /** Whether it is checked. */
  readonly checked: boolean;
  /** Called with the new state. */
  readonly onCheckedChange: (checked: boolean) => void;
  /** Show the mixed state. */
  readonly indeterminate?: boolean;
  /** The visible label. Absent, `aria-label` names it. */
  readonly label?: ReactNode;
  /** The accessible name when there is no visible label. */
  readonly "aria-label"?: string;
  /** Whether it accepts input. */
  readonly disabled?: boolean;
  /** Class on the checkbox's root element. */
  readonly className?: string;
}

/**
 * The props a popover hands its trigger. Spread them on the control that
 * opens it, through its `elementRef`.
 *
 * @public
 */
export interface KitTriggerProps {
  /** The trigger element, which the popover anchors to. */
  readonly elementRef: Ref<HTMLButtonElement>;
  /** Opens or closes the popover. */
  readonly onClick: () => void;
  /** Whether the popover is open. */
  readonly "aria-expanded": boolean;
  /** The popup's role. */
  readonly "aria-haspopup": "dialog" | "menu";
  /** The popup's id while it is open. */
  readonly "aria-controls"?: string;
}

/**
 * A floating panel anchored to the control that opens it.
 *
 * @public
 */
export interface KitPopoverProps {
  /** Draws the control that opens it, with the props it must carry. */
  readonly trigger: (props: KitTriggerProps) => ReactNode;
  /** The panel's content. */
  readonly children: ReactNode;
  /** Open it controlled. Absent, it opens and closes on its own. */
  readonly open?: boolean;
  /** Called when it asks to open or close. */
  readonly onOpenChange?: (open: boolean) => void;
  /** The popup's role, for the trigger's `aria-haspopup`. */
  readonly role?: "dialog" | "menu";
  /** Part name written on the panel. */
  readonly part?: string;
  /** Class on the panel. */
  readonly className?: string;
  /** Inline style on the panel. */
  readonly style?: CSSProperties;
  /** Where the panel opens. Absent, the kit's default placement. */
  readonly placement?: "bottom-start";
  /** The content brings its own padding; the panel adds none. */
  readonly flush?: boolean;
  /**
   * The panel's text direction. A panel portalled out of the table needs it
   * on itself, both to lay out and to be placed on the right edge.
   */
  readonly dir?: "ltr" | "rtl";
  /** The panel's accessible name. */
  readonly "aria-label"?: string;
}

/**
 * One entry of a {@link KitMenuProps} list.
 *
 * @public
 */
export interface KitMenuItem {
  /** Stable key. */
  readonly id: string;
  /** What the person reads. */
  readonly label: string;
  /** Called when chosen; the menu closes after it. */
  readonly onSelect: () => void;
  /** Offered but not available. */
  readonly disabled?: boolean;
  /** Why it is not available. */
  readonly disabledReason?: string;
}

/**
 * A list of actions anchored to the control that opens it.
 *
 * @public
 */
export interface KitMenuProps {
  /** Draws the control that opens it, with the props it must carry. */
  readonly trigger: (props: KitTriggerProps) => ReactNode;
  /** The entries, in order. */
  readonly items: readonly KitMenuItem[];
  /** The list's accessible name. */
  readonly "aria-label": string;
  /** Part name written on the list's panel. */
  readonly part?: string;
  /** Part name written on each entry. */
  readonly itemPart?: string;
}

/**
 * A run of text in one of the kit's type roles.
 *
 * @public
 */
export interface KitTextProps
  extends HTMLAttributes<HTMLElement>, KitDataAttributes {
  /** Its type role. Absent, `"body"`. */
  readonly variant?: "body" | "title" | "caption";
  /** Its colour role. Absent, the surface's text colour. */
  readonly tone?: "secondary" | "disabled" | "danger";
  /** Draw it as this element. Absent, the kit's choice. */
  readonly as?: "span" | "p" | "div" | "label";
  /** The control a label names. */
  readonly htmlFor?: string;
}

/**
 * A thin rule between two groups of controls.
 *
 * @public
 */
export interface KitDividerProps extends KitDataAttributes {
  /** Spacing around the rule. */
  readonly style?: CSSProperties;
}

/**
 * The components a React kit supplies. Every one is required: a kit that
 * leaves one out does not typecheck, so no control falls back to raw HTML.
 *
 * @public
 */
export interface KitPrimitives {
  /** A button with a caption. */
  readonly Button: ComponentType<KitButtonProps>;
  /** A button with a glyph. */
  readonly IconButton: ComponentType<KitIconButtonProps>;
  /** A text field. */
  readonly TextInput: ComponentType<KitTextInputProps>;
  /** A single choice from a list. */
  readonly Select: ComponentType<KitSelectProps>;
  /** A checkbox. */
  readonly Checkbox: ComponentType<KitCheckboxProps>;
  /** A floating panel. */
  readonly Popover: ComponentType<KitPopoverProps>;
  /** A list of actions. */
  readonly Menu: ComponentType<KitMenuProps>;
  /** A run of text. */
  readonly Text: ComponentType<KitTextProps>;
  /** A rule between groups. */
  readonly Divider: ComponentType<KitDividerProps>;
}

/**
 * Some of a kit's primitives — what one part of the table draws with.
 *
 * @public
 */
export type KitPrimitivesOf<TName extends keyof KitPrimitives> = Pick<
  KitPrimitives,
  TName
>;
