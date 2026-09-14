/**
 * Public type surface for `@adapttable/core`.
 *
 * Everything here is framework- and UI-kit-agnostic. Adapters
 * (`@adapttable/mantine`, …) build their styled components on top of
 * these contracts; headless consumers import them directly.
 *
 * @packageDocumentation
 */
import type { ColumnModel, ExtraFilters, SortDirection } from "./columnModel";
import type { DisplayValue } from "./display";
import type { FacetMap } from "./filters/facets";

export type {
  ColumnAiOptions,
  ColumnGroupShow,
  ColumnMetadata,
  ColumnModel,
  ExtraFilters,
  FilterValue,
  SortableValue,
  SortDirection,
} from "./columnModel";

/**
 * Text direction. Adapters apply it; logical CSS does the rest.
 *
 * @public
 */
export type Direction = "ltr" | "rtl";

/**
 * Colour scheme preference. `"auto"` follows the host /
 * `prefers-color-scheme`; adapters resolve it to their theming.
 *
 * @public
 */
export type ColorScheme = "light" | "dark" | "auto";

/**
 * How the table paginates. `"auto"` resolves by viewport (mobile → infinite).
 *
 * @public
 */
export type PaginationMode = "infinite" | "paged" | "auto";

/**
 * The resolved (non-auto) pagination mode a source actually runs in.
 *
 * @public
 */
export type ResolvedPaginationMode = "infinite" | "paged";

/**
 * Props every cell renderer receives. Bindings may wrap this in a component.
 *
 * @public
 */
export interface CellProps<TRow> {
  /** The row being rendered. */
  readonly row: TRow;
  /** Zero-based index of the row within the current materialised slice. */
  readonly rowIndex: number;
}

/**
 * Sort/resize state a custom header caption can read.
 *
 * @public
 */
export interface ColumnHeaderController {
  /** Default caption (`header`, else the humanized key). */
  label: DisplayValue;
  /** This column's sort direction, absent when it is not sorted. */
  sortDir?: "asc" | "desc";
  /** 1-based position in a multi-column sort, absent when unsorted. */
  sortIndex?: number;
  /** Cycle this column's sort. No-op when the column is not sortable. */
  toggleSort: (event?: { shiftKey?: boolean }) => void;
}

/**
 * Arguments for a custom header caption.
 *
 * @public
 */
export interface ColumnHeaderContext<TRow> {
  /** The column being rendered. */
  column: ColumnModel<TRow>;
  /** Caption and sort state for this header. */
  controller: ColumnHeaderController;
}

/**
 * Arguments for a custom summary-row cell.
 *
 * @public
 */
export interface ColumnFooterContext<TRow> {
  /** The column being rendered. */
  column: ColumnModel<TRow>;
  /** The aggregate this column resolved to, already formatted. */
  value: DisplayValue;
}

/**
 * Where a write an agent proposed is reviewed.
 *
 * One surface is active at a time. `widget` reviews inside the assistant
 * conversation, `table` above the table it changes, `modal` in a dialog of
 * the kit's own. This is presentation only — it never decides WHETHER a
 * human is asked, which is {@link ActionApprovalPolicy}.
 *
 * @public
 */
export type ApprovalPresentation = "widget" | "table" | "modal";

/**
 * Whether an agent invoking this action has to wait for a human.
 *
 * `automatic` skips the human confirmation and nothing else: permissions,
 * validation, staging and save rules all still run. There is no value here
 * that means "authorized" — an action with no policy inherits the shared
 * default, which asks for writes.
 *
 * @public
 */
export type ActionApprovalPolicy = "required" | "automatic";

/**
 * What an ordinary action says about being invoked by an agent.
 *
 * Plain data, so an action definition stays framework-neutral and a table
 * with no assistant carries no agent code because one of its actions
 * mentions this. Every field is optional and inherits INDIVIDUALLY from the
 * shared configuration: overriding the policy alone leaves the presentation
 * as the shared one.
 *
 * This is not {@link ActionConfirm}. That describes a person clicking the
 * action themselves and being asked to confirm; this describes an agent
 * asking to run it on their behalf. One agent execution raises one prompt.
 *
 * @public
 */
export interface ActionAiOptions {
  /** Approval overrides for agent invocation. */
  readonly approval?: {
    /** Whether a human is asked. Inherits when omitted. */
    readonly policy?: ActionApprovalPolicy;
    /** Where they are asked. Inherits when omitted. */
    readonly presentation?: ApprovalPresentation;
  };
}

/**
 * Confirmation wiring shared by row and bulk actions.
 *
 * @public
 */
export interface ActionConfirm<TArg> {
  /** Dialog title (pre-translated). */
  title: string;
  /** Builds the dialog message from the action argument. */
  message: (arg: TArg) => string;
  /** Confirm button label (pre-translated). */
  confirmLabel: string;
  /** Marks the action destructive (adapters style it accordingly). */
  danger?: boolean;
}

/**
 * A per-row action — trailing buttons on desktop, card buttons on mobile.
 *
 * @public
 */
