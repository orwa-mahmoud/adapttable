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
import { type ElementType, type ReactElement, type ReactNode } from "react";

import type { ColumnDef } from "../columnDef";
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
  /**
   * Spread the assembly's header-row props onto the last header row.
   * Absent, they are spread. A kit whose header row does not carry them
   * passes false.
   */
  readonly applyHeaderRowProps?: boolean;
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
  /** One virtual spacer. Absent, the window has no spacer row. */
  readonly renderVirtualPad?: (slot: DesktopVirtualPadSlot) => ReactNode;
  /** The summary row's contents. Absent, the table has no summary row. */
  readonly renderSummary?: () => ReactNode;
}

function withClass(
  className: string | undefined,
  props: Record<string, unknown> | undefined
): Record<string, unknown> | undefined {
  return className ? { className, ...props } : props;
}

/**
 * Desktop table layout shared by every React kit.
 *
 * Scroll, table, head and body classes travel on those elements' own
 * props. Header-row classes stay here, because the structure creates
 * those rows.
 *
 * @public
 */
export function DesktopTableChrome<TRow>(
  props: Readonly<DesktopTableChromeProps<TRow>>
): ReactElement {
  const { assembly, hosts } = props;
  const names = props.classNames ?? {};
  const ScrollBox = hosts?.ScrollBox ?? "div";
  const Table = hosts?.Table ?? "table";
  const Head = hosts?.Head ?? "thead";
  const Body = hosts?.Body ?? "tbody";
  const Row = hosts?.Row ?? "tr";
  const header = assembly.header;
  const rowProps =
    props.applyHeaderRowProps === false ? undefined : header.headerRowProps;
  const bands = assembly.headerPlan ?? [null];
  const headerRows = bands.map((row, index) => {
    const last = row == null || index === bands.length - 1;
    const span = row ? assembly.headerBand : 1;
    return (
      <Row
        key={row ? row.map((cell) => cell.key).join("|") : "leaf"}
        {...(last ? rowProps : undefined)}
        ref={last ? header.headerRowRef : undefined}
        data-adapttable-part={last ? "header-row" : "header-group-row"}
        className={last ? names.headerRow : names.headerGroupRow}
      >
        {index ? null : props.renderLeading(span)}
        {row
          ? row.map(props.renderPlanCell)
          : assembly.model.columns.map((column, headerIndex) =>
              props.renderLeaf(
                header.leaf(column, headerIndex),
                column,
                headerIndex
              )
            )}
        {index ? null : props.renderTrailing(span)}
      </Row>
    );
  });
  const scroll = assembly.scroll;
  const scrollBox = (
    <ScrollBox
      ref={scroll.bindScrollBox}
      data-adapttable-part="scroll-box"
      style={scroll.boxStyle}
      {...withClass(names.scrollBox, props.scrollBoxProps)}
    >
      {props.beforeTable}
      <Table
        {...assembly.tableProps}
        {...assembly.gridProps}
        data-adapttable-part="table"
        style={assembly.tableStyle}
        {...withClass(names.table, props.tableProps)}
      >
        <Head
          ref={header.theadRef}
          data-adapttable-part="thead"
          {...withClass(names.thead, props.headProps)}
        >
          {headerRows}
        </Head>
        <Body
          data-adapttable-part="tbody"
          {...withClass(names.tbody, props.bodyProps)}
        >
          {assembly.bodySlots.map((slot) => bodySlot(props, slot))}
        </Body>
        {props.renderSummary?.() ?? null}
      </Table>
    </ScrollBox>
  );
  return (props.frame ? props.frame(scrollBox) : scrollBox) as ReactElement;
}

/** One body slot through the kit renderer for its kind. */
function bodySlot<TRow>(
  props: Readonly<DesktopTableChromeProps<TRow>>,
  slot: DesktopTableAssembly<TRow>["bodySlots"][number]
): ReactNode {
  switch (slot.kind) {
    case "extra":
      return props.renderExtra(slot);
    case "virtualPad":
      return props.renderVirtualPad?.(slot);
    case "group":
      return props.renderGroup(slot);
    default:
      return props.renderRow(slot);
  }
}
