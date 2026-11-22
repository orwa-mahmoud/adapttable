/**
 * The mobile cards, drawn once for every kit.
 *
 * The binding builds each region of a card: the tree, select and expand
 * controls, the labelled fields (or the host's own card), the reorder
 * buttons, the row editor, the actions and the detail. A kit hands over a
 * frame that arranges those regions, its field label and value, its select
 * control, its card and summary elements, and the spacing that keeps the
 * list in its library's rhythm.
 */

import { cellFlashAttr, mobileCardListStyle } from "@adapttable/core/binding";
import {
  type ComponentType,
  type CSSProperties,
  memo,
  type ReactElement,
  type ReactNode,
  useMemo,
} from "react";

import type { ColumnDef } from "../columnDef";
import { resolveMobileLabel } from "../display";
import {
  resolveRowEditTrigger,
  rowEditConflict,
} from "../editing/rowEditTrigger";
import { FeatureSlot } from "../features/providers";
import {
  EXPAND_TOGGLE,
  GROUP_HEADER_CARD,
  type GroupHeaderCardSlotProps,
  ROW_EDIT_ACTIONS,
  ROW_REORDER_BUTTONS,
  TREE_TOGGLE,
} from "../features/slotKeys";
import {
  MobileCardsChrome,
  type MobileCardsChromeProps,
} from "../layout/mobileCardsChrome";
import {
  type MobileCardBodyProps,
  type MobileCardEntry,
  mobileCardPropsEqual,
  type MobileCardSlotKit,
  mobileCardSlots,
} from "../layout/mobileCardSlots";
import {
  type SharedTableRenderProps,
  useSummaryCells,
} from "../tableRenderProps";
import { mobileCardRegionProps } from "../virtual/mobileCardRegion";
import { CellContent } from "./featureSlots";
import { MobileTarget } from "./mobileTarget";
import { type KitUsePartClass, noPartClass } from "./partClass";
import type { KitDataAttributes } from "./primitives";

/**
 * The list's group header, footer and show-more card, drawn by the
 * `GroupHeaderCard` feature slot with the table's grouping.
 */
function groupCardOf<TRow>(
  shared: Pick<
    GroupHeaderCardSlotProps<TRow>,
    "columns" | "selection" | "labels" | "compact"
  >
): MobileCardSlotKit<TRow>["groupCard"] {
  return function GroupCard(entry, grouping) {
    const props: GroupHeaderCardSlotProps<TRow> = {
      entry,
      ...shared,
      onToggleCollapse: (groupKey) => grouping.collapsed.toggle(groupKey),
      onShowMore: grouping.showMore,
    };
    return (
      <FeatureSlot
        slot={GROUP_HEADER_CARD}
        props={props as unknown as GroupHeaderCardSlotProps<unknown>}
      />
    );
  };
}

/**
 * The regions of one card, built; the kit's frame places them.
 *
 * @public
 */
export interface KitCardRegions {
  /** The tree toggle, on a tree row. */
  readonly tree: ReactNode;
  /** The select control, while rows can be selected. */
  readonly select: ReactNode;
  /** The expand toggle, while rows have a detail. */
  readonly expand: ReactNode;
  /** The labelled fields, or the host's own card. */
  readonly body: ReactNode;
  /** Move-up and move-down, while rows can be reordered. */
  readonly reorder: ReactNode;
  /** Save and cancel, while rows are edited a whole row at a time. */
  readonly rowEdit: ReactNode;
  /** The row's actions, in their part. */
  readonly actions: ReactNode;
  /** The row's detail, in its part, while expanded. */
  readonly detail: ReactNode;
  /** Whether the table is compact. */
  readonly compact: boolean;
}

/**
 * A field's label or value: the binding's part attributes and content.
 *
 * @public
 */
export interface KitCardTextProps extends KitDataAttributes {
  /** Whether the field has a label; an unlabelled value spans the card. */
  readonly labelled: boolean;
  /** The text. */
  readonly children: ReactNode;
}

/**
 * The card's select control.
 *
 * @public
 */
export interface KitCardSelectProps {
  /** Whether the row is selected. */
  readonly checked: boolean;
  /** Toggle the row. */
  readonly onToggle: () => void;
  /** The control's name. */
  readonly "aria-label": string;
}

