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

import {
  DEFAULT_SIDE_PANEL_ID_PREFIX,
  handleSidePanelBodyKey,
  handleSidePanelTabKey,
  type SidePanelChromeProps as NeutralSidePanelChromeProps,
  type SidePanelFrameProps as NeutralSidePanelFrameProps,
  sidePanelModel,
  type SidePanelSlots as NeutralSidePanelSlots,
  sidePanelTabId,
  type SidePanelTabProps as NeutralSidePanelTabProps,
} from "@adapttable/core/binding";
import { type KeyboardEvent, type ReactNode, useCallback, useRef } from "react";

export type { SidePanelCloseProps } from "@adapttable/core/binding";

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
 * Props an adapter's panel frame receives — `@adapttable/core`'s
 * `SidePanelFrameProps` drawing React nodes.
 *
 * @public
 */
export type SidePanelFrameProps = NeutralSidePanelFrameProps<ReactNode>;

/**
 * Props an adapter's tab button receives — `@adapttable/core`'s
 * `SidePanelTabProps` with React's panel entry and key event.
 *
 * @public
 */
export type SidePanelTabProps = NeutralSidePanelTabProps<
  SidePanelEntry,
  KeyboardEvent<HTMLElement>
>;

/**
 * Adapter-owned rendering for {@link SidePanelChrome} — `@adapttable/core`'s
 * `SidePanelSlots` drawing React nodes.
 *
 * @public
 */
export type SidePanelSlots = NeutralSidePanelSlots<
  ReactNode,
  SidePanelEntry,
  KeyboardEvent<HTMLElement>
>;

/**
 * What the side panel needs to render — `@adapttable/core`'s
 * `SidePanelChromeProps` with React's panel entry and slots.
 *
 * @public
 */
export type SidePanelChromeProps = NeutralSidePanelChromeProps<
  ReactNode,
  SidePanelEntry,
  KeyboardEvent<HTMLElement>
>;

/**
 * Renders the side panel, or nothing when there are no panels to show.
 *
 * @param props - The panels, which one is open, and the kit's slots.
 * @returns The docked panel.
 *
 * @public
 */
export function SidePanelChrome(props: Readonly<SidePanelChromeProps>) {
  const { panels, openPanel, onOpenPanel, onClose, slots } = props;
  const tabsRef = useRef<HTMLDivElement | null>(null);
  const prefix = props.idPrefix ?? DEFAULT_SIDE_PANEL_ID_PREFIX;
  const model = sidePanelModel({
    panels,
    openPanel,
    idPrefix: prefix,
    labels: props.labels,
  });
  const selectedIndex = model?.selectedIndex ?? 0;

  // The keys are handled on the tabs rather than on the strip around them:
  // the tab is what has focus, and a `tablist` that listens for keys is a
  // container the user can never be inside of.
  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>) => {
      const key = handleSidePanelTabKey(event, {
        panels,
        selectedIndex,
        onOpenPanel,
        onClose,
      });
      if (key === undefined) return;
      // Focus follows selection in an automatic tablist, and the newly
      // selected tab is the only one still in the tab order.
      const id = CSS.escape(sidePanelTabId(prefix, key));
      tabsRef.current?.querySelector<HTMLElement>(`#${id}`)?.focus();
    },
    [onClose, onOpenPanel, panels, prefix, selectedIndex]
  );

  if (!model) return null;

  return (
    <slots.Frame side={props.side ?? "end"} className={props.className}>
      <div
        data-adapttable-part="side-panel-header"
        style={{ display: "flex", alignItems: "center", gap: 8 }}
      >
        {model.tabbed && (
          <div
            ref={tabsRef}
            role="tablist"
            aria-label={model.tablistLabel}
            data-adapttable-part="side-panel-tabs"
            style={{ display: "flex", flex: 1, gap: 4 }}
          >
            {model.tabs.map((tab) => (
              <slots.Tab
                key={tab.key}
                panel={tab.panel}
                selected={tab.selected}
                buttonProps={{
                  id: tab.id,
                  role: "tab",
                  type: "button",
                  tabIndex: tab.tabIndex,
                  "aria-selected": tab.selected,
                  "aria-controls": tab.controls,
                  "data-adapttable-part": "side-panel-tab",
                  onClick: () => {
                    onOpenPanel(tab.key);
                  },
                  onKeyDown,
                }}
              />
            ))}
          </div>
        )}
        <slots.Close label={model.closeLabel} onClose={onClose} />
      </div>
      <div
        id={model.bodyId}
        role={model.bodyRole}
        aria-labelledby={model.bodyLabelledBy}
        data-adapttable-part="side-panel-body"
        // A single-panel side panel has no tab to be labelled by, so it
        // names itself — otherwise the region is anonymous to a screen
        // reader the moment a host asks for only one panel.
        aria-label={model.bodyLabel}
        onKeyDown={(event) => {
          handleSidePanelBodyKey(event, onClose);
        }}
      >
        {model.selected.content}
      </div>
    </slots.Frame>
  );
}

/**
 * What {@link SidePanelLayout} arranges.
 *
 * @public
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
 * @public
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