export interface RowAction<TRow> {
  /** Identifier — not shown to the user. */
  key: string;
  /** Pre-translated label; the accessible name, and the tooltip when icon-only. */
  label: string;
  /**
   * When set, adapters render an icon-only button. Omit it for a text button.
   * Built-in duplicate / delete / pin keys get each kit's own glyph when this
   * is omitted.
   */
  icon?: DisplayValue;
  /**
   * Click handler; fires after confirmation when `confirm` is set. Omit it
   * only on an `editsRow` action, where the row's own form does the writing.
   */
  onClick?: (row: TRow) => void;
  /**
   * This action opens the row's fields as one form instead of writing
   * anything itself. Row-mode editing hands it the trigger and the table's
   * own "Edit row" control stands down, so a row has one way in rather than
   * two controls that do the same thing. Save and cancel come from the open
   * row, as they do for every row edit.
   *
   * It renders only where there is a form to open: a table without row-mode
   * editing drops the action, because a control that cannot do what it says
   * is worse than no control.
   */
  editsRow?: boolean;
  /** Adapter-defined colour token (e.g. `"red"` for destructive). */
  color?: string;
  /** Disable conditionally — e.g. delete when the row is referenced. */
  isDisabled?: (row: TRow) => boolean;
  /**
   * Disable conditionally and explain why. A non-empty string disables the
   * action and adapters surface it as tooltip/title copy where possible.
   */
  disabledReason?: (row: TRow) => string | undefined;
  /** Hide entirely when the action is structurally inapplicable. */
  isHidden?: (row: TRow) => boolean;
  /** Optional confirmation dialog wiring. */
  confirm?: ActionConfirm<TRow>;
  /**
   * Agent-invocation overrides. Omit and the shared assistant configuration
   * applies. See {@link ActionAiOptions}.
   */
  ai?: ActionAiOptions;
}

/**
 * A bulk action invoked from the selection toolbar with the selected ids.
 *
 * @public
 */
export interface BulkAction {
  /** Identifier — not shown to the user. */
  key: string;
  /** Pre-translated button label. */
  label: string;
  /** Optional leading icon. */
  icon?: DisplayValue;
  /** Adapter-defined colour token. */
  color?: string;
  /**
   * Single disabled-state probe. A non-empty return greys the button out
   * and is shown as its tooltip; `undefined` leaves it enabled. One probe
   * (instead of `isDisabled` + `reason`) enforces that every disabled
   * bulk button explains itself.
   */
  disabledReason?: (ids: string[]) => string | undefined;
  /**
   * Action handler; receives the selected page ids plus a context: with
   * `allMatching` true the user chose "select all N matching" — act on the
   * whole filtered set server-side (`total` is its size), not just `ids`.
   */
  onClick: (
    ids: string[],
    context: BulkActionContext
  ) => void | Promise<unknown>;
  /** Optional confirmation dialog wiring (receives the selection count). */
  confirm?: ActionConfirm<number>;
  /**
   * Agent-invocation overrides. Omit and the shared assistant configuration
   * applies. See {@link ActionAiOptions}.
   */
  ai?: ActionAiOptions;
}

/**
 * Scope context handed to a bulk action.
 *
 * @public
 */
export interface BulkActionContext {
  /** True when the user chose "select all matching" across every page. */
  allMatching: boolean;
  /** Total rows in the current filtered set (= ids.length unless allMatching). */
  total: number;
}

/**
 * Option entry for a sort-by select control.
 *
 * @public
 */
export interface SortByOption {
  /** Column key this option sorts by. */
  value: string;
  /** Caption shown in the select. */
  label: string;
}

/**
 * Baseline query params a backend list endpoint receives.
 *
 * @public
 */
export interface TableQueryParams {
  /** 1-based page number. */
  page?: number;
  /** Rows per page. */
  limit?: number;
  /** The free-text search term, as typed. */
  search?: string;
  /** Column key to sort by. */
  sortBy?: string;
  /** Direction for `sortBy`. */
  sortDir?: SortDirection;
  /** Row grouping keys, comma-separated (URL-synced; frontend chrome only). */
  groupBy?: string;
  /**
   * The active filter values, namespaced so a user filter named like a
   * state param (`sortBy`, `search`, …) can never collide with one.
   */
  filters?: ExtraFilters;
  /**
   * The opaque token that opens this page, present only in cursor mode — a
   * source that never declares `supports: { cursor: true }` never receives it,
   * and page 1 never carries one.
   */
  cursor?: string;
}

/**
 * Standard paginated response envelope.
 *
 * @public
 */
export interface PaginatedResponse<TRow> {
  /** The page of rows. */
  rows?: TRow[];
  /** Rows in the whole matching set, not just this page. */
  total: number;
  /** 1-based page number this payload answers for. */
  page: number;
  /** Rows per page this payload was built with. */
  limit: number;
  /** Whether a page exists after this one. */
  hasNextPage?: boolean;
  /**
   * Distinct-value counts for `query.facets`. Present when the source
   * declared `supports.facets` and the endpoint answered those keys.
   */
  facets?: FacetMap;
}

/**
 * Strings the table renders. Pass pre-translated values (or wire them to
 * your i18n stack). Every key is optional; sensible English defaults fill
 * the gaps — see `defaultLabels`.
 *
 * @public
 */
