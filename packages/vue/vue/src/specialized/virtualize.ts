import {
  type DesktopTableModel,
  type TableBodySlot,
  type TableRowModel,
} from "../layout/tableModels";
import { bodyWindowModelKey } from "./contracts";
export { bodyWindowModelKey } from "./contracts";
/** A final window over the single logical body projection. */
import { type KeyedVirtualization } from "@adapttable/core";
import {
  columnScrollTarget,
  columnWindowPlan,
  coreVirtualize,
  EndReachedLatch,
  htmlGroupedHeaderPlan,
  keyedWindow,
  measureWindowScrollMargin,
  readColumnViewport,
  RowPairMeasureController,
  type VirtualizeInput,
} from "@adapttable/core/binding";
import type { FeatureMountContext, StaticTableFeature } from "@adapttable/vue";
import {
  elementScroll,
  observeElementOffset,
  observeElementRect,
  observeWindowOffset,
  observeWindowRect,
  type VirtualItem,
  Virtualizer,
  windowScroll,
} from "@tanstack/virtual-core";
import {
  computed,
  type ComputedRef,
  onScopeDispose,
  shallowRef,
  triggerRef,
  watch,
  watchEffect,
} from "vue";

import type { TableBodyProjection } from "../layout/modelChannels";
import { projectHeadlessRows } from "../rows/headlessRowsModel";
export type VirtualizeOptions = VirtualizeInput &
  (boolean | { readonly maxHeight?: number });
