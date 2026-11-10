/**
 * The side panel's contract: the props its Chrome takes and the pieces a kit
 * fills it with.
 *
 * Every binding's side-panel Chrome owns the same `tablist` — roving focus,
 * wrapping arrows, Escape to close — and lets the kit draw the frame, the tab
 * buttons and the close control. Rendered content is the binding's `TNode`,
 * key events are its `TKeyboardEvent`, and a panel is the binding's own
 * `TPanel` entry (core knows a panel by its key; the binding adds its caption
 * and content), so a React kit and an Angular kit fill the same shapes with
 * their own types.
 */
import type { SidePanelEntry } from "../features/currentHost";
import type { TableLabels } from "../types";

/**
 * The edge a side panel docks to: the inline start or end, so it follows the
 * reading direction.
 *
 * @public
 */
export type SidePanelSide = "start" | "end";

/**
 * Props an adapter's panel frame receives.
 *
 * @typeParam TNode - The binding's render node (a React node in React).
 *
 * @public
 */
export interface SidePanelFrameProps<TNode = unknown> {
  /** The tab strip and the panel body, in order. */
  readonly children: TNode;
  /** Which edge the panel is docked to, already resolved for direction. */
  readonly side: SidePanelSide;
  /** Class for the element. */
  readonly className?: string;
}

/**
 * Props an adapter's tab button receives.
 *
 * @typeParam TPanel - The binding's side-panel entry.
 * @typeParam TKeyboardEvent - The binding's key event (React's synthetic
 *   event in React, the DOM event elsewhere).
 *
 * @public
 */
export interface SidePanelTabProps<
  TPanel extends SidePanelEntry = SidePanelEntry,
  TKeyboardEvent = KeyboardEvent,
> {
  /** The side-panel tab being rendered. */
  readonly panel: TPanel;
  /** Whether this item is selected. */
  readonly selected: boolean;
  /** Spread onto the button: role, tabindex, aria wiring, id and keys. */
  readonly buttonProps: {
    readonly id: string;
    readonly role: "tab";
    readonly type: "button";
    readonly tabIndex: number;
    readonly "aria-selected": boolean;
    readonly "aria-controls": string;
    readonly "data-adapttable-part": "side-panel-tab";
    readonly onClick: () => void;
    readonly onKeyDown: (event: TKeyboardEvent) => void;
  };
}

/**
 * Props an adapter's close control receives.
 *
 * @public
 */
export interface SidePanelCloseProps {
  /** Accessible name for the control. */
  readonly label: string;
  /** Closes the panel. */
  readonly onClose: () => void;
}

/**
 * Adapter-owned rendering for the side panel's Chrome.
 *
 * @typeParam TNode - The binding's render node (a React node in React).
 * @typeParam TPanel - The binding's side-panel entry.
 * @typeParam TKeyboardEvent - The binding's key event.
 *
 * @public
 */
export interface SidePanelSlots<
  TNode = unknown,
  TPanel extends SidePanelEntry = SidePanelEntry,
  TKeyboardEvent = KeyboardEvent,
> {
  /** The docked frame around everything. */
  readonly Frame: (props: SidePanelFrameProps<TNode>) => TNode;
  /** One tab in the strip. Omitted when there is only one panel. */
  readonly Tab: (props: SidePanelTabProps<TPanel, TKeyboardEvent>) => TNode;
  /** The control that closes the panel. */
  readonly Close: (props: SidePanelCloseProps) => TNode;
}

/**
 * What the side panel needs to render.
 *
 * @typeParam TNode - The binding's render node (a React node in React).
 * @typeParam TPanel - The binding's side-panel entry.
 * @typeParam TKeyboardEvent - The binding's key event.
 *
 * @public
 */
export interface SidePanelChromeProps<
  TNode = unknown,
  TPanel extends SidePanelEntry = SidePanelEntry,
  TKeyboardEvent = KeyboardEvent,
> {
  /** The panels, in tab order. Rendering nothing when empty. */
  panels: readonly TPanel[];
  /** Which panel is showing. */
  openPanel: string;
  /** Show a different panel. */
  onOpenPanel: (key: string) => void;
  /** Close the panel entirely. */
  onClose: () => void;
  /** Which edge to dock to. Defaults to `"end"`. */
  side?: SidePanelSide;
  /** Labels; falls back to the built-in English. */
  labels?: TableLabels;
  /** A unique id root, so two tables on a page do not collide. */
  idPrefix?: string;
  /** A kit's own class for the frame. */
  className?: string;
  /** Adapter-owned visible components. */
  slots: SidePanelSlots<TNode, TPanel, TKeyboardEvent>;
}