export interface TableLabels {
  /** Accessible label for an unlabeled table. */
  table?: string;
  /** Accessible name for the search box. */
  search?: string;
  /** Placeholder text inside the search box. */
  searchPlaceholder?: string;
  /** Empty state when the table has no rows at all. */
  noData?: string;
  /** Empty state when an active search/filter matched nothing. */
  noResults?: string;
  /** Expand-row chevron label (suffixed with the row identity). */
  expandRow?: string;
  /** Collapse-row chevron label. */
  collapseRow?: string;
  /** Range-widget operator select placeholder. */
  operator?: string;
  /** Range-widget single-value placeholder. */
  value?: string;
  /** Range-widget lower-bound placeholder. */
  from?: string;
  /** Range-widget upper-bound placeholder. */
  to?: string;
  /** Number operator: exactly equal. */
  opEqual?: string;
  /** Number operator: greater than or equal. */
  opAtLeast?: string;
  /** Number operator: less than or equal. */
  opAtMost?: string;
  /** Operator: inclusive range. */
  opBetween?: string;
  /** Date operator: exactly on the day. */
  opOn?: string;
  /** Date operator: on or after the day. */
  opOnOrAfter?: string;
  /** Date operator: on or before the day. */
  opOnOrBefore?: string;
  /** Comparison: not equal. */
  opNotEqual?: string;
  /** Number operator: strictly greater than. */
  opGreater?: string;
  /** Number operator: strictly less than. */
  opLess?: string;
  /** Text operator: contains the term. */
  opContains?: string;
  /** Text operator: does not contain the term. */
  opNotContains?: string;
  /** Text operator: starts with the term. */
  opStartsWith?: string;
  /** Text operator: ends with the term. */
  opEndsWith?: string;
  /** Operator: the value is empty. */
  opEmpty?: string;
  /** Operator: the value is not empty. */
  opNotEmpty?: string;
  /** Number operator: is any of a list. */
  opIn?: string;
  /** Number operator: is none of a list. */
  opNotIn?: string;
  /** Date operator: strictly before the day. */
  opBefore?: string;
  /** Date operator: strictly after the day. */
  opAfter?: string;
  /** Date operator: a relative window (today, last N days, …). */
  opRelative?: string;
  /** Relative date: today. */
  relToday?: string;
  /** Relative date: yesterday. */
  relYesterday?: string;
  /** Relative date: tomorrow. */
  relTomorrow?: string;
  /** Relative date: this ISO week. */
  relThisWeek?: string;
  /** Relative date: this calendar month. */
  relThisMonth?: string;
  /** Relative date: previous calendar month. */
  relPreviousMonth?: string;
  /** Relative date: last N days. */
  relLastN?: string;
  /** Relative date: next N days. */
  relNextN?: string;
  /** Boolean filter: don't care (the default). */
  boolAny?: string;
  /** Boolean filter: require true. */
  boolTrue?: string;
  /** Boolean filter: require false. */
  boolFalse?: string;
  /** Saved-views menu trigger / list title. */
  savedViews?: string;
  /** Save-current-view action. */
  saveView?: string;
  /** Placeholder/label for the view-name input. */
  viewName?: string;
  /** Delete-a-view action (suffixed with the view name). */
  deleteView?: string;
  /** Rename a saved view. */
  renameView?: string;
  /** Apply a saved view to the table. */
  applyView?: string;
  /** Move a saved view one step earlier in the list. */
  moveViewUp?: string;
  /** Move a saved view one step later in the list. */
  moveViewDown?: string;
  /** Make a saved view the one the table opens with. */
  setDefaultView?: string;
  /** Marks the view the table opens with. */
  defaultViewBadge?: string;
  /** Marks a shared view this reader cannot change. */
  readOnlyViewBadge?: string;
  /** Banner: every row on this page is selected. */
  pageSelected?: (count: number) => string;
  /** Banner action: extend the selection to every matching row. */
  selectAllMatching?: (total: number) => string;
  /** Banner: the whole matching set is selected. */
  allMatchingSelected?: (total: number) => string;
  /** Shown while rows are being fetched. */
  loading?: string;
  /** Action that appends the next page to the rows on screen. */
  loadMore?: string;
  /** Name of the filters trigger, panel and column menu section. */
  filters?: string;
  /** Action that removes every active filter at once. */
  clearAll?: string;
  /** Accessible name for a single filter chip's remove button. */
  removeFilter?: (label: string) => string;
  /**
   * Label for the filter panel's closing action. Filters apply LIVE — the
   * button only closes the panel, so the key matches its "Done" wording
   * (and the `filters-done` part name).
   */
  filtersDone?: string;
  /** Heading for the AND/OR filter-tree builder. */
  filterTree?: string;
  /** Add a leaf condition to the filter tree. */
  filterAddCondition?: string;
  /** Add a nested AND/OR group to the filter tree. */
  filterAddGroup?: string;
  /** Combinator: every child must match. */
  filterCombinatorAnd?: string;
  /** Combinator: any child may match. */
  filterCombinatorOr?: string;
  /** Remove one tree condition. */
  filterRemoveCondition?: string;
  /** Remove a nested tree group. */
  filterRemoveGroup?: string;
  /** Field picker in the filter-tree builder. */
  filterField?: string;
  /** Search box inside an Excel-style checklist filter. */
  checklistSearch?: string;
  /** Clear the checklist selection. */
  checklistClear?: string;
  /** Empty state when the checklist search matches nothing. */
  checklistNoValues?: string;
  /** Accessible name of the compact header filter row. */
  headerFilters?: string;
  /** Prefix for a sort control's accessible name, before the column. */
  sortBy?: string;
  /** Accessible name for the page-size select. */
  rowsPerPage?: string;
  /** Header of the per-row actions column. */
  actions?: string;
  /** Accessible name for the header checkbox that selects the page. */
  selectAll?: string;
  /** Accessible name for a row's selection checkbox. */
  selectRow?: string;
  /**
   * Accessible name for the header checkbox that selects a column
   * (`columnSelectionCheckbox`). The column's own name is appended.
   */
  selectColumn?: string;
  /** Action that abandons an edit or closes a prompt. */
  cancel?: string;
  /** Action that re-runs a failed load. */
  retry?: string;
  /** Heading of the error state. */
  errorTitle?: string;
  /** Body of the error state, under the heading. */
  errorMessage?: string;
  /** Accessible label for the previous-page control. */
  previousPage?: string;
  /** Accessible label for the next-page control. */
  nextPage?: string;
  /** Builds the accessible "go to page N" label for numbered pagers. */
  goToPage?: (page: number) => string;
  /** Builds the "selected N" label. */
  selectedCount?: (count: number) => string;
  /** Builds the "showing X–Y of Z" label. */
  showing?: (range: { from: number; to: number; total: number }) => string;
  /** Builds the "page X of Y" label. */
  pageOf?: (range: { page: number; total: number }) => string;
  /** Label for the column-management menu trigger. */
  columns?: string;
  /** Pin-column menu actions. */
  pinStart?: string;
  /** Column-menu action that pins the column to the trailing edge. */
  pinEnd?: string;
  /** Column-menu action that returns a pinned column to the scroll area. */
  unpin?: string;
  /** Reorder-column menu actions. */
  moveStart?: string;
  /** Column-menu action that moves the column to the last position. */
  moveEnd?: string;
  /** Reset the column layout to defaults. */
  resetColumns?: string;
  /** The column menu's "size every column to its content" action. */
  autoSizeColumns?: string;
  /** Accessible hint on a resize handle: double-click sizes to content. */
  autoSizeColumn?: string;
  /** Accessible label for a column-resize handle. */
  resizeColumn?: string;
  /** Accessible label prefix for the column-menu visibility toggle (show). */
  showColumn?: string;
  /** Accessible label prefix for the column-menu visibility toggle (hide). */
  hideColumn?: string;
  /** Search box inside the column menu. */
  searchColumns?: string;
  /** Show every unlocked hidden column. */
  showAllColumns?: string;
  /** Hide every unlocked visible column. */
  hideAllColumns?: string;
  /** Unpin every unlocked column. */
  unpinAllColumns?: string;
  /** Restore one column's visibility, pin and width. */
  resetColumn?: string;
  /** Open the inline column-name editor. */
  renameColumn?: string;
  /** Visible label for the column-name input. */
  columnName?: string;
  /** Submit the column-name editor. */
  saveColumnName?: string;
  /** Dismiss the column-name editor without changing the name. */
  cancelColumnRename?: string;
  /** Validation message for an empty column name. */
  columnNameRequired?: string;
  /** Polite live-region message after a column name changes. */
  columnRenamed?: (info: { previous: string; name: string }) => string;
  /** Sort this column ascending from the column-menu submenu. */
  sortAscending?: string;
  /** Sort this column descending from the column-menu submenu. */
  sortDescending?: string;
  /**
   * Announced politely once a sort settles, so a screen-reader user learns the
   * order changed — the rows are re-read from the top with no visible cue and
   * no change in row count. Names the column and the direction in one phrase,
   * because a live region reads its whole message at once.
   */
  sortedBy?: (info: { column: string; ascending: boolean }) => string;
  /** Announced politely when the last sort is removed. */
  sortingCleared?: string;
  /** Open the table filters from a column-menu submenu. */
  filterColumn?: string;
  /** Accessible name of the per-column submenu trigger. */
  columnActions?: string;
  /** Toolbar CSV export button. */
  exportCsv?: string;
  /**
   * Toolbar export button for any other format: given the extension a writer
   * produces (`"xlsx"`, or whatever a custom one names itself), return the
   * button's caption. Defaults to `"Export XLSX"` and its translations.
   *
   * CSV keeps `TableLabels.exportCsv`, so its existing translations stand
   * and a host that overrode that string keeps their own wording.
   */
  exportFile?: (format: string) => string;
  /** Shown and announced when a server-built export starts. */
  exportStarted?: string;
  /** Visible and announced determinate export progress. */
  exportProgress?: (progress: number) => string;
  /**
   * Announced when an export finishes. A download gives a screen-reader user
   * no feedback of its own, so without this the button simply goes quiet.
   */
  exportDone?: string;
  /** Announced when an export fails, so a silent failure is never silent. */
  exportFailed?: string;
  /** Shown and announced after the reader cancels a server-built export. */
  exportCancelled?: string;
  /** Link label for a server-built export that resolves a download URL. */
  exportDownload?: string;
  /** Dismisses a finished, failed, or cancelled server-export surface. */
  exportDismiss?: string;
  /** Accessible name for starting inline cell edit (double-click / activate). */
  editCell?: string;
  /**
   * The control a failed save offers beside its message: put the value back the
   * way it was. Only rendered when the table was told how (`onEditRollback`).
   */
  undoEdit?: string;
  /** Accessible name for opening a whole row for editing (`rowEditing`). */
  /** The toolbar control that puts the last edit back (`undoRedoButtons`). */
  redoEdit?: string;
  /** Accessible name for the side panel's tab strip (`sidePanel`). */
  sidePanel?: string;
  /** Accessible name for a context menu (`contextMenu`). */
  contextMenu?: string;
  /** Accessible name for the command palette dialog. */
  commandPalette?: string;
  /** Placeholder and label for the palette's search box. */
  commandSearch?: string;
  /** Shown when a query matches no command. */
  commandEmpty?: string;
  /**
   * The palette command that opens the print dialog, and the caption on the
   * toolbar button when `printButton` asks for one.
   */
  print?: string;
  /** Accessible name for the density chooser. */
  density?: string;
  /** The roomy layout's caption. */
  densityComfortable?: string;
  /** The tight layout's caption. */
  densityCompact?: string;
  /** The fullscreen button, before it is on. */
  enterFullscreen?: string;
  /** The same button, after. */
  exitFullscreen?: string;
  /** The context-menu entry that copies the selection. */
  copyCells?: string;
  /** The context-menu entry that cuts it. */
  cutCells?: string;
  /** The control that closes the side panel. */
  closePanel?: string;
  /** The pivot panel's row-axis zone. */
  pivotRows?: string;
  /** The pivot panel's column-axis zone. */
  pivotColumns?: string;
  /** The pivot panel's measures zone. */
  pivotMeasures?: string;
  /** The control that adds a field to a pivot zone. */
  pivotAdd?: string;
  /** Take a field off a pivot zone. */
  pivotRemove?: string;
  /** Move a pivot field one step towards the outside. */
  pivotMoveUp?: string;
  /** Move a pivot field one step towards the inside. */
  pivotMoveDown?: string;
  /** The aggregation chooser on a pivot measure. */
  pivotAggregation?: string;
  /** Header over a pivot's grand-total column — "Total". */
  pivotTotal?: string;
  /** Caption on a pivot's grand-total line — "Grand total". */
  pivotGrandTotal?: string;
  /** Accessible name for entering row edit mode. */
  editRow?: string;
  /** Accessible name for committing a row edit. */
  saveRow?: string;
  /** How many rows a batch is holding — "3 unsaved rows". */
  pendingRows?: (count: number) => string;
  /** The control that commits a whole batch. */
  saveAll?: string;
  /** The control that discards one. */
  cancelAll?: string;
  /** Approve a pending agent proposal. */
  approveProposal?: string;
  /** Reject a pending agent proposal. */
  rejectProposal?: string;
  /** How many agent proposals are waiting — "2 proposed changes". */
  pendingProposals?: (count: number) => string;
  /**
   * One proposed cell change in the approval list. Names the row, the
   * column, and the before/after values so the reader can see the write
   * before it lands.
   */
  proposalChange?: (change: {
    row: string;
    column?: string;
    before?: string;
    after?: string;
  }) => string;
  /**
   * Shown in place of a before-value the reader's own view cannot supply.
   *
   * Distinct from a blank cell: this says nobody could look the value up,
   * not that it is empty.
   */
  proposalValueUnavailable?: string;
  /** Headline over a review: how many changes, across how many rows. */
  proposalSummary?: (counts: { changes: number; rows: number }) => string;
  /** Opens the full list when a review shows only the first few. */
  reviewAllProposals?: (count: number) => string;
  /** Leaves the full list and returns to the conversation. */
  backToConversation?: string;
  /** Approves everything, before any row has been decided on its own. */
  approveAllProposals?: string;
  /** Approves what is still undecided, once some rows have been decided. */
  approveRemainingProposals?: string;
  /** Rejects everything, before any row has been decided on its own. */
  rejectAllProposals?: string;
  /** Rejects what is still undecided, once some rows have been decided. */
  rejectRemainingProposals?: string;
  /**
   * Approves this write and stops asking about this capability.
   *
   * Only ever drawn when the table opted the capability in, so a reader who
   * never sees it is not missing a control — there is none to offer.
   */
  alwaysAllowProposal?: string;
  /** Live tally under a review in progress. */
  proposalTally?: (counts: {
    pending: number;
    approved: number;
    rejected: number;
  }) => string;
  /** Says a write is waiting, where the decision is made somewhere else. */
  approvalWaitingElsewhere?: string;
  /** Title of the assistant panel. */
  assistantTitle?: string;
  /** Accessible name of the control that opens the assistant. */
  assistantOpen?: string;
  /** Accessible name of the control that closes it. */
  assistantClose?: string;
  /** Accessible name of the assistant's settings control. */
  assistantSettings?: string;
  /** The question an empty conversation asks. */
  assistantEmpty?: string;
  /** Placeholder in the composer. */
  assistantPlaceholder?: string;
  /** The control that sends the draft. */
  assistantSend?: string;
  /** The control that stops a turn already running. */
  assistantStop?: string;
  /** Accessible name for the mic when it is idle. */
  assistantVoiceStart?: string;
  /** Accessible name for the mic while it is listening. */
  assistantVoiceStop?: string;
  /** Announced once when dictation starts. Never per word heard. */
  assistantVoiceListening?: string;
  /** Accessible name for the dictation language chooser. */
  assistantVoiceLanguage?: string;
  /** How a reader's own message is named. */
  assistantYou?: string;
  /** How the assistant's message is named. */
  assistantSpeaker?: string;
  /** The affordance that jumps to a reply which arrived off-screen. */
  assistantNewMessages?: string;
  /** Why the composer cannot be used. */
  assistantUnavailable?: string;
  /** Leaves a full-screen assistant on a narrow viewport. */
  assistantBackToTable?: string;
  /** Expands an action's detail. */
  assistantDetail?: string;
  /** What a staged write still needs from the reader. */
  assistantSaveInTable?: string;
  /** Puts back what one assistant turn changed. */
  assistantUndo?: string;
  /**
   * Why the undo is not on offer, from a token.
   *
   * `table-moved` is the one a reader sees: something else changed the view
   * after the turn settled. Returns `undefined` for a token this language has
   * no sentence for, and the panel says nothing rather than showing a code.
   */
  assistantUndoBlocked?: (code: string) => string | undefined;
  /**
   * Why a turn stopped with work still pending.
   *
   * Returns `undefined` for a code this language has no sentence for, and the
   * panel falls back to the runtime's own message — which is honest, if
   * written for a developer.
   */
  assistantUnresolved?: (code: string) => string | undefined;
  /** Accessible name for the free-text answer to a question. */
  assistantAnswerLabel?: string;
  /** Placeholder in that field. */
  assistantAnswerPlaceholder?: string;
  /** Sends a typed answer. */
  assistantAnswerSend?: string;
  /** Heading above the capabilities the reader stopped being asked about. */
  assistantAlwaysAllowedTitle?: string;
  /** Accessible name for the control that starts asking again. */
  assistantAlwaysAllowedRevoke?: (capability: string) => string;
  /**
   * A capability key as a reader-facing name.
   *
   * Returns `undefined` for a key this language has no name for, and the
   * surface shows the key — which is a developer detail, and the honest
   * fallback when nobody has named it.
   */
  assistantCapabilityName?: (capability: string) => string | undefined;
  /**
   * The connection badge, from a status token.
   *
   * Every token maps to a translated word, so the token itself never reaches
   * the reader — which is why this label interpolates none of its argument.
   */
  assistantConnection?: (status: string) => string;
  /**
   * One action receipt — the operation that ran and what became of it.
   *
   * `capability` is a stable technical key and appears as given; `status` is
   * a token this label turns into the reader's language.
   */
  assistantReceipt?: (receipt: {
    capability?: string;
    status: string;
  }) => string;
  /** Reopens the examples once a conversation has started. */
  assistantExamples?: string;
  /** Opens the eligible examples a first screen did not have room for. */
  assistantMoreExamples?: string;
  /**
   * The control that shows what a turn did.
   *
   * The count is the actions worth showing a reader — reads and other
   * plumbing are not among them.
   */
  assistantActions?: (count: number) => string;
  /**
   * The heading over what a turn did.
   *
   * Names the turn, not the table: a reader who has asked three things in a
   * row needs to know which reply this list belongs to, and "this result"
   * says nothing about which one.
   */
  assistantActionsTitle?: string;
  /** Puts everything in that list back at once. */
  assistantUndoAll?: string;
  /** One receipt status on its own, when the action's kind is unknown. */
  assistantReceiptStatus?: (status: string) => string;
  /**
   * A receipt's headline, from what changed and what became of it.
   *
   * Returns `undefined` for a pair this language has no sentence for, and
   * the panel falls back to {@link TableLabels.assistantReceiptStatus} —
   * a technical capability key never reaches the reader either way.
   */
  assistantReceiptAction?: (action: {
    kind?: string;
    status: string;
    /** Whether the action took something off rather than put it on. */
    cleared?: boolean;
  }) => string | undefined;
  /**
   * What the action acted on, from the columns and values it ran with.
   *
   * The panel is handed the pair structurally — `{ column: "Team", value:
   * "Platform" }` — because the word that joins them belongs to the reader's
   * language. Returns `undefined` when there is nothing to name, and the card
   * shows its headline alone.
   */
  assistantReceiptTerms?: (subject: {
    kind?: string;
    terms?: readonly { column?: string; value?: string }[];
    direction?: "asc" | "desc";
  }) => string | undefined;
  /** An edit's before/after pair, spoken for assistive technology. */
  assistantReceiptChange?: (change: {
    before: string;
    after: string;
  }) => string;
  /**
   * The same pair when nothing was applied, spoken for assistive technology.
   *
   * A refused, staged or still-pending edit shows its before and after so the
   * reader can see what was asked for — but saying it *changed* would claim
   * something the table never did.
   */
  assistantReceiptProposed?: (change: {
    before: string;
    after: string;
  }) => string;
  /** The toolbar control that adds a row (`onAddRow`). */
  addRow?: string;
  /** The row action that copies a row (`onDuplicateRow`). */
  duplicateRow?: string;
  /** The row action that removes one (`onDeleteRow`). */
  deleteRow?: string;
  /** The question the delete dialog asks before it runs. */
  deleteRowConfirm?: string;
  /**
   * Accessible name of the 3-dot control that opens the row-actions menu
   * (`rowActionsLayout="menu"`).
   */
  rowActionsMenu?: string;
  /**
   * The message on an editor whose row changed under it. Keep mine / Take
   * theirs sit beside it, and `TableLabels.theirsValue` names the
   * incoming value so the reader can see what they would take.
   */
  editConflict?: string;
  /** Keep the draft; accept the incoming row as the new snapshot. */
  keepMine?: string;
  /** Replace the draft with the incoming value. */
  takeTheirs?: string;
  /** The incoming value on the conflict notice (`Theirs: ada@…`). */
  theirsValue?: (value: string) => string;
  /** Accessible name of the row-reorder grip, and the Columns-menu row. */
  reorderRow?: string;
  /** Mobile: move this card one slot earlier. */
  moveRowUp?: string;
  /** Mobile: move this card one slot later. */
  moveRowDown?: string;
  /** Live region: the reader lifted the row at this 1-based position. */
  rowLifted?: (position: number) => string;
  /** Live region: the row moved from one 1-based position to another. */
  rowMoved?: (from: number, to: number) => string;
  /** Live region: Escape cancelled a lift. */
  rowReorderCancelled?: string;
  /** Accessible name for the row-move menu trigger. */
  rowMoveOptions?: string;
  /** Opens the target-group picker. */
  moveToGroup?: string;
  /** Opens the target-parent picker. */
  moveUnder?: string;
  /** Tree destination with no parent. */
  moveToTopLevel?: string;
  /** Heading on the built-in confirmation surface. */
  confirmRowMoveTitle?: string;
  /** Concrete source and destination shown before a move. */
  confirmRowMoveDescription?: (row: string, from: string, to: string) => string;
  /** Button that approves a pending row move. */
  confirmRowMove?: string;
  /** Live region: the row entered another group. */
  rowMovedToGroup?: (group: string) => string;
  /** Live region: the row entered another tree parent. */
  rowMovedUnder?: (parent: string) => string;
  /** Cross-boundary moves were disabled by policy. */
  moveRejectedPolicyNever?: string;
  /** Visual order cannot be written while a sort owns it. */
  moveRejectedSorted?: string;
  /** A tree node cannot become its own ancestor. */
  moveRejectedCycle?: string;
  /** The host did not provide the matching move callback. */
  moveUnavailable?: string;
  /** Label for the tree's root level. */
  rootLevel?: string;
  /** Pin this row above the scroll window. */
  pinToTop?: string;
  /** Pin this row below the scroll window. */
  pinToBottom?: string;
  /** Release a pinned row back into the scroll window. */
  unpinRow?: string;
  /** Accessible name for an independent pinned summary row. */
  pinnedSummaryRow?: string;
  /** Visible and accessible name for the top summary band. */
  pinnedSummaryTop?: string;
  /** Visible and accessible name for the bottom summary band. */
  pinnedSummaryBottom?: string;
  /** Accessible name of a decorative separator row. */
  rowSeparator?: string;
  /** Expand a collapsed column group back to its leaves. */
  expandColumnGroup?: string;
  /** Collapse a column group (stub, kept child, or collapsedRender). */
  collapseColumnGroup?: string;
  /**
   * The selected rectangle, for the grid's live region: given its 1-based edges
   * and how many cells it covers, return what a screen reader should hear when
   * the selection changes. Defaults to
   * `"selected rows 3 to 7, columns 2 to 4, 15 cells"`.
   */
  gridRangeSelection?: (range: {
    fromRow: number;
    toRow: number;
    fromColumn: number;
    toColumn: number;
    cells: number;
  }) => string;
  /** Announced after a copy: given the cell count, what was taken. */
  gridRangeCopied?: (cells: number) => string;
  /** Announced when the clipboard refused the copy — never a silent failure. */
  gridRangeCopyFailed?: string;
  /** Announced after a paste: given the cell count, what was written. */
  gridRangePasted?: (cells: number) => string;
  /** Announced when the browser refused to hand over the clipboard. */
  gridRangePasteFailed?: string;
  /** Announced after a fill: given the cell count, what was written. */
  gridRangeFilled?: (cells: number) => string;
  /** Accessible name of the fill handle on the selection's corner. */
  gridFillHandle?: string;
  /** Leads the selected-cell count in the statistics strip. */
  selectionCount?: string;
  /** Leads the sum of the selected numbers. */
  selectionSum?: string;
  /** Leads the average of the selected numbers. */
  selectionAverage?: string;
  /** Leads the smallest selected number. */
  selectionMin?: string;
  /** Leads the largest selected number. */
  selectionMax?: string;
  /** Announced after an undo: given the cell count, what came back. */
  editUndone?: (cells: number) => string;
  /** Announced after a redo: given the cell count, what was rewritten. */
  editRedone?: (cells: number) => string;
  /** Announced when the key was pressed and the history was empty. */
  editNothingToUndo?: string;
  /** Accessible name of the find input, and the find bar's own name. */
  findInTable?: string;
  /** Placeholder inside the find input. */
  findPlaceholder?: string;
  /** Given the current hit and the total, the count the bar shows. */
  findMatchCount?: (current: number, total: number) => string;
  /** Accessible name of the previous-match button. */
  findPrevious?: string;
  /** Accessible name of the next-match button. */
  findNext?: string;
  /** Accessible name of the close button. */
  findClose?: string;
  /**
   * Where keyboard focus is, for the grid's live region: given the 1-based row
   * and the dataset total, return the phrase a screen reader should append
   * after the column and the cell's text. Defaults to `"row 41 of 10000"`.
   *
   * Takes the total, not the rendered count, because virtualization renders 24
   * rows of 100,000 and "row 3 of 24" would be a lie.
   */
  gridCellPosition?: (row: number, total: number) => string;
  /** Given how many are left, the row offering more groups. */
  moreGroups?: (remaining: number) => string;
  /** Given how many are left, the row offering more rows inside a group. */
  moreRowsInGroup?: (remaining: number) => string;
  /** Given a group's label, the caption on its footer row — "Core total". */
  groupTotal?: (label: string) => string;
  /** Expand-group chevron accessible name. */
  expandGroup?: string;
  /** Collapse-group chevron accessible name. */
  collapseGroup?: string;
  /** Leaf-count suffix on a group header, e.g. `(12)`. */
  groupCount?: (count: number) => string;
  /** Visible and accessible name of the interactive grouping strip. */
  groupingPanel?: string;
  /** Instruction shown by the desktop grouping drop target. */
  groupingDropColumns?: string;
  /** Accessible label of the select that adds a grouping field. */
  addGroupingColumn?: string;
  /** Add one named column to row grouping. */
  groupByColumn?: (label: string) => string;
  /** Remove one named column from row grouping. */
  ungroupColumn?: (label: string) => string;
  /** Remove one grouping field. */
  removeGroupingColumn?: (label: string) => string;
  /** Keyboard drag handle for one grouping field. */
  moveGroupingColumn?: (label: string) => string;
  /** Chip-only drop target that removes a grouping field. */
  groupingDropToRemove?: string;
  /** Select the column whose group aggregate is being changed. */
  groupingAggregateColumn?: string;
  /** Label for a grouped-table aggregation picker. */
  groupingAggregation?: string;
  /** Preserve the developer-provided aggregation. */
  groupingAggregationDefault?: string;
  /** Explicitly hide a column's group aggregate. */
  groupingAggregationNone?: string;
  /** Accessible name of the aggregations group — there is no visible heading. */
  groupingAggregations?: string;
  /** Placeholder and accessible name of the control that adds an aggregation. */
  groupingAddAggregation?: string;
  /** Puts the developer's whole aggregation setup back. */
  groupingRestoreAggregations?: string;
  /** Takes one column's aggregation away. */
  groupingRemoveAggregation?: (column: string) => string;
  /** Names the operation control of one active aggregation. */
  groupingAggregationFor?: (column: string) => string;
  /** Marks an aggregate the host owns and the reader cannot change. */
  groupingAggregationReadOnly?: string;
  /** Honest label for a host aggregate whose operation is unknown. */
  groupingAggregationCustom?: string;
  /** Polite announcement after a column's aggregate is taken away. */
  groupingAggregateRemoved?: (column: string) => string;
  /** Polite announcement after the declared aggregations are restored. */
  groupingAggregatesRestored?: string;
  /** Full label for the average aggregation choice. */
  groupingAverage?: string;
  /** Polite announcement after adding a grouping field. */
  groupingAdded?: (label: string) => string;
  /** Polite announcement after removing a grouping field. */
  groupingRemoved?: (label: string) => string;
  /** Polite announcement after changing nesting order. */
  groupingMoved?: (label: string, position: number) => string;
  /** Polite announcement after changing one aggregation choice. */
  groupingAggregateChanged?: (label: string, aggregation: string) => string;
  /**
   * Status copy when `virtualize` is on a paged table, which stays one page.
   */
  noticeVirtualizePaged?: string;
  /** Status copy when row pin is on while grouping or a tree is on. */
  noticePinNested?: string;
  /**
   * Compatibility override for the former nested-reorder notice.
   *
   * @deprecated Nested reorder is supported and no longer emits this notice.
   */
  noticeReorderNested?: string;
  /**
   * Status copy when `groupBy` is set and the source's capabilities say it
   * cannot group.
   */
  noticeGroupingUnavailable?: string;
  /**
   * Status copy when `exportCsv.scope` is `"all"` and the source's export
   * scope is one page, which disables the button.
   */
  noticeExportAllPage?: string;
  /**
   * Status copy when editing is opted in without the matching write
   * callback (`onCellEdit` / `onRowEdit` / `onBatchEdit`).
   */
  noticeEditWithoutWriter?: string;
}