/**
 * One field of the summary card.
 *
 * @public
 */
export interface KitSummaryField {
  /** The column key. */
  readonly key: string;
  /** The column's label on a card, if it shows one. */
  readonly label: ReactNode;
  /** The column's summary. */
  readonly value: ReactNode;
}

/**
 * A kit's spacing for the cards.
 *
 * @public
 */
export interface KitCardsLook {
  /** The grid of fields. */
  readonly grid: (compact: boolean) => CSSProperties;
  /** One field's box, labelled or spanning the card, in a compact list or not. */
  readonly field: (labelled: boolean, compact: boolean) => CSSProperties;
  /** The actions' box. */
  readonly actions: CSSProperties;
  /** The detail's box. */
  readonly detail: CSSProperties;
}

/**
 * The props a kit's card list takes: the shared render bundle, plus what the
 * kit itself adds.
 *
 * @public
 */
export type KitMobileCardsProps<TRow, TExtra> = SharedTableRenderProps<TRow> & {
  /** Text direction, when the host set one. */
  readonly dir?: "ltr" | "rtl";
} & TExtra;

/**
 * What a kit hands {@link createMobileCards}.
 *
 * @typeParam TExtra - The props the kit's card list takes beyond the shared
 *   ones.
 *
 * @public
 */
export interface KitMobileCards<TExtra> {
  /** Arranges one card's regions. */
  readonly CardFrame: ComponentType<KitCardRegions>;
  /** A field's label. */
  readonly FieldLabel: ComponentType<KitCardTextProps>;
  /** A field's value. */
  readonly FieldValue: ComponentType<KitCardTextProps>;
  /** The card's select control. */
  readonly Select: ComponentType<KitCardSelectProps>;
  /** A row's actions, sized for touch. */
  readonly RowActions: <TRow>(props: {
    readonly minTargetSize: number;
    readonly row: TRow;
    readonly actions: ReturnType<typeof resolveRowEditTrigger<TRow>>["actions"];
    readonly confirm: MobileCardBodyProps<TRow>["confirm"];
    readonly labels: MobileCardBodyProps<TRow>["labels"];
    readonly layout: MobileCardBodyProps<TRow>["rowActionsLayout"];
    readonly render: MobileCardBodyProps<TRow>["renderRowActions"];
  }) => ReactNode;
  /** The summary card, from the columns that have a summary. */
  readonly SummaryCard: ComponentType<{
    readonly fields: readonly KitSummaryField[];
    readonly compact: boolean;
  }>;
  /**
   * Where the summary card goes: as the list's last card, above a trailing
   * virtual spacer, or after the list.
   */
  readonly summaryPlacement: "last-card" | "after-list";
  /** The look, as a hook so it can read the kit's theme. */
  readonly useLook: () => KitCardsLook;
  /** Whether these props draw a compact list. */
  readonly compact: <TRow>(props: KitMobileCardsProps<TRow, TExtra>) => boolean;
  /** A card element's props, beside the binding's item props. */
  readonly cardProps: <TRow>(
    entry: MobileCardEntry<TRow>,
    props: KitMobileCardsProps<TRow, TExtra>
  ) => Record<string, unknown>;
  /** The cell of an extra row drawn as a card. */
  readonly extraCell: (part: string, content: ReactNode) => ReactNode;
  /** An extra row's card element props, beside the binding's. */
  readonly extraProps?: NonNullable<MobileCardSlotKit<unknown>["extraProps"]>;
  /** A group card's list element props; absent, the group card stands alone. */
  readonly groupProps?: NonNullable<MobileCardSlotKit<unknown>["groupProps"]>;
  /**
   * The host's class for a part the binding draws itself: each field's row,
   * the actions and detail boxes, and the tree and reorder controls. A hook,
   * so it can read the kit's class map; absent, those parts carry no class.
   */
  readonly usePartClass?: KitUsePartClass;
  /** The list elements and their props. */
  readonly useChrome: <TRow>(
    props: KitMobileCardsProps<TRow, TExtra>,
    compact: boolean
  ) => Pick<
    MobileCardsChromeProps,
    "hosts" | "listProps" | "listStyle" | "classNames" | "dir"
  >;
}

