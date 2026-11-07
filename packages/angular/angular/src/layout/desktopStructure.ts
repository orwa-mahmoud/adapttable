/**
 * The one desktop table structure every Angular kit renders.
 *
 * The loops, the group rows, the pinned rails, the keyboard attrs and the
 * part names live here. A kit fills the slots with its own elements: the
 * table, head, body, row, header cell and cell, plus the controls those
 * cells host. The kit's public `AdaptDesktopTable` keeps the same inputs
 * and forwards them here.
 */
import type { Attrs } from "@adapttable/angular";
import { PIN_Z } from "@adapttable/core";
import { NgTemplateOutlet } from "@angular/common";
import {
  afterEveryRender,
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  Directive,
  ElementRef,
  inject,
  type Injector,
  input,
  type TemplateRef,
  viewChild,
} from "@angular/core";

import { AdaptAttrs } from "../attrs";
import {
  AdaptCell,
  AdaptFooter,
  AdaptHeader,
  AdaptHeaderActions,
} from "../cell";
import { AdaptExtraRowContent } from "../rows/extraRowContent";
import { AdaptSlot } from "../slots";
import { AdaptRowDetail } from "../tree/nestedTable";
import { AdaptColumnSpacer } from "../virtual/columnSpacer";
import { AdaptDesktopTableModel } from "./desktopTableModel";
import { type BodyRow } from "./tableSurfaceHost";

type RailPart = "expand" | "reorder" | "selection";

/** Writes the measured rail widths onto the table, without another render. */
function publishRailLead(element: HTMLElement): void {
  const row = element.closest("tr");
  const table = element.closest("table");
  if (!row || !table) return;
  const width = (part: RailPart): number => {
    const rail = row.querySelector<HTMLElement>(
      `[data-adapttable-part="${part}-header"]`
    );
    return rail ? rail.getBoundingClientRect().width : 0;
  };
  const expand = width("expand");
  const reorder = width("reorder");
  const selection = width("selection");
  const values: Readonly<Record<string, number>> = {
    "--at-start-lead": expand + reorder + selection,
    "--at-offset-expand": 0,
    "--at-offset-reorder": expand,
    "--at-offset-selection": expand + reorder,
  };
  for (const [name, value] of Object.entries(values)) {
    const next = `${String(Math.round(value * 100) / 100)}px`;
    if (table.style.getPropertyValue(name) !== next)
      table.style.setProperty(name, next);
  }
}

/**
 * Measures the leading rails so a pinned column can stick past them.
 * The width comes from layout, because kit padding changes the rail the
 * shared minimum describes. The result is a custom property on the table,
 * so measuring does not render the table again.
 */
@Directive({ selector: "[adaptRail]" })
class AdaptRailProbe {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly adaptRail = input.required<RailPart>();

  constructor() {
    // A kit's attribute binding rewrites the table's style attribute. Publish
    // again after every render so the custom properties survive that write.
    afterEveryRender(() => {
      publishRailLead(this.host.nativeElement);
    });
    afterRenderEffect((onCleanup) => {
      this.adaptRail();
      const element = this.host.nativeElement;
      if (typeof ResizeObserver === "undefined") return;
      const observer = new ResizeObserver(() => {
        publishRailLead(element);
      });
      observer.observe(element);
      onCleanup(() => {
        observer.disconnect();
      });
    });
  }
}

/**
 * The elements and controls a kit draws inside {@link AdaptDesktopStructure}.
 *
 * Each template outlets `content` where the structure places the cell's
 * interior. `row` is every `<tr>`, including the header, spacer, detail and
 * summary rows.
 *
 * @public
 */
export interface AdaptDesktopSlots {
  /**
   * Wraps the table. `grid` is true while cell navigation is on. Absent when
   * the kit places the structure inside its own table element.
   */
  readonly frame?: TemplateRef<unknown>;
  /**
   * The table element. Outlets the head, body and summary. Absent when the
   * kit draws that element itself.
   */
  readonly table?: TemplateRef<unknown>;
  /** The head element. */
  readonly head: TemplateRef<unknown>;
  /** The body element. */
  readonly body: TemplateRef<unknown>;
  /** One row element. */
  readonly row: TemplateRef<unknown>;
  /** One header cell, leaf or group. */
  readonly headerCell: TemplateRef<unknown>;
  /** One body cell. */
  readonly cell: TemplateRef<unknown>;
  /** The selection checkbox, in the header and on a row. */
  readonly checkbox: TemplateRef<unknown>;
  /** The sort control. Outlets the caption the structure built. */
  readonly sortButton: TemplateRef<unknown>;
  /** The column resize control. */
  readonly resizeHandle: TemplateRef<unknown>;
  /** Wraps the header caption, sortable or not. */
  readonly headerCaption: TemplateRef<unknown>;
  /** The rename control. Outlets the caption. */
  readonly headerRename: TemplateRef<unknown>;
  /** The row's action controls. */
  readonly rowActions: TemplateRef<unknown>;
}

/**
 * Desktop table layout shared by every Angular kit.
 *
 * @public
 */
