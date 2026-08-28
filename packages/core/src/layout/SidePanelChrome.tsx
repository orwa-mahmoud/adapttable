/**
 * The side panel: table settings docked beside the table instead of
 * floating over it.
 *
 * A popover is right for a control you touch once and dismiss. It is wrong
 * for the work of setting a table up — choosing columns, building a filter,
 * arranging a pivot — because that is iterative: change one thing, look at
 * the rows, change another. A popover closes when you look away, and the
 * rows are behind it while it is open. A docked panel stays put and shares
 * the width, which is why every serious grid grows one.
 *
 * What core owns here is the part a kit would get subtly wrong: the tabs
 * are a real `tablist` with roving focus, arrow keys wrap and move the
 * selection with them, Escape closes from anywhere inside, and the panel
 * body is a `tabpanel` labelled by its tab. Which panel is showing is
 * state, and state belongs here rather than in seven copies. Putting focus
 * back after a close belongs to whatever opened the panel, which is the
 * only thing that knows where focus was.
 *
 * What the kit owns is everything visible: the panel's frame, the tab
 * buttons, the close control. There is no fallback for those — a docked
 * panel drawn in raw HTML inside an MUI table is exactly the mismatch the
 * slots law exists to prevent.
 *
 * The panels themselves are content the caller supplies. That is what lets
 * the same chrome hold a filter form, a column list, or a pivot builder
 * without knowing what any of them are.
 */
import { type KeyboardEvent, type ReactNode, useCallback, useRef } from "react";

import type { TableLabels } from "../types";

/**
 * One panel in the side panel's strip.
 *
 * @public
 */
export interface SidePanelEntry {
  /** Stable identity, used for the open-panel state and the URL. */
  key: string;
  /** The tab's caption, already localized. */
  label: string;
  /** What the panel shows when it is the selected one. */
  content: ReactNode;
}

/**
 * Props an adapter's panel frame receives.
 *
 * @internal
 */
export interface SidePanelFrameProps {
  /** The tab strip and the panel body, in order. */
  readonly children: ReactNode;
  /** Which edge the panel is docked to, already resolved for direction. */
  readonly side: "start" | "end";
  /** Class for the element. */
  readonly className?: string;
}

/**
 * Props an adapter's tab button receives.
 *
 * @internal
 */
export interface SidePanelTabProps {
  /** The side-panel tab being rendered. */
  readonly panel: SidePanelEntry;
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
    readonly onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
  };
}

/**
 * Props an adapter's close control receives.
 *
 * @internal
 */
export interface SidePanelCloseProps {
  /** Accessible name for the control. */
  readonly label: string;
  /** Closes the panel. */
  readonly onClose: () => void;
}

/**
 * Adapter-owned rendering for {@link SidePanelChrome}.
 *
 * @internal
 */
export interface SidePanelSlots {
  /** The docked frame around everything. */
  readonly Frame: (props: SidePanelFrameProps) => ReactNode;
  /** One tab in the strip. Omitted when there is only one panel. */
  readonly Tab: (props: SidePanelTabProps) => ReactNode;
  /** The control that closes the panel. */
  readonly Close: (props: SidePanelCloseProps) => ReactNode;
}

/**
 * What the side panel needs to render.
 *
 * @internal
 */
export interface SidePanelChromeProps {
  /** The panels, in tab order. Rendering nothing when empty. */
  panels: readonly SidePanelEntry[];
  /** Which panel is showing. */
  openPanel: string;
  /** Show a different panel. */
  onOpenPanel: (key: string) => void;
  /** Close the panel entirely. */
  onClose: () => void;
  /** Which edge to dock to. Defaults to `"end"`. */
  side?: "start" | "end";
  /** Labels; falls back to the built-in English. */
  labels?: TableLabels;
  /** A unique id root, so two tables on a page do not collide. */
  idPrefix?: string;
  /** A kit's own class for the frame. */
  className?: string;
  /** Adapter-owned visible components. */
  slots: SidePanelSlots;
}

/**
 * Move the roving tab stop.
 *
 * Arrow keys wrap, Home and End jump to the ends — the pattern a `tablist`
 * is expected to follow, and the reason the tabs are not seven buttons.
 */
function nextIndex(key: string, at: number, count: number): number | undefined {
  if (key === "ArrowRight" || key === "ArrowDown") return (at + 1) % count;
  if (key === "ArrowLeft" || key === "ArrowUp") return (at - 1 + count) % count;
  if (key === "Home") return 0;
  if (key === "End") return count - 1;
  return undefined;
}

/**
 * Renders the side panel, or nothing when there are no panels to show.
 *
 * @param props - The panels, which one is open, and the kit's slots.
 * @returns The docked panel.
 *
 * @internal
 */
