/**
 * The group header, footer and "show more" rows and cards, drawn once for
 * every kit.
 *
 * The binding decides what each holds: the collapse toggle (none on a footer
 * or "show more"), the group's select-all, the label, the count, and the
 * subtotals under their columns on a row or captioned on a card. A kit hands
 * over its toggle, its text, the frame of a card, and its spacing; a row is
 * drawn with the kit's desktop row and cells.
 */
import { type GroupedFlatEntry, type TableLabels } from "@adapttable/core";
import {
  groupAggregateEntries,
  groupLeafCount,
  groupRowLayout,
  groupSelectionState,
} from "@adapttable/core/grouping";
import {
  type ComponentType,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
  useMemo,
} from "react";

import type { ColumnDef } from "../columnDef";
import {
  groupIndentStyle,
  groupRowParts,
  resolveMobileLabel,
} from "../display";
import { GroupToggleSpacer } from "../grouping/GroupToggleSpacer";
import type { SelectionState } from "../selection/useSelection";
import type { KitDesktopCellProps, KitDesktopRowProps } from "./desktopTable";
import type { KitCheckboxProps, KitDataAttributes } from "./primitives";

/**
 * The props of a group row or card.
 *
 * @public
 */
export interface KitGroupHeaderProps<TRow> {
  /** The group, its footer or its "show more". */
  readonly entry: Extract<
    GroupedFlatEntry<TRow>,
    { kind: "group" | "groupFooter" | "groupMore" }
  >;
  /** The visible columns. */
  readonly columns: readonly ColumnDef<TRow>[];
  /** Resolved labels. */
  readonly labels: Required<TableLabels>;
  /** The selection, while rows can be selected. */
  readonly selection: SelectionState | null;
  /** Collapse or expand a group. */
  readonly onToggleCollapse: (groupKey: string) => void;
  /** Reveal more groups or more of a group's rows. */
  readonly onShowMore: (entry: {
    scope: "groups" | "rows";
    groupKey?: string;
  }) => void;
}

/**
 * The extra props of a group row.
 *
 * @public
 */
export interface KitGroupRowProps<TRow> extends KitGroupHeaderProps<TRow> {
  /** How many rail cells come before the columns. */
  readonly leadingCells: number;
  /** Whether a trailing actions column follows them. */
  readonly showActions: boolean;
  /** A column's cell attributes. */
  readonly getCellProps: (column: ColumnDef<TRow>) => Record<string, unknown>;
}

/**
 * Which text of a group a kit is drawing.
 *
 * @public
 */
export type KitGroupTextKind = "label" | "count" | "aggregate" | "caption";

/**
 * A group's text: its role, the binding's part attributes and the content.
 *
 * @public
 */
export interface KitGroupTextProps extends KitDataAttributes {
  /** Which text this is. */
  readonly kind: KitGroupTextKind;
  /** Layout the binding adds, such as pushing a subtotal to the end. */
  readonly style?: CSSProperties;
  /** The text. */
  readonly children: ReactNode;
}

/**
 * The collapse toggle of a group.
 *
 * @public
 */
export interface KitGroupToggleProps {
  /** Whether the group is open. */
  readonly expanded: boolean;
  /** The toggle's name. */
  readonly label: string;
  /** Collapse or expand the group. */
  readonly onToggle: () => void;
}

/**
 * A group card's frame.
 *
 * @public
 */
export interface KitGroupCardProps extends KitDataAttributes {
  /** Whether the table is compact. */
  readonly compact: boolean;
  /** The toggle, select, label and count. */
  readonly head: ReactNode;
  /** The captioned subtotals. */
  readonly aggregates: ReactNode;
}

/**
 * A kit's spacing for group rows and cards.
 *
 * @public
 */
export interface KitGroupLook {
  /** The row element. */
  readonly row: CSSProperties;
  /** The cell that holds the label. */
  readonly labelCell: CSSProperties;
  /** The line of toggle, select, label and count. */
  readonly head: CSSProperties;
  /** The line of a card's head. */
  readonly cardHead: CSSProperties;
  /** One captioned subtotal on a card. */
  readonly cardAggregate: CSSProperties;
}

/**
 * What a kit hands {@link createGroupHeader}.
 *
 * @public
 */
export interface KitGroupHeader {
  /** The kit's desktop row. */
  readonly Row: ComponentType<KitDesktopRowProps>;
  /** The kit's desktop cell. */
  readonly Cell: ComponentType<KitDesktopCellProps>;
  /** The group's select-all. */
  readonly Checkbox: ComponentType<KitCheckboxProps>;
  /** The collapse toggle. */
  readonly Toggle: ComponentType<KitGroupToggleProps>;
  /** The group's text. */
  readonly Text: ComponentType<KitGroupTextProps>;
  /** A group card. */
  readonly Card: ComponentType<KitGroupCardProps>;
  /** The kit's "show more" button. */
  readonly MoreButton: ComponentType<{
    readonly scope: "groups" | "rows";
    readonly remaining: number;
    readonly groupKey?: string;
    readonly labels: KitGroupHeaderProps<unknown>["labels"];
    readonly onShowMore: KitGroupHeaderProps<unknown>["onShowMore"];
  }>;
  /** The look, as a hook so it can read the kit's theme. */
  readonly useLook: () => KitGroupLook;
}

const AT_END: CSSProperties = { marginInlineStart: "auto" };

/**
 * Build a kit's group rows and cards.
 *
 * @param kit - The kit's toggle, text, card frame, desktop row and cell.
 * @returns The row and the card components.
 *
 * @public
 */
