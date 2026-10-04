import {
  initialColumnLayout,
  withColumnHidden,
  withColumnMoved,
  withColumnOrder,
  withColumnPinned,
} from "@adapttable/core";
import type { TableRuntimeView } from "@adapttable/core/binding";

import {
  revisionStampWithOverlays,
  type RuntimeOverlays,
  runtimeOverlays,
  type RuntimeOverlayView,
  stampJson,
} from "./runtimeViewStamp";

/** Binding-owned overlay operations supported by controlled settlement. */
export type ControlledMethod =
  "hideColumn" | "setColumnOrder" | "moveColumn" | "setSelection" | "pinColumn";
export interface ControlledMutationPlan {
  readonly changed: boolean;
  readonly source: TableRuntimeView["neutralTable"];
  readonly classify: (
    actual: TableRuntimeView | undefined
  ) => "accepted" | "unconfirmed" | "foreign";
}
type PlanResult =
  | { readonly ok: true; readonly plan: ControlledMutationPlan }
  | { readonly ok: false; readonly code: string; readonly message: string };
type TargetResult =
  | {
      readonly ok: true;
      readonly overlays: RuntimeOverlays;
      readonly changedKey?: string;
    }
  | { readonly ok: false; readonly code: string; readonly message: string };
function refusal(code: string, message: string) {
  return { ok: false as const, code, message };
}
function strings(value: unknown): value is readonly string[] {
  return (
    Array.isArray(value) &&
    value.every((entry: unknown) => typeof entry === "string")
  );
}
function targetState(
  method: ControlledMethod,
  overlays: RuntimeOverlays
): unknown {
  switch (method) {
    case "hideColumn":
      return overlays.hiddenColumns;
    case "pinColumn":
      return overlays.pinnedColumns;
    case "setSelection":
      return overlays.selection;
    default:
      return overlays.columnOrder;
  }
}
/** Mask only the requested transition; unrelated overlay changes stay visible. */
function protectedOverlays(
  method: ControlledMethod,
  overlays: RuntimeOverlays,
  changedKey?: string
): RuntimeOverlays {
  switch (method) {
    case "hideColumn":
      return {
        ...overlays,
        hiddenColumns: overlays.hiddenColumns?.filter(
          (key) => key !== changedKey
        ),
      };
    case "pinColumn":
      return {
        ...overlays,
        pinnedColumns: overlays.pinnedColumns?.filter(
          ([key]) => key !== changedKey
        ),
      };
    case "setColumnOrder":
    case "moveColumn":
      return { ...overlays, columnOrder: undefined };
    case "setSelection":
      return {
        ...overlays,
        selection: overlays.selection
          ? { ...overlays.selection, ids: [], allMatching: false }
          : undefined,
      };
  }
}
function protectedStamp(
  method: ControlledMethod,
  view: TableRuntimeView,
  changedKey?: string
): string {
  const revision = revisionStampWithOverlays(
    view,
    protectedOverlays(method, runtimeOverlays(view), changedKey)
  );
  // Engine revisions own row content and order. Server visible windows have no
  // engine authority, so use the same JSON rules as the server revision stamp.
  return view.neutralTable
    ? revision
    : `${revision}:${stampJson(view.visibleRows)}`;
}
function selectionTarget(
  args: readonly unknown[],
  view: RuntimeOverlayView
): TargetResult {
  const selection = view.selection;
  if (!selection || typeof selection.replace !== "function")
    return refusal("not-wired", "setSelection is not wired");
  if (
    typeof selection.allMatching !== "boolean" ||
    typeof selection.acrossPages !== "boolean"
  )
    return refusal(
      "apply-not-confirmed",
      "selection scope is not authoritative"
    );
  const ids = args[0];
  if (ids !== undefined && !strings(ids))
    return refusal(
      "invalid-arguments",
      "selection ids must be an array of strings"
    );
  return {
    ok: true,
    overlays: runtimeOverlays({
      ...view,
      selection: {
        ...selection,
        selectedIds: new Set(ids),
        allMatching: false,
      },
    }),
  };
}
function pinTarget(
  args: readonly unknown[],
  view: RuntimeOverlayView
): TargetResult {
  const pinning = view.pinning;
  if (!pinning || typeof pinning.setColumnPin !== "function")
    return refusal("not-wired", "pinColumn is not wired");
  const [key, side] = args;
  if (
    typeof key !== "string" ||
    (side !== undefined && side !== "start" && side !== "end")
  )
    return refusal(
      "invalid-arguments",
      "column pin takes a string key and start, end or undefined"
    );
  const state = initialColumnLayout({ pinned: pinning.columns });
  const next = withColumnPinned(state, key, side);
  return {
    ok: true,
    changedKey: key,
    overlays: runtimeOverlays({
      ...view,
      pinning: { ...pinning, columns: next.pinned },
    }),
  };
}
function layoutTarget(
  method: Exclude<ControlledMethod, "setSelection" | "pinColumn">,
  args: readonly unknown[],
  view: RuntimeOverlayView
): TargetResult {
  const layout = view.columnLayout;
  const setter = {
    hideColumn: "setHidden",
    moveColumn: "move",
    setColumnOrder: "setOrder",
  } as const;
  if (!layout || typeof layout[setter[method]] !== "function")
    return refusal("not-wired", `${method} is not wired`);
  const state = initialColumnLayout({
    hidden: layout.hidden,
    order: layout.keys,
  });
  if (method === "setColumnOrder") {
    if (!strings(args[0]))
      return refusal(
        "invalid-arguments",
        "column order must be an array of strings"
      );
    const next = withColumnOrder(state, layout.keys, args[0]) ?? state;
    return {
      ok: true,
      overlays: runtimeOverlays({
        ...view,
        columnLayout: { ...layout, keys: next.order },
      }),
    };
  }
  const [key, value] = args;
  if (typeof key !== "string")
    return refusal("invalid-arguments", "column key must be a string");
  if (method === "hideColumn") {
    if (typeof value !== "boolean")
      return refusal("invalid-arguments", "hidden must be a boolean");
    const next = withColumnHidden(state, key, value);
    return {
      ok: true,
      changedKey: key,
      overlays: runtimeOverlays({
        ...view,
        columnLayout: { ...layout, hidden: next.hidden },
      }),
    };
  }
  if (typeof value !== "number")
    return refusal("invalid-arguments", "column index must be a number");
  const next = withColumnMoved(state, layout.keys, key, value) ?? state;
  return {
    ok: true,
    overlays: runtimeOverlays({
      ...view,
      columnLayout: { ...layout, keys: next.order },
    }),
  };
}
function targetFor(
  method: ControlledMethod,
  args: readonly unknown[],
  view: TableRuntimeView
): TargetResult {
  // Project only overlays. Spreading a full runtime can read unrelated getters.
  const overlays: RuntimeOverlayView = {
    columnLayout: view.columnLayout,
    pinning: view.pinning,
    selection: view.selection,
  };
  if (method === "setSelection") return selectionTarget(args, overlays);
  if (method === "pinColumn") return pinTarget(args, overlays);
  return layoutTarget(method, args, overlays);
}
/** Prepare at the lane head using the runtime's revision authority and core transitions. */
export function planControlledMutation(
  method: ControlledMethod,
  args: readonly unknown[],
  view: TableRuntimeView | undefined
): PlanResult {
  if (!view) return refusal("not-wired", "the table runtime is unavailable");
  const planned = targetFor(method, args, view);
  if (!planned.ok) return planned;
  const source = view.neutralTable;
  const before = protectedStamp(method, view, planned.changedKey);
  const expected = stampJson(targetState(method, planned.overlays));
  const changed =
    stampJson(targetState(method, runtimeOverlays(view))) !== expected;
  return {
    ok: true,
    plan: Object.freeze({
      source,
      changed,
      classify(actual: TableRuntimeView | undefined) {
        if (
          !actual ||
          actual.neutralTable !== source ||
          protectedStamp(method, actual, planned.changedKey) !== before
        )
          return "foreign";
        return stampJson(targetState(method, runtimeOverlays(actual))) ===
          expected
          ? "accepted"
          : "unconfirmed";
      },
    }),
  };
}
