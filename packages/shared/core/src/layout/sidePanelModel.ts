/**
 * The side panel's tablist: which panel is selected, the ids that tie each
 * tab to the body, the roving tab stop, and the keys the tabs answer.
 *
 * The tabs are a real `tablist` with roving focus: arrow keys wrap and move
 * the selection with them, Home and End jump to the ends, and Escape closes
 * from anywhere inside. A binding draws the strip and a kit the tabs; the
 * pattern itself is decided here once.
 */
import { BASE_LABELS } from "../labelGroups/baseLabels";
import type { TableLabels } from "../types";

/**
 * The id root a side panel uses when the host gives none.
 *
 * @public
 */
export const DEFAULT_SIDE_PANEL_ID_PREFIX = "adapttable-side-panel";

/**
 * Where the roving tab stop moves for a key: arrow keys wrap, Home and End
 * jump to the ends.
 *
 * @param key - The key's value, as `KeyboardEvent.key`.
 * @param at - The selected tab's index.
 * @param count - How many tabs there are.
 * @returns The index to move to, or `undefined` for a key the tabs ignore.
 *
 * @public
 */
export function sidePanelTabIndex(
  key: string,
  at: number,
  count: number
): number | undefined {
  if (key === "ArrowRight" || key === "ArrowDown") return (at + 1) % count;
  if (key === "ArrowLeft" || key === "ArrowUp") return (at - 1 + count) % count;
  if (key === "Home") return 0;
  if (key === "End") return count - 1;
  return undefined;
}

/**
 * A panel as the side panel's model reads it.
 *
 * @public
 */
export interface SidePanelModelPanel {
  /** Stable identity. */
  readonly key: string;
  /** The tab's caption, already localized. */
  readonly label: string;
}

/**
 * One tab, as a binding spreads it.
 *
 * @typeParam TPanel - The binding's panel entry.
 * @public
 */
export interface SidePanelTabModel<
  TPanel extends SidePanelModelPanel = SidePanelModelPanel,
> {
  /** The panel this tab selects. */
  readonly panel: TPanel;
  /** The panel's key. */
  readonly key: string;
  /** The tab's element id. */
  readonly id: string;
  /** Whether it is the selected tab. */
  readonly selected: boolean;
  /** `0` on the selected tab, the only one in the tab order; `-1` otherwise. */
  readonly tabIndex: number;
  /** The body's id, which the tab controls. */
  readonly controls: string;
}

/**
 * The side panel's structure for one render.
 *
 * @typeParam TPanel - The binding's panel entry.
 * @public
 */
export interface SidePanelModel<
  TPanel extends SidePanelModelPanel = SidePanelModelPanel,
> {
  /** The selected panel. */
  readonly selected: TPanel;
  /** Index of the selected panel; the first when the open key is unknown. */
  readonly selectedIndex: number;
  /** Whether there is more than one panel, so a tab strip shows. */
  readonly tabbed: boolean;
  /** The tablist's accessible name. */
  readonly tablistLabel: string;
  /** The close control's accessible name. */
  readonly closeLabel: string;
  /** The tabs, in order. */
  readonly tabs: readonly SidePanelTabModel<TPanel>[];
  /** The body's element id. */
  readonly bodyId: string;
  /** `"tabpanel"` with a tab strip, else none. */
  readonly bodyRole: "tabpanel" | undefined;
  /** The selected tab's id, labelling the body when there is a strip. */
  readonly bodyLabelledBy: string | undefined;
  /**
   * The body's own name when there is only one panel: with no tab to be
   * labelled by, the region would be anonymous to a screen reader.
   */
  readonly bodyLabel: string | undefined;
}

/**
 * The element id of a side-panel tab.
 *
 * @param prefix - The panel's id root.
 * @param key - The panel's key.
 * @returns The id.
 *
 * @public
 */
export function sidePanelTabId(prefix: string, key: string): string {
  return `${prefix}-tab-${key}`;
}

/**
 * Derive the side panel's structure, or `null` when there is nothing to show.
 *
 * @typeParam TPanel - The binding's panel entry.
 * @param input - The panels in tab order, which one is open, the id root and
 *   the labels.
 * @returns The model, or `null`.
 *
 * @public
 */
export function sidePanelModel<TPanel extends SidePanelModelPanel>(input: {
  readonly panels: readonly TPanel[];
  readonly openPanel: string;
  readonly idPrefix?: string;
  readonly labels?: TableLabels;
}): SidePanelModel<TPanel> | null {
  const { panels, labels } = input;
  const prefix = input.idPrefix ?? DEFAULT_SIDE_PANEL_ID_PREFIX;
  const selectedIndex = Math.max(
    0,
    panels.findIndex((panel) => panel.key === input.openPanel)
  );
  const selected = panels[selectedIndex];
  if (!selected) return null;
  const tabbed = panels.length > 1;
  const bodyId = `${prefix}-body`;
  return {
    selected,
    selectedIndex,
    tabbed,
    tablistLabel: labels?.sidePanel ?? BASE_LABELS.sidePanel,
    closeLabel: labels?.closePanel ?? BASE_LABELS.closePanel,
    tabs: panels.map((panel, index) => ({
      panel,
      key: panel.key,
      id: sidePanelTabId(prefix, panel.key),
      selected: index === selectedIndex,
      tabIndex: index === selectedIndex ? 0 : -1,
      controls: bodyId,
    })),
    bodyId,
    bodyRole: tabbed ? "tabpanel" : undefined,
    bodyLabelledBy: tabbed ? sidePanelTabId(prefix, selected.key) : undefined,
    bodyLabel: tabbed ? undefined : selected.label,
  };
}

/**
 * The key event fields a side-panel tab reads.
 *
 * @public
 */
export interface SidePanelKeyEvent {
  /** The key's value, as `KeyboardEvent.key`. */
  readonly key: string;
  /** Stops the browser's own handling. */
  preventDefault(): void;
  /** Keeps the key from reaching an overlay around the panel. */
  stopPropagation(): void;
}

/**
 * Handle a key on a side-panel tab: Escape closes, arrows, Home and End move
 * the selection. Focus follows selection in an automatic tablist, so the
 * returned key is the tab to focus.
 *
 * @param event - The key event.
 * @param input - The panel keys in tab order, the selected index, and the
 *   open and close handlers.
 * @returns The key of the newly selected panel, or `undefined`.
 *
 * @public
 */
export function handleSidePanelTabKey(
  event: SidePanelKeyEvent,
  input: {
    readonly panels: readonly { readonly key: string }[];
    readonly selectedIndex: number;
    readonly onOpenPanel: (key: string) => void;
    readonly onClose: () => void;
  }
): string | undefined {
  if (event.key === "Escape") {
    event.stopPropagation();
    input.onClose();
    return undefined;
  }
  const to = sidePanelTabIndex(
    event.key,
    input.selectedIndex,
    input.panels.length
  );
  if (to === undefined) return undefined;
  const panel = input.panels[to];
  if (!panel) return undefined;
  event.preventDefault();
  input.onOpenPanel(panel.key);
  return panel.key;
}

/**
 * Handle a key inside the side panel's body: Escape closes the panel and
 * stops there.
 *
 * @param event - The key event.
 * @param onClose - Close the panel.
 * @returns Whether the key closed it.
 *
 * @public
 */
export function handleSidePanelBodyKey(
  event: Pick<SidePanelKeyEvent, "key" | "stopPropagation">,
  onClose: () => void
): boolean {
  if (event.key !== "Escape") return false;
  event.stopPropagation();
  onClose();
  return true;
}
