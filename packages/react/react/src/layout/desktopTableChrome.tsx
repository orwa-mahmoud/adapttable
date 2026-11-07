/**
 * The one desktop table structure every React kit renders.
 *
 * The loops, the group rows, the pinned rails' places, the keyboard attrs
 * and the part names live here. A kit fills the slots with its own
 * elements — table, head, body, row, header cell and cell — and with the
 * controls those cells host. The kit's public table keeps the same props
 * and forwards them here.
 */
import type { HtmlGroupedHeaderCell } from "@adapttable/core/binding";
import {
  type ElementType,
  type ReactElement,
  type ReactNode,
} from "react";

import type { ColumnDef } from "../columnDef";
import { resolveColumnFooter } from "../columns/columnHeader";
import type {
  DesktopExtraSlot,
  DesktopGroupSlot,
  DesktopHeaderLeaf,
  DesktopRowSlot,
  DesktopTableAssembly,
  DesktopVirtualPadSlot,
} from "./desktopTableAssembly";

/**
 * The table elements a kit draws. Absent, the structure uses the native
 * element of that part.
 *
 * @public
 */
export interface DesktopTableHosts {
  /** The scroll box around the table. */
  readonly ScrollBox: ElementType;
  /** The table element. */
  readonly Table: ElementType;
  /** The head element. */
  readonly Head: ElementType;
  /** The body element. */
  readonly Body: ElementType;
  /** The summary element. */
  readonly Foot: ElementType;
  /** One row element: header, body, spacer or summary. */
  readonly Row: ElementType;
  /** One header cell, leaf or group. */
  readonly HeaderCell: ElementType;
  /** One body or summary cell. */
  readonly Cell: ElementType;
}

/**
 * Class names the structure itself writes. A kit that paints with props
 * instead of classes leaves these absent.
 *
 * @public
 */
export interface DesktopTableChromeClassNames {
  /** The scroll box. */
  readonly scrollBox?: string;
  /** The table element. */
  readonly table?: string;
  /** The head element. */
  readonly thead?: string;
  /** The body element. */
  readonly tbody?: string;
  /** The leaf header row. */
  readonly headerRow?: string;
  /** A grouped header row above the leaves. */
  readonly headerGroupRow?: string;
  /** The summary element. */
  readonly summary?: string;
  /** The summary row. */
  readonly summaryRow?: string;
  /** One summary cell. */
  readonly summaryCell?: string;
  /** A virtual spacer row. */
  readonly virtualSpacer?: string;
}

/**
 * What a kit passes to {@link DesktopTableChrome}.
 *
 * The structure owns the nesting. The kit owns every element and every
 * control inside a cell.
 *
 * @public
 */
export interface DesktopTableChromeProps<TRow> {
  /** Assembled rows, header plan and pin geometry. */
  readonly assembly: DesktopTableAssembly<TRow>;
  /** Kit elements. Absent parts use the native element. */
  readonly hosts?: Partial<DesktopTableHosts>;
  /** Classes for the parts the structure writes. */
  readonly classNames?: DesktopTableChromeClassNames;
  /** Extra props for the scroll box, after the structure's own. */
  readonly scrollBoxProps?: Record<string, unknown>;
  /** Extra props for the table, after the assembly's table and grid props. */
  readonly tableProps?: Record<string, unknown>;
  /** Extra props for the head. */
  readonly headProps?: Record<string, unknown>;
  /** Extra props for the body, including a kit ref. */
  readonly bodyProps?: Record<string, unknown>;
  /** Drawn inside the scroll box, before the table. */
  readonly beforeTable?: ReactNode;
  /** Wraps the scroll box. Absent, the scroll box is the root. */
  readonly frame?: (scrollBox: ReactNode) => ReactNode;
  /** Leading rail header cells for one header band. */
  readonly renderLeading: (rowSpan: number) => ReactNode;
  /** Trailing rail header cells for one header band. */
  readonly renderTrailing: (rowSpan: number) => ReactNode;
  /** One cell of a grouped header plan. */
  readonly renderPlanCell: (cell: HtmlGroupedHeaderCell) => ReactNode;
  /** One leaf header when there is no grouped plan. */
  readonly renderLeaf: (
    leaf: DesktopHeaderLeaf<TRow>,
    column: ColumnDef<TRow>,
    index: number
  ) => ReactNode;
  /** One data row. */
  readonly renderRow: (slot: DesktopRowSlot<TRow>) => ReactNode;
  /** One group header, footer or more row. */
  readonly renderGroup: (slot: DesktopGroupSlot<TRow>) => ReactNode;
  /** One host-injected extra row. */
  readonly renderExtra: (slot: DesktopExtraSlot) => ReactNode;
  /**
   * One virtual spacer. Absent, a row and a cell of the kit's elements,
   * with the spacer part name.
   */
  readonly renderVirtualPad?: (slot: DesktopVirtualPadSlot) => ReactNode;
  /**
   * The summary row's contents. Absent, one summary cell per column plus
   * a pad for each leading and trailing rail.
   */
  readonly renderSummary?: () => ReactNode;
}

