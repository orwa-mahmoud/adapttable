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

/**
 * Host elements in slot order: scroll box, table, head, body, row.
 * An empty slot uses the native element.
 *
 * @public
 */
export type DesktopStructureHosts = readonly [
  ElementType | undefined,
  ElementType | undefined,
  ElementType | undefined,
  ElementType | undefined,
  ElementType | undefined,
];

/**
 * Fields for {@link DesktopTableStructure}.
 *
 * The short names are the point: a kit calls this instead of
 * {@link DesktopTableChrome} so the plain-table bundle does not carry
 * the readable prop names. The nesting is the same structure.
 *
 * @public
 */
export interface DesktopTableStructureProps<TRow> {
  /** Assembled rows, header plan and pin geometry. */
  readonly a: DesktopTableAssembly<TRow>;
  /** Classes for the header rows. */
  readonly c?: DesktopTableChromeClassNames;
  /** Kit elements in {@link DesktopStructureHosts} order. */
  readonly h?: DesktopStructureHosts;
  /** False skips the assembly's header-row props. Absent, they are spread. */
  readonly p?: boolean;
  /** Extra props for the scroll box, after the structure's own. */
  readonly s?: Record<string, unknown>;
  /** Drawn inside the scroll box, before the table. */
  readonly b?: ReactNode;
  /** Extra props for the table, after the assembly's table and grid props. */
  readonly t?: Record<string, unknown>;
  /** Extra props for the head. */
  readonly hp?: Record<string, unknown>;
  /** Extra props for the body. */
  readonly bp?: Record<string, unknown>;
  /** Leading rail header cells for one header band. */
  readonly rl: (rowSpan: number) => ReactNode;
  /** Trailing rail header cells for one header band. */
  readonly rt: (rowSpan: number) => ReactNode;
  /** One cell of a grouped header plan. */
  readonly rc: (cell: HtmlGroupedHeaderCell) => ReactNode;
  /** One leaf header when there is no grouped plan. */
  readonly rf: (
    leaf: DesktopHeaderLeaf<TRow>,
    column: ColumnDef<TRow>,
    index: number
  ) => ReactNode;
  /** One data row. */
  readonly rr: (slot: DesktopRowSlot<TRow>) => ReactNode;
  /** One group header, footer or more row. */
  readonly rg: (slot: DesktopGroupSlot<TRow>) => ReactNode;
  /** One host-injected extra row. */
  readonly rx: (slot: DesktopExtraSlot) => ReactNode;
  /** One virtual spacer. Absent, the window has no spacer row. */
  readonly rv?: (slot: DesktopVirtualPadSlot) => ReactNode;
  /** The summary row. Absent, the table has no summary row. */
  readonly rs?: () => ReactNode;
  /** Wraps the scroll box. Absent, the scroll box is the root. */
  readonly f?: (scrollBox: ReactNode) => ReactNode;
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
export function DesktopTableStructure<TRow>(
  input: Readonly<DesktopTableStructureProps<TRow>>
): ReactElement {
  const assembly = input.a;
  const names = input.c ?? {};
  const hosts = input.h;
  const ScrollBox = hosts?.[0] ?? "div";
  const Table = hosts?.[1] ?? "table";
  const Head = hosts?.[2] ?? "thead";
  const Body = hosts?.[3] ?? "tbody";
  const Row = hosts?.[4] ?? "tr";
  const header = assembly.header;
  const plan = assembly.headerPlan;
  const rowProps = input.p === false ? undefined : header.headerRowProps;
  const bands = plan ?? [null];
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
        {index ? null : input.rl(span)}
        {row
          ? row.map(input.rc)
          : assembly.model.columns.map((column, headerIndex) =>
              input.rf(header.leaf(column, headerIndex), column, headerIndex)
            )}
        {index ? null : input.rt(span)}
      </Row>
    );
  });
  const scroll = assembly.scroll;
  const scrollBox = (
    <ScrollBox
      ref={scroll.bindScrollBox}
      data-adapttable-part="scroll-box"
      style={scroll.boxStyle}
      {...input.s}
    >
      {input.b}
      <Table
        {...assembly.tableProps}
        {...assembly.gridProps}
        data-adapttable-part="table"
        style={assembly.tableStyle}
        {...input.t}
      >
        <Head
          ref={header.theadRef}
          data-adapttable-part="thead"
          {...input.hp}
        >
          {headerRows}
        </Head>
        <Body data-adapttable-part="tbody" {...input.bp}>
          {assembly.bodySlots.map((slot) => {
            /* eslint-disable sonarjs/no-nested-conditional -- one expression for the four slot kinds */
            return slot.kind === "extra"
              ? input.rx(slot)
              : slot.kind === "virtualPad"
                ? (input.rv?.(slot) ?? null)
                : slot.kind === "group"
                  ? input.rg(slot)
                  : input.rr(slot);
            /* eslint-enable sonarjs/no-nested-conditional */
          })}
        </Body>
        {input.rs?.() ?? null}
      </Table>
    </ScrollBox>
  );
  return (input.f ? input.f(scrollBox) : scrollBox) as ReactElement;
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
 * @public
 */
export function DesktopTableChrome<TRow>(
  props: Readonly<DesktopTableChromeProps<TRow>>
): ReactElement {
  const names = props.classNames;
  const hosts = props.hosts;
  return DesktopTableStructure({
    a: props.assembly,
    c: names,
    h: hosts
      ? [hosts.ScrollBox, hosts.Table, hosts.Head, hosts.Body, hosts.Row]
      : undefined,
    p: props.applyHeaderRowProps,
    s: withClass(names?.scrollBox, props.scrollBoxProps),
    b: props.beforeTable,
    t: withClass(names?.table, props.tableProps),
    hp: withClass(names?.thead, props.headProps),
    bp: withClass(names?.tbody, props.bodyProps),
    rl: props.renderLeading,
    rt: props.renderTrailing,
    rc: props.renderPlanCell,
    rf: props.renderLeaf,
    rr: props.renderRow,
    rg: props.renderGroup,
    rx: props.renderExtra,
    rv: props.renderVirtualPad,
    rs: props.renderSummary,
    f: props.frame,
  });
}