export interface BodyWindowModel<TRow> {
  readonly projection: TableBodyProjection<TRow>;
  readonly logicalRows: readonly TableRowModel<TRow>[];
  readonly scrollToRow: (rowId: string) => void;
  readonly scrollToColumn: (columnKey: string) => void;
}
function pinned<TRow>(slot: TableBodySlot<TRow>): boolean {
  if (slot.kind !== "row") return false;
  const part = slot.wiring.attrs["data-adapttable-part"];
  return (
    slot.wiring.summary === true ||
    (typeof part === "string" && part.startsWith("pinned-"))
  );
}
function bodySections<TRow>(slots: readonly TableBodySlot<TRow>[]) {
  const firstScroll = slots.findIndex((slot) => !pinned(slot));
  return {
    before:
      firstScroll < 0 ? slots : slots.slice(0, firstScroll).filter(pinned),
    scroll: slots.filter((slot) => !pinned(slot)),
    after: firstScroll < 0 ? [] : slots.slice(firstScroll).filter(pinned),
  };
}
function slotRows<TRow>(
  slots: readonly TableBodySlot<TRow>[]
): readonly TableRowModel<TRow>[] {
  return slots.flatMap((slot) => (slot.kind === "row" ? [slot.wiring] : []));
}
export function windowBodySlots<TRow>(
  slots: readonly TableBodySlot<TRow>[],
  window: KeyedVirtualization,
  columnCount: number,
  measure: (index: number, detail: boolean) => (node: Element | null) => void,
  sections = bodySections(slots)
): readonly TableBodySlot<TRow>[] {
  if (!window.enabled) return slots;
  const { before, scroll, after } = sections;
  const visible = window.indices.flatMap((index): TableBodySlot<TRow>[] => {
    const slot = scroll[index];
    if (!slot) return [];
    const attrs = { "data-index": index, ref: measure(index, false) };
    return [
      slot.kind === "row"
        ? {
            ...slot,
            wiring: {
              ...slot.wiring,
              attrs: { ...slot.wiring.attrs, ...attrs },
              detail: slot.wiring.detail
                ? { ...slot.wiring.detail, measure: measure(index, true) }
                : undefined,
            },
          }
        : { ...slot, attrs },
    ];
  });
  return [
    ...before,
    {
      kind: "virtualPad",
      key: "pad-top",
      height: window.paddingTop,
      colSpan: columnCount,
    },
    ...visible,
    {
      kind: "virtualPad",
      key: "pad-bottom",
      height: window.paddingBottom,
      colSpan: columnCount,
    },
    ...after,
  ];
}
function mountVirtualize<TRow>(context: FeatureMountContext<TRow>): void {
  let disposed = false;
  const body = context.bodyProjection;
  if (!body)
    throw new Error(
      "AdaptTable: virtualization requires the shared logical body projection."
    );
  const options = computed(
    () =>
      context.options.value as {
        virtualize?: boolean;
        virtualizeColumns?: boolean;
        estimateRowSize?: number;
        estimateCardSize?: number;
        virtualOverscan?: number;
        virtualScrollMargin?: number;
        maxHeight?: number;
      }
  );
  const mobile = context.table.isMobile;
  const allSlots = computed(
    () =>
      (mobile.value ? body.value.mobile : body.value.desktop).bodySlots ?? []
  );
  const desktopSections = computed(() =>
    bodySections(body.value.desktop.bodySlots ?? [])
  );
  const mobileSections = computed(() =>
    bodySections(body.value.mobile.bodySlots ?? [])
  );
  const scrollSlots = computed(
    () => (mobile.value ? mobileSections.value : desktopSections.value).scroll
  );
  const logicalRows = computed(() =>
    slotRows(allSlots.value).filter((row) => !row.summary)
  );
  const hasSpan = computed(() =>
    allSlots.value.some(
      (slot) =>
        slot.kind === "row" &&
        slot.wiring.cells.some((cell) => Number(cell.attrs.rowspan ?? 1) > 1)
    )
  );
  const enabled = computed(
    () =>
      context.active.value &&
      options.value.virtualize !== false &&
      !hasSpan.value &&
      (context.source.value.paginationMode !== "paged" ||
        allSlots.value.some((slot) => slot.kind === "group") ||
        body.value.desktop.attrs.role === "treegrid")
  );
  const elementMode = computed(() => options.value.maxHeight !== undefined);
  const element = computed(
    () =>
      context.root.value?.querySelector<HTMLElement>(
        '[data-adapttable-part="scroll-box"]'
      ) ?? null
  );
  const viewport = shallowRef({ start: 0, width: 0 });
  const measuredMargin = shallowRef(0);
  const injectedWidths = shallowRef({ leadingWidth: 0, trailingWidth: 0 });
  watch(
    [element, context.active, mobile, () => context.table.columns.value],
    ([node, active], _old, cleanup) => {
      if (!node || !active || typeof window === "undefined") return;
      const read = () => {
        if (disposed) return;
        const next = readColumnViewport(node);
        if (
          next.start !== viewport.value.start ||
          next.width !== viewport.value.width
        )
          viewport.value = next;
        const nextMargin = measureWindowScrollMargin(node);
        if (nextMargin !== measuredMargin.value)
          measuredMargin.value = nextMargin;
        const leadingWidth = [
          ...node.querySelectorAll(
            '[data-adapttable-part="expand-header"], [data-adapttable-part="selection-header"], [data-adapttable-part="reorder-header"]'
          ),
        ].reduce(
          (width, control) => width + control.getBoundingClientRect().width,
          0
        );
        const bounds = node.getBoundingClientRect();
        const trailingWidth = [
          ...node.querySelectorAll('[data-adapttable-part="actions-header"]'),
        ].reduce((width, control) => {
          const rect = control.getBoundingClientRect();
          return (
            width +
            Math.max(
              0,
              Math.min(rect.right, bounds.right) -
                Math.max(rect.left, bounds.left)
            )
          );
        }, 0);
        if (
          leadingWidth !== injectedWidths.value.leadingWidth ||
          trailingWidth !== injectedWidths.value.trailingWidth
        )
          injectedWidths.value = { leadingWidth, trailingWidth };
      };
      node.addEventListener("scroll", read, { passive: true });
      window.addEventListener("resize", read);
      const observer =
        typeof ResizeObserver === "undefined"
          ? undefined
          : new ResizeObserver(read);
      observer?.observe(node);
      observer?.observe(document.documentElement);
      const mutation =
        typeof MutationObserver === "undefined"
          ? undefined
          : new MutationObserver(read);
      mutation?.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["style", "class", "hidden"],
      });
      read();
      cleanup(() => {
        node.removeEventListener("scroll", read);
        window.removeEventListener("resize", read);
        observer?.disconnect();
        mutation?.disconnect();
      });
    },
    { immediate: true, flush: "post" }
  );
  const items = shallowRef<readonly VirtualItem[]>([]);
  const estimate = (index: number): number => {
    const slot = scrollSlots.value[index];
    const style =
      slot?.kind === "row"
        ? (slot.wiring.attrs.style as { height?: number | string } | undefined)
        : undefined;
    const measured = Number.parseFloat(String(style?.height ?? ""));
    if (Number.isFinite(measured) && measured > 0) return measured;
    return mobile.value
      ? (options.value.estimateCardSize ?? 240)
      : (options.value.estimateRowSize ?? 56);
  };
  const common = () => ({
    count: scrollSlots.value.length,
    enabled: enabled.value,
    estimateSize: estimate,
    getItemKey: (index: number) => scrollSlots.value[index]?.key ?? index,
    overscan: options.value.virtualOverscan ?? 5,
    onChange: () => {
      items.value = current().getVirtualItems();
      triggerRef(items);
    },
  });
  const elementVirtualizer = new Virtualizer<HTMLElement, Element>({
    ...common(),
    enabled: false,
    getScrollElement: () => element.value,
    observeElementRect,
    observeElementOffset,
    scrollToFn: elementScroll,
  });
  const pageVirtualizer = new Virtualizer<Window, Element>({
    ...common(),
    enabled: false,
    getScrollElement: () => (typeof window === "undefined" ? null : window),
    observeElementRect: observeWindowRect,
    observeElementOffset: observeWindowOffset,
    scrollToFn: windowScroll,
  });
  function current() {
    return elementMode.value ? elementVirtualizer : pageVirtualizer;
  }
  const pairs = new RowPairMeasureController((index, size) =>
    current().resizeItem(index, size)
  );
  watchEffect(
    () => {
      if (disposed) return;
      const settings = common();
      elementVirtualizer.setOptions({
        ...elementVirtualizer.options,
        ...settings,
        enabled: enabled.value && elementMode.value,
      });
      const margin = options.value.virtualScrollMargin ?? measuredMargin.value;
      pageVirtualizer.setOptions({
        ...pageVirtualizer.options,
        ...settings,
        enabled: enabled.value && !elementMode.value,
        scrollMargin: margin,
      });
      elementVirtualizer._willUpdate();
      pageVirtualizer._willUpdate();
      items.value = current().getVirtualItems();
    },
    { flush: "post" }
  );
  watch(
    context.active,
    (active, _previous, cleanup) => {
      if (!active) return;
      const stopElement = elementVirtualizer._didMount();
      const stopPage = pageVirtualizer._didMount();
      const stopPairs = pairs.connect();
      cleanup(() => {
        stopPairs();
        stopElement();
        stopPage();
      });
    },
    { immediate: true, flush: "sync" }
  );
  let endLatch = new EndReachedLatch();
  watch(
    () => context.source.value.tableEngine,
    () => {
      endLatch = new EndReachedLatch();
    }
  );
  watch([items, enabled, () => context.table.canLoadMore.value], () => {
    if (
      context.table.canLoadMore.value &&
      endLatch.check(
        enabled.value,
        scrollSlots.value.length,
        items.value.at(-1)?.index
      )
    )
      context.table.loadMore();
  });
  const model: ComputedRef<BodyWindowModel<TRow>> = computed(() => {
    const window = keyedWindow({
      enabled: enabled.value,
      count: scrollSlots.value.length,
      virtualizer: current(),
      items: items.value,
      estimateSize: estimate,
    });
    const measure =
      (index: number, detail: boolean) => (node: Element | null) =>
        pairs.attach(index, detail ? "detail" : "row", node);
    const desktopSlots = windowBodySlots(
      body.value.desktop.bodySlots ?? [],
      window,
      body.value.desktop.columnCount,
      measure,
      desktopSections.value
    );
    const mobileSlots = windowBodySlots(
      body.value.mobile.bodySlots ?? [],
      window,
      1,
      (index) => (node) => pairs.attach(index, "row", node),
      mobileSections.value
    );
    const desktopRows = window.enabled
      ? slotRows(desktopSlots)
      : body.value.desktop.rows;
    const mobileRows = window.enabled
      ? slotRows(mobileSlots)
      : body.value.mobile.rows;
    const desktopColumns = windowBodyColumns(
      { ...body.value.desktop, rows: desktopRows, bodySlots: desktopSlots },
      {
        enabled: options.value.virtualizeColumns === true && !mobile.value,
        viewport: viewport.value,
        widths: context.table.columnWidths.value,
        pinnedKeys: new Set(
          Object.keys(context.table.layout.value.state.pinned)
        ),
        pinnedSides: context.table.layout.value.state.pinned,
        ...injectedWidths.value,
        collapsedGroups: context.table.layout.value.state.collapsedGroups,
        collapsible: context.table.headerPlan.value?.some((level) =>
          level.some((cell) => cell.kind === "group" && cell.cell.collapsible)
        ),
      }
    );
    return {
      logicalRows: logicalRows.value,
      projection: {
        desktop: desktopColumns,
        mobile: {
          ...body.value.mobile,
          rows: mobileRows,
          bodySlots: mobileSlots,
        },
      },
      scrollToColumn: (columnKey) => {
        if (
          disposed ||
          !context.active.value ||
          !options.value.virtualizeColumns ||
          mobile.value ||
          !element.value
        )
          return;
        const start = columnScrollTarget({
          columns: context.table.columns.value,
          columnKey,
          viewport: readColumnViewport(element.value),
          ...injectedWidths.value,
          widths: context.table.columnWidths.value,
          pinnedKeys: new Set(
            Object.keys(context.table.layout.value.state.pinned)
          ),
        });
        if (start === undefined) return;
        element.value.scrollLeft =
          context.table.dir.value === "rtl" ? -start : start;
        viewport.value = readColumnViewport(element.value);
      },
      scrollToRow: (rowId) => {
        const index = scrollSlots.value.findIndex(
          (slot) => slot.kind === "row" && slot.wiring.key === rowId
        );
        if (enabled.value && index >= 0)
          current().scrollToIndex(index, { align: "auto" });
      },
    };
  });
  watchEffect(
    () => context.state.set(bodyWindowModelKey<TRow>(), model.value),
    { flush: "sync" }
  );
  onScopeDispose(() => {
    disposed = true;
    elementVirtualizer.setOptions({
      ...elementVirtualizer.options,
      enabled: false,
    });
    pageVirtualizer.setOptions({ ...pageVirtualizer.options, enabled: false });
    elementVirtualizer._willUpdate();
    pageVirtualizer._willUpdate();
  });
}
export function virtualize(
  options: VirtualizeOptions = true
): StaticTableFeature {
  const base = coreVirtualize(options);
  return {
    ...base,
    apply: (input) => ({
      ...base.apply?.(input),
      bodyModel: projectHeadlessRows,
    }),
    mount: mountVirtualize,
  };
}