type HostName = keyof DesktopTableHosts;

const NATIVE: DesktopTableHosts = {
  ScrollBox: "div",
  Table: "table",
  Head: "thead",
  Body: "tbody",
  Foot: "tfoot",
  Row: "tr",
  HeaderCell: "th",
  Cell: "td",
};

function hostOf(
  hosts: Partial<DesktopTableHosts> | undefined,
  name: HostName
): ElementType {
  return hosts?.[name] ?? NATIVE[name];
}

/**
 * Desktop table layout shared by every React kit.
 *
 * @public
 */
export function DesktopTableChrome<TRow>(
  props: Readonly<DesktopTableChromeProps<TRow>>
): ReactElement {
  const { assembly, classNames = {}, hosts } = props;
  const {
    model,
    summary,
    showColumnFooter,
    headerPlan,
    headerBand,
    header,
    scroll,
    tableStyle,
    tableProps,
    gridProps,
    bodySlots,
  } = assembly;
  const { columns, selection, showActions, showReorder } = model;
  const ScrollBox = hostOf(hosts, "ScrollBox");
  const Table = hostOf(hosts, "Table");
  const Head = hostOf(hosts, "Head");
  const Body = hostOf(hosts, "Body");
  const Foot = hostOf(hosts, "Foot");
  const Row = hostOf(hosts, "Row");
  const Cell = hostOf(hosts, "Cell");

  const headerRows = headerPlan
    ? headerPlan.map((row, rowIndex) => {
        const last = rowIndex === headerPlan.length - 1;
        return (
          <Row
            key={row.map((cell) => cell.key).join("|")}
            {...(last ? header.headerRowProps : {})}
            ref={last ? header.headerRowRef : undefined}
            data-adapttable-part={last ? "header-row" : "header-group-row"}
            className={last ? classNames.headerRow : classNames.headerGroupRow}
          >
            {rowIndex === 0 ? props.renderLeading(headerBand) : null}
            {row.map((cell) => props.renderPlanCell(cell))}
            {rowIndex === 0 ? props.renderTrailing(headerBand) : null}
          </Row>
        );
      })
    : (
        <Row
          {...header.headerRowProps}
          ref={header.headerRowRef}
          data-adapttable-part="header-row"
          className={classNames.headerRow}
        >
          {props.renderLeading(1)}
          {columns.map((column, headerIndex) =>
            props.renderLeaf(header.leaf(column, headerIndex), column, headerIndex)
          )}
          {props.renderTrailing(1)}
        </Row>
      );

  const summaryPad = (
    <Cell
      data-adapttable-part="summary-cell"
      className={classNames.summaryCell}
    />
  );

  let summaryRow: ReactNode = null;
  if (props.renderSummary) summaryRow = props.renderSummary();
  else if (showColumnFooter) {
    summaryRow = (
      <Foot data-adapttable-part="summary" className={classNames.summary}>
        <Row
          data-adapttable-part="summary-row"
          className={classNames.summaryRow}
        >
          {header.leading.expand && summaryPad}
          {showReorder && summaryPad}
          {selection && summaryPad}
          {columns.map((column) => (
            <Cell
              key={column.key}
              data-adapttable-part="summary-cell"
              className={classNames.summaryCell}
            >
              {resolveColumnFooter(column, summary?.[column.key])}
            </Cell>
          ))}
          {showActions && summaryPad}
        </Row>
      </Foot>
    );
  }

  const scrollBox = (
    <ScrollBox
      ref={scroll.bindScrollBox}
      data-adapttable-part="scroll-box"
      className={classNames.scrollBox}
      style={scroll.boxStyle}
      {...props.scrollBoxProps}
    >
      {props.beforeTable}
      <Table
        {...tableProps}
        {...gridProps}
        data-adapttable-part="table"
        className={classNames.table}
        style={tableStyle}
        {...props.tableProps}
      >
        <Head
          ref={header.theadRef}
          data-adapttable-part="thead"
          className={classNames.thead}
          {...props.headProps}
        >
          {headerRows}
        </Head>
        <Body data-adapttable-part="tbody" className={classNames.tbody} {...props.bodyProps}>
          {bodySlots.map((slot) => {
            let node: ReactNode;
            if (slot.kind === "extra") node = props.renderExtra(slot);
            else if (slot.kind === "virtualPad") {
              node = props.renderVirtualPad ? (
                props.renderVirtualPad(slot)
              ) : (
                <Row
                  key={slot.key}
                  data-adapttable-part="virtual-spacer"
                  className={classNames.virtualSpacer}
                >
                  <Cell
                    colSpan={slot.colSpan}
                    style={{ height: slot.height, padding: 0 }}
                  />
                </Row>
              );
            } else if (slot.kind === "group") node = props.renderGroup(slot);
            else node = props.renderRow(slot);
            return node;
          })}
        </Body>
        {summaryRow}
      </Table>
    </ScrollBox>
  );

  return <>{props.frame ? props.frame(scrollBox) : scrollBox}</>;
}