export function SidePanelChrome(props: Readonly<SidePanelChromeProps>) {
  const { panels, openPanel, onOpenPanel, onClose, slots } = props;
  const tabsRef = useRef<HTMLDivElement | null>(null);
  const prefix = props.idPrefix ?? "adapttable-side-panel";
  const selectedIndex = Math.max(
    0,
    panels.findIndex((panel) => panel.key === openPanel)
  );
  const selected = panels[selectedIndex];

  // The keys are handled on the tabs rather than on the strip around them:
  // the tab is what has focus, and a `tablist` that listens for keys is a
  // container the user can never be inside of.
  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
        return;
      }
      const to = nextIndex(event.key, selectedIndex, panels.length);
      if (to === undefined) return;
      const panel = panels[to];
      if (!panel) return;
      event.preventDefault();
      onOpenPanel(panel.key);
      // Focus follows selection in an automatic tablist, and the newly
      // selected tab is the only one still in the tab order.
      const id = CSS.escape(`${prefix}-tab-${panel.key}`);
      tabsRef.current?.querySelector<HTMLElement>(`#${id}`)?.focus();
    },
    [onClose, onOpenPanel, panels, prefix, selectedIndex]
  );

  if (panels.length === 0 || !selected) return null;

  const labels = props.labels;
  return (
    <slots.Frame side={props.side ?? "end"} className={props.className}>
      <div
        data-adapttable-part="side-panel-header"
        style={{ display: "flex", alignItems: "center", gap: 8 }}
      >
        {panels.length > 1 && (
          <div
            ref={tabsRef}
            role="tablist"
            aria-label={labels?.sidePanel ?? "Table settings"}
            data-adapttable-part="side-panel-tabs"
            style={{ display: "flex", flex: 1, gap: 4 }}
          >
            {panels.map((panel, index) => (
              <slots.Tab
                key={panel.key}
                panel={panel}
                selected={index === selectedIndex}
                buttonProps={{
                  id: `${prefix}-tab-${panel.key}`,
                  role: "tab",
                  type: "button",
                  tabIndex: index === selectedIndex ? 0 : -1,
                  "aria-selected": index === selectedIndex,
                  "aria-controls": `${prefix}-body`,
                  "data-adapttable-part": "side-panel-tab",
                  onClick: () => {
                    onOpenPanel(panel.key);
                  },
                  onKeyDown,
                }}
              />
            ))}
          </div>
        )}
        <slots.Close
          label={labels?.closePanel ?? "Close panel"}
          onClose={onClose}
        />
      </div>
      <div
        id={`${prefix}-body`}
        role={panels.length > 1 ? "tabpanel" : undefined}
        aria-labelledby={
          panels.length > 1 ? `${prefix}-tab-${selected.key}` : undefined
        }
        data-adapttable-part="side-panel-body"
        // A single-panel side panel has no tab to be labelled by, so it
        // names itself — otherwise the region is anonymous to a screen
        // reader the moment a host asks for only one panel.
        aria-label={panels.length > 1 ? undefined : selected.label}
        onKeyDown={(event) => {
          if (event.key !== "Escape") return;
          event.stopPropagation();
          onClose();
        }}
      >
        {selected.content}
      </div>
    </slots.Frame>
  );
}

/**
 * What {@link SidePanelLayout} arranges.
 *
 * @internal
 */
export interface SidePanelLayoutProps {
  /** The table itself — everything the panel sits beside. */
  body: ReactNode;
  /** The rendered side panel, or nothing when none is open. */
  panel?: ReactNode;
  /** Which edge the panel is docked to. Defaults to `"end"`. */
  side?: "start" | "end";
}

/**
 * Put the table and its panel side by side.
 *
 * This is structure, not appearance — a flex row and a `min-width: 0` so the
 * table can still scroll horizontally inside it — which is why it lives in
 * core rather than in eight copies. Without a panel it renders the body
 * alone and adds no element at all, so a table that never asks for one has
 * exactly the DOM it always had.
 *
 * It exists as a component rather than as a ternary in each adapter for a
 * reason worth stating: the same "if the host asked for it, wrap; otherwise
 * do not" shape written eight times is eight chances to differ, and one
 * kit's copy already tripped a complexity limit when the status bar took
 * that form.
 *
 * @param props - The body, the panel, and which side it docks to.
 * @returns The arranged region.
 *
 * @internal
 */
export function SidePanelLayout(props: Readonly<SidePanelLayoutProps>) {
  if (!props.panel) return <>{props.body}</>;
  return (
    <div
      data-adapttable-part="table-region"
      style={{
        display: "flex",
        gap: 12,
        alignItems: "flex-start",
        flexDirection: props.side === "start" ? "row-reverse" : "row",
      }}
    >
      {/* `min-width: 0` is what lets the table keep its own horizontal
          scrollbar instead of forcing the row wider than its container. */}
      <div
        data-adapttable-part="table-region-main"
        style={{ flex: 1, minWidth: 0 }}
      >
        {props.body}
      </div>
      {props.panel}
    </div>
  );
}