interface CardExtras {
  readonly compact: boolean;
  readonly dir: "ltr" | "rtl" | undefined;
}

const NO_TREE_TOGGLE = (): void => undefined;

/**
 * Build a kit's mobile card list.
 *
 * @param kit - The kit's frame, fields, controls and list elements.
 * @returns The card list component.
 *
 * @public
 */
export function createMobileCards<TExtra>(
  kit: KitMobileCards<TExtra>
): <TRow>(props: Readonly<KitMobileCardsProps<TRow, TExtra>>) => ReactElement {
  const { CardFrame, FieldLabel, FieldValue, Select, RowActions } = kit;
  const usePartClass = kit.usePartClass ?? noPartClass;

  function CardBase<TRow>(
    props: Readonly<MobileCardBodyProps<TRow> & CardExtras>
  ): ReactElement {
    // The card is memoized whole with its own equality; a cache inside would
    // repeat it.
    "use no memo";
    const {
      row,
      index,
      id,
      columns,
      labels,
      confirm,
      rowActions,
      rowActionsLayout,
      renderRowActions,
      isCellFlashing,
      selected,
      expanded,
      onToggleSelect,
      onToggleExpand,
      renderDetail,
      editing,
      rows,
      getRowId,
      treeEntry,
      onToggleTree,
      rowReorder,
      windowStart,
      rowCount,
      renderCard,
      compact,
      dir,
    } = props;
    const look = kit.useLook();
    const classOf = usePartClass();
    // Built once and used by both paths, so a custom card shows the very
    // same value node the built-in would have — cell renderers and editors
    // included.
    const fields = columns.map((column) => ({
      column,
      label: resolveMobileLabel(column),
      value: (
        <CellContent
          // Built inside the map, so it needs its own key: React reads these
          // as a list even though a card renders them one at a time.
          key={column.key}
          editing={editing}
          row={row}
          column={column}
          rowId={id}
          rowIndex={index}
          rows={rows}
          columns={columns}
          rowKey={getRowId}
          editLabel={labels.editCell}
          undoLabel={labels.undoEdit}
        />
      ),
    }));
    const rowEdit = resolveRowEditTrigger(
      rowActions,
      editing?.rowEditing,
      row,
      id
    );
    const body = renderCard ? (
      renderCard(row, { index, fields, selected, expanded })
    ) : (
      <div style={look.grid(compact)}>
        {fields.map(({ column, label, value }) => {
          const labelled = Boolean(label);
          return (
            <div
              key={column.key}
              data-adapttable-part="card-row"
              className={classOf("card-row")}
              style={look.field(labelled, compact)}
            >
              {labelled && (
                <FieldLabel labelled data-adapttable-part="card-label">
                  {label}
                </FieldLabel>
              )}
              <FieldValue
                labelled={labelled}
                data-adapttable-part="card-value"
                data-flash={cellFlashAttr(isCellFlashing, id, column.key)}
              >
                {value}
              </FieldValue>
            </div>
          );
        })}
      </div>
    );
    return (
      <MobileTarget.Provider value={true}>
        <CardFrame
          compact={compact}
          tree={
            treeEntry ? (
              <FeatureSlot
                slot={TREE_TOGGLE}
                props={{
                  entry: treeEntry,
                  labels,
                  onToggle: onToggleTree ?? NO_TREE_TOGGLE,
                  toggleClassName: classOf("tree-toggle"),
                  spacerClassName: classOf("tree-spacer"),
                }}
              />
            ) : null
          }
          select={
            onToggleSelect ? (
              <Select
                aria-label={labels.selectRow}
                checked={selected}
                onToggle={() => onToggleSelect(id)}
              />
            ) : null
          }
          expand={
            onToggleExpand ? (
              <FeatureSlot
                slot={EXPAND_TOGGLE}
                props={{
                  id,
                  expanded,
                  onToggle: onToggleExpand,
                  dir,
                  expandLabel: labels.expandRow,
                  collapseLabel: labels.collapseRow,
                }}
              />
            ) : null
          }
          body={body}
          reorder={
            rowReorder ? (
              <FeatureSlot
                slot={ROW_REORDER_BUTTONS}
                props={{
                  reorder: rowReorder,
                  labels,
                  localIndex: index,
                  row,
                  windowStart,
                  rowCount,
                  className: classOf("row-reorder-buttons"),
                  upClassName: classOf("row-reorder-up"),
                  downClassName: classOf("row-reorder-down"),
                }}
              />
            ) : null
          }
          rowEdit={
            editing?.rowEditing ? (
              <FeatureSlot
                slot={ROW_EDIT_ACTIONS}
                props={{
                  rowEditing: editing.rowEditing,
                  row,
                  rowId: id,
                  showBegin: rowEdit.showBegin,
                  icons: editing.rowEditIcons,
                  conflict: rowEditConflict(editing, id),
                  labels,
                }}
              />
            ) : null
          }
          actions={
            rowEdit.actions.length > 0 ? (
              <div
                data-adapttable-part="card-actions"
                className={classOf("card-actions")}
                style={look.actions}
              >
                <RowActions
                  minTargetSize={44}
                  row={row}
                  actions={rowEdit.actions}
                  confirm={confirm}
                  labels={labels}
                  layout={rowActionsLayout}
                  render={renderRowActions}
                />
              </div>
            ) : null
          }
          detail={
            // Inside the card, and so inside the measured element, so
            // virtualization keeps accurate card heights.
            expanded && renderDetail ? (
              <div
                data-adapttable-part="card-detail"
                className={classOf("card-detail")}
                style={look.detail}
              >
                {renderDetail(row)}
              </div>
            ) : null
          }
        />
      </MobileTarget.Provider>
    );
  }

  return function MobileCards<TRow>(
    props: Readonly<KitMobileCardsProps<TRow, TExtra>>
  ): ReactElement {
    // The compiler's cache around these slots is larger than the slots.
    "use no memo";
    const {
      table,
      rows,
      summaryRow,
      paddingTop = 0,
      paddingBottom = 0,
      maxHeight,
      virtualScrollRef,
    } = props;
    const { columns, selection, labels } = table;
    const compact = kit.compact(props);
    const chrome = kit.useChrome(props, compact);
    // The summary renders as a final card. Header groups and multi-sort are
    // desktop-only concerns: cards have no column grid for a group to span
    // and no clickable headers to shift-click.
    const summaryCells = useSummaryCells(summaryRow, rows);
    // `memo` erases generics at module level, so the memoized card is
    // instantiated here, once for the list's life.
    const CardItem = useMemo(
      () =>
        memo(
          CardBase<TRow>,
          mobileCardPropsEqual<TRow, MobileCardBodyProps<TRow> & CardExtras>([
            "compact",
            "dir",
          ])
        ),
      []
    );
    const cards = mobileCardSlots(props, {
      card: (entry) => ({
        key: entry.key,
        props: { ...entry.itemProps, ...kit.cardProps(entry, props) },
        content: <CardItem {...entry.body} compact={compact} dir={props.dir} />,
      }),
      extraCell: kit.extraCell,
      extraProps: kit.extraProps,
      groupProps: kit.groupProps,
      groupCard: groupCardOf<TRow>({ columns, selection, labels, compact }),
    });
    // Unlike the desktop footer, a card has no columns to keep aligned, so
    // columns without a summary are skipped.
    const summary = summaryCells ? (
      <kit.SummaryCard
        compact={compact}
        fields={columns
          .filter((column) => summaryCells[column.key] !== undefined)
          .map((column: ColumnDef<TRow>) => ({
            key: column.key,
            label: resolveMobileLabel(column),
            value: summaryCells[column.key],
          }))}
      />
    ) : null;
    if (summary && kit.summaryPlacement === "last-card") {
      cards.push({
        key: "summary",
        props: { "data-passthrough": "" },
        content: summary,
      });
    }
    return (
      <MobileCardsChrome
        {...chrome}
        regionProps={mobileCardRegionProps(
          table.getTableProps()["aria-label"],
          labels.table,
          maxHeight
        )}
        scrollRef={virtualScrollRef}
        style={mobileCardListStyle(maxHeight)}
        paddingTop={paddingTop}
        paddingBottom={paddingBottom}
        cards={cards}
        summary={kit.summaryPlacement === "after-list" ? summary : undefined}
      />
    );
  };
}