export function createGroupHeader(kit: KitGroupHeader): {
  readonly GroupHeaderRow: <TRow>(
    props: Readonly<KitGroupRowProps<TRow>>
  ) => ReactElement;
  readonly GroupHeaderCard: <TRow>(
    props: Readonly<KitGroupHeaderProps<TRow> & { readonly compact?: boolean }>
  ) => ReactElement;
} {
  const { Row, Cell, Checkbox, Toggle, Text, Card, MoreButton } = kit;

  /** The toggle, select-all, label and count every form of a group shows. */
  function head<TRow>(props: Readonly<KitGroupHeaderProps<TRow>>): ReactNode {
    const { entry, labels, selection } = props;
    // A footer is the same row with the controls taken away: no chevron
    // (nothing to collapse from the bottom), no checkbox (the header's own
    // selects the group), and a caption saying what the numbers are. A
    // "show more" is the same row again with a button where the label goes.
    const plain = entry.kind !== "group";
    const parts = groupRowParts(entry.kind);
    let label: ReactNode = entry.label;
    if (entry.kind === "groupMore") {
      label = (
        <MoreButton
          scope={entry.scope}
          remaining={entry.remaining}
          groupKey={entry.groupKey}
          labels={labels}
          onShowMore={props.onShowMore}
        />
      );
    } else if (entry.kind === "groupFooter") {
      label = labels.groupTotal(entry.label);
    }
    const state =
      selection && !plain
        ? groupSelectionState(entry.leafIds, selection.selectedIds)
        : "none";
    return (
      <>
        {plain ? (
          <GroupToggleSpacer />
        ) : (
          <Toggle
            expanded={!entry.collapsed}
            label={entry.collapsed ? labels.expandGroup : labels.collapseGroup}
            onToggle={() => props.onToggleCollapse(entry.key)}
          />
        )}
        {selection && !plain && (
          <Checkbox
            data-adapttable-part="group-select"
            aria-label={labels.selectAll}
            checked={state === "all"}
            indeterminate={state === "some"}
            onCheckedChange={() => selection.toggleGroupLeaves(entry.leafIds)}
          />
        )}
        <Text kind="label" data-adapttable-part={parts.label}>
          {label}
        </Text>
        <Text kind="count" data-adapttable-part="group-count">
          {plain ? null : labels.groupCount(groupLeafCount(entry))}
        </Text>
      </>
    );
  }

  function GroupHeaderRow<TRow>(
    props: Readonly<KitGroupRowProps<TRow>>
  ): ReactElement {
    const look = kit.useLook();
    const { entry } = props;
    const parts = groupRowParts(entry.kind);
    const totals = entry.kind === "groupMore" ? undefined : entry;
    const cells = totals?.aggregateCells;
    const ops = totals?.aggregateOps;
    // One cell per column from the first aggregate onward: a subtotal only
    // reads as one when it sits under the column it totals. Formatting asks
    // each column once per subtotal, so it runs only when they change.
    const layout = useMemo(
      () => groupRowLayout<TRow, ColumnDef<TRow>>(props.columns, cells, ops),
      [props.columns, cells, ops]
    );
    return (
      <Row
        kind="extra"
        data-adapttable-part={parts.row}
        data-collapsed={
          entry.kind === "group" && entry.collapsed ? "true" : undefined
        }
        style={look.row}
      >
        <Cell
          kind="data"
          colSpan={props.leadingCells + layout.labelColumns.length}
          data-adapttable-part={parts.cell}
          style={{ ...look.labelCell, ...groupIndentStyle(entry.level) }}
        >
          <div style={look.head}>
            {head(props)}
            {layout.labelAggregates.map(({ column, node }) => (
              <Text
                key={column.key}
                kind="aggregate"
                data-adapttable-part="group-aggregate"
                data-column={column.key}
                style={AT_END}
              >
                {node as ReactNode}
              </Text>
            ))}
          </div>
        </Cell>
        {layout.cells.map(({ column, node }) => (
          <Cell
            key={column.key}
            kind="data"
            {...props.getCellProps(column)}
            data-adapttable-part={
              node === undefined ? undefined : "group-aggregate"
            }
            data-column={node === undefined ? undefined : column.key}
          >
            {node as ReactNode}
          </Cell>
        ))}
        {props.showActions && <Cell kind="data" />}
      </Row>
    );
  }

  function GroupHeaderCard<TRow>(
    props: Readonly<KitGroupHeaderProps<TRow> & { readonly compact?: boolean }>
  ): ReactElement {
    const look = kit.useLook();
    const { entry } = props;
    const totals = entry.kind === "groupMore" ? undefined : entry;
    const cells = totals?.aggregateCells;
    const ops = totals?.aggregateOps;
    const subtotals = useMemo(
      () =>
        groupAggregateEntries<TRow, ColumnDef<TRow>>(props.columns, cells, ops),
      [props.columns, cells, ops]
    );
    return (
      <Card
        data-adapttable-part={groupRowParts(entry.kind).card}
        data-collapsed={
          entry.kind === "group" && entry.collapsed ? "true" : undefined
        }
        compact={props.compact === true}
        head={<div style={look.cardHead}>{head(props)}</div>}
        // A card is a list of label/value pairs, not a row of columns, so a
        // subtotal is captioned rather than aligned, with the data cards'
        // own caption.
        aggregates={subtotals.map(({ column, node }) => (
          <div key={column.key} style={look.cardAggregate}>
            <Text kind="caption">{resolveMobileLabel(column)}</Text>
            <Text
              kind="aggregate"
              data-adapttable-part="group-aggregate"
              data-column={column.key}
            >
              {node as ReactNode}
            </Text>
          </div>
        ))}
      />
    );
  }

  return { GroupHeaderRow, GroupHeaderCard };
}