@Component({
  selector: "adapt-desktop-structure",
  imports: [
    AdaptAttrs,
    AdaptCell,
    AdaptColumnSpacer,
    AdaptExtraRowContent,
    AdaptFooter,
    AdaptHeader,
    AdaptHeaderActions,
    AdaptRailProbe,
    AdaptRowDetail,
    AdaptSlot,
    NgTemplateOutlet,
  ],
  templateUrl: "./desktopStructure.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
})
export class AdaptDesktopStructure<TRow> extends AdaptDesktopTableModel<TRow> {
  /** The kit's table elements and controls. */
  readonly slots = input.required<AdaptDesktopSlots>();
  /**
   * The kit draws the scroll box and the table, and stamps
   * {@link bodyTemplate} inside that table. The structure's own host stays
   * outside it: a custom element between a table and its sections is moved
   * out by the HTML parser.
   */
  readonly embedded = input(false);
  /**
   * Where a kit slot looks up its services. `"outlet"` uses this structure's
   * injector, so a row stamped here still sees the table that contains it.
   * Absent, a slot keeps the injector of the component that declared it.
   */
  readonly slotInjector = input<Injector | "outlet" | undefined>(undefined);
  private readonly insideTable = viewChild<TemplateRef<unknown>>("insideTable");

  /**
   * The head, body and summary, for a kit that stamps them inside its own
   * table element. A custom element between that table and these sections
   * is moved out by the HTML parser and breaks hydration.
   */
  bodyTemplate(): TemplateRef<unknown> | undefined {
    return this.insideTable();
  }
  /**
   * The inline size of the expand, reorder and selection rails.
   * A kit that draws a larger checkbox passes its own.
   */
  readonly railMin = input(44);
  /**
   * Extra declarations on the selection rail. Absent, the rail is only the
   * shared inline size.
   */
  readonly selectionRail = input<string | null>(
    "padding: 8px 12px; text-align: center"
  );

  /** Drag markers for one body row. A summary row does not accept a drop. */
  protected dragHandlers(entry: BodyRow<TRow>, summary: boolean) {
    if (summary) {
      return {
        dragging: null,
        drop: null,
        onDragOver: null,
        onDrop: null,
      };
    }
    const reorder = this.view().reorder?.();
    if (!reorder) {
      return {
        dragging: null,
        drop: null,
        onDragOver: null,
        onDrop: null,
      };
    }
    const marker = reorder.rowAttrs(this.rowId(entry.row), entry.index);
    const props = reorder.dropProps(
      entry.index,
      entry.row,
      this.view().table.windowStart()
    );
    return {
      dragging: marker["data-dragging"] ?? null,
      drop: marker["data-drop"] ?? null,
      onDragOver: (event: DragEvent) => {
        props.onDragOver(event);
      },
      onDrop: (event: DragEvent) => {
        props.onDrop(event);
      },
    };
  }

  /** The context a kit's row template renders. */
  protected rowBox(
    content: TemplateRef<unknown>,
    part: string | null,
    attrs: Attrs,
    wiring?: {
      readonly inert?: boolean;
      readonly dragging?: string | null;
      readonly drop?: string | null;
      readonly onDragOver?: ((event: DragEvent) => void) | null;
      readonly onDrop?: ((event: DragEvent) => void) | null;
    }
  ) {
    return {
      content,
      part,
      attrs,
      inert: wiring?.inert === true,
      dragging: wiring?.dragging ?? null,
      drop: wiring?.drop ?? null,
      onDragOver: wiring?.onDragOver ?? null,
      onDrop: wiring?.onDrop ?? null,
    };
  }

  /**
   * A pinned cell's attributes, shifted past the leading rails. The pin
   * offset counts data columns only; the rails sit in front of them.
   */
  protected shiftedPin(attrs: Attrs): Attrs {
    const style = attrs.style;
    if (typeof style !== "object" || style === null) return attrs;
    const record = style as Record<string, unknown> & {
      insetInlineStart?: unknown;
    };
    const inset = record.insetInlineStart;
    if (typeof inset !== "number") return attrs;
    return {
      ...attrs,
      style: {
        ...record,
        insetInlineStart: `calc(var(--at-start-lead, 0px) + ${String(inset)}px)`,
      },
    };
  }

  /** Where a leading rail sticks once a data column is pinned to the start. */
  protected railOffset(part: "expand" | "reorder" | "selection"): string {
    return `var(--at-offset-${part}, 0px)`;
  }

  /** The style of a leading rail cell. Selection adds the kit's padding. */
  protected railStyle(
    selection: boolean,
    offset: string,
    header: boolean
  ): string {
    const size = `inline-size: 1%; min-inline-size: ${String(this.railMin())}px; white-space: nowrap`;
    const extra = selection ? this.selectionRail() : null;
    const base = extra ? `${size}; ${extra}` : size;
    if (!this.hasStartPin()) return base;
    const z = header ? PIN_Z.headerPinned : PIN_Z.body;
    return `${base}; position: sticky; inset-inline-start: ${offset}; z-index: ${String(z)}`;
  }

  private hasStartPin(): boolean {
    const pinned = this.view().table.layout().state.pinned;
    return Object.values(pinned).includes("start");
  }
}
