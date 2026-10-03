/** Class-name hooks for the Angular Aria Angular table's card surfaces. */

/**
 * Optional classes on the mobile-card and row-action parts. The matching
 * `data-adapttable-part` and state attributes remain present.
 *
 * @public
 */
export interface DataTableClassNames {
  /** The mobile card list. */
  readonly cards?: string;
  /** Each data card and the trailing summary card. */
  readonly card?: string;
  /** A labelled field's wrapper. */
  readonly cardRow?: string;
  /** A field's caption. */
  readonly cardLabel?: string;
  /** A field's rendered value. */
  readonly cardValue?: string;
  /** A card's row actions. */
  readonly cardActions?: string;
  /** The expanded detail inside a card. */
  readonly cardDetail?: string;
  /** The trailing summary card. */
  readonly summaryCard?: string;
  /** A selection checkbox on a card. */
  readonly checkbox?: string;
  /** A tree disclosure button. */
  readonly treeToggle?: string;
  /** A leaf's tree-disclosure spacer. */
  readonly treeSpacer?: string;
  /** The card's reorder-button group. */
  readonly rowReorderButtons?: string;
  /** The move-up button. */
  readonly rowReorderUp?: string;
  /** The move-down button. */
  readonly rowReorderDown?: string;
  /** A button for a row action, in either layout. */
  readonly actionButton?: string;
  /** The native row-action menu. */
  readonly rowActionsMenu?: string;
  /** The menu's disclosure control. */
  readonly rowActionsTrigger?: string;
  /** A separator extra row. */
  readonly separatorRow?: string;
  /** A separator's content. */
  readonly separatorCell?: string;
  /** A full-width extra row. */
  readonly fullWidthRow?: string;
  /** A full-width row's content. */
  readonly fullWidthCell?: string;
  /** Space reserved for rows outside the virtual window. */
  readonly virtualSpacer?: string;
}