/** The neutral logical column window, preserving the already-built cell model. */
export function windowBodyColumns<TRow>(
  desktop: DesktopTableModel<TRow>,
  options: {
    readonly enabled: boolean;
    readonly viewport: { readonly start: number; readonly width: number };
    readonly widths?: Readonly<Record<string, number>>;
    readonly pinnedKeys?: ReadonlySet<string>;
    readonly pinnedSides?: Readonly<Record<string, "start" | "end">>;
    readonly leadingWidth?: number;
    readonly trailingWidth?: number;
    readonly collapsedGroups?: readonly string[];
    readonly collapsible?: boolean;
  }
): DesktopTableModel<TRow> {
  const hasSpans = (desktop.bodySlots ?? []).some(
    (slot) =>
      slot.kind === "row" &&
      slot.wiring.cells.some(
        (cell) =>
          Number(cell.attrs.colspan ?? 1) > 1 ||
          Number(cell.attrs.rowspan ?? 1) > 1
      )
  );
  const plan = columnWindowPlan({
    columns: desktop.headers.map((header) => header.column),
    ...options,
    enabled: options.enabled && !hasSpans,
  });
  if (!plan.enabled) return desktop;
  const keys = new Set(plan.columns.map((column) => column.key));
  const row = (value: TableRowModel<TRow>): TableRowModel<TRow> => ({
    ...value,
    cells: plan.columns.flatMap((column) => {
      const cell = value.cells.find(
        (candidate) => candidate.key === column.key
      );
      return cell ? [cell] : [];
    }),
  });
  const count =
    desktop.columnCount - desktop.headers.length + plan.columns.length + 2;
  return {
    ...desktop,
    headers: plan.columns.flatMap((column) => {
      const header = desktop.headers.find(
        (candidate) => candidate.key === column.key
      );
      return header ? [header] : [];
    }),
    rows: desktop.rows.map(row),
    columnCount: count,
    headerPlan: htmlGroupedHeaderPlan(
      plan.columns,
      options.collapsedGroups,
      options.collapsible
    ),
    columnSpacers: { start: plan.paddingStart, end: plan.paddingEnd },
    bodySlots: desktop.bodySlots?.map((slot) => {
      if (slot.kind === "row") return { ...slot, wiring: row(slot.wiring) };
      if (slot.kind === "group" && slot.model)
        return {
          ...slot,
          model: {
            ...slot.model,
            columns: plan.columns.filter((column) => keys.has(column.key)),
            leadingColumns: slot.model.leadingColumns + 1,
            trailingColumns: slot.model.trailingColumns + 1,
          },
        };
      if (slot.kind === "extra" || slot.kind === "virtualPad")
        return { ...slot, colSpan: count };
      return slot;
    }),
  };
}
