/** The management panel owns rename state and structure; kits own controls. */
import {
  createSavedViewRenameController,
  resolveLabels,
  type SavedView,
  type SavedViewGlyph,
  savedViewRowControls,
} from "@adapttable/core";
import type {
  SavedViewsPanelChromeProps as NeutralPanelProps,
  SavedViewsPanelSlots as NeutralPanelSlots,
} from "@adapttable/core/binding";
import { defineComponent, h, type VNodeChild, watch } from "vue";

import { useExternalStore, useScopeActivity } from "../store";
export type SavedViewsPanelSlots = NeutralPanelSlots<VNodeChild>;
export type SavedViewsPanelChromeProps = NeutralPanelProps<VNodeChild>;
export type {
  SavedViewControlKey,
  SavedViewsPanelEmptyProps,
  SavedViewsPanelInputProps,
} from "@adapttable/core/binding";
const layout = {
  row: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: "6px",
    minWidth: 0,
  },
  caption: {
    display: "flex",
    flexWrap: "nowrap",
    alignItems: "center",
    gap: "6px",
    flex: "1 1 9rem",
    minWidth: 0,
  },
  controls: {
    display: "flex",
    alignItems: "center",
    gap: "2px",
    flex: "0 0 auto",
    minWidth: 0,
  },
  control: { flex: "0 0 auto" },
} as const;
function glyph({ paths, filled }: SavedViewGlyph): VNodeChild {
  return h(
    "svg",
    {
      width: 14,
      height: 14,
      viewBox: "0 0 24 24",
      fill: filled ? "currentColor" : "none",
      stroke: "currentColor",
      "stroke-width": 1.9,
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
      "aria-hidden": "true",
      focusable: "false",
    },
    paths.map((d) => h("path", { key: d, d }))
  );
}
export const SavedViewsPanelChrome = /*#__PURE__*/ defineComponent(
  (props: SavedViewsPanelChromeProps) => {
    const active = useScopeActivity();
    const rename = createSavedViewRenameController();
    const state = useExternalStore(rename);
    watch(
      () => props.views,
      (views) => {
        if (
          state.value.editing !== null &&
          !views.some(
            (view) => view.name === state.value.editing && !view.readOnly
          )
        )
          rename.cancel();
      },
      { flush: "sync" }
    );
    const run = (callback: () => void): void => {
      if (active.value) callback();
    };
    const focus = (element: HTMLInputElement | null): void => {
      if (active.value) element?.focus();
    };
    const rowFor = (view: SavedView, index: number): VNodeChild => {
      const labels = resolveLabels(props.labels);
      const controls = props.slots;
      const isEditing = state.value.editing === view.name;
      return controls.Row({
        "data-adapttable-part": "saved-view-row",
        layout,
        viewName: view.name,
        isEditing,
        isDefault: view.isDefault === true,
        readOnly: view.readOnly === true,
        defaultLabel: labels.defaultViewBadge,
        readOnlyLabel: labels.readOnlyViewBadge,
        name: isEditing
          ? controls.Input({
              label: labels.viewName,
              ref: focus,
              value: state.value.draft,
              onChange: (next) => run(() => rename.setDraft(next)),
              onCommit: () => run(() => rename.commit(props.onRename)),
              onCancel: () => run(rename.cancel),
            })
          : view.name,
        onApply: () => run(() => props.onApply(view.name)),
        applyLabel: labels.applyView,
        controls: savedViewRowControls({
          view,
          index,
          count: props.views.length,
          editing: isEditing,
          labels,
          onStartRename: () => run(() => rename.begin(view.name)),
          onMove: (delta) => run(() => props.onMove(view.name, delta)),
          onSetDefault: () => run(() => props.onSetDefault(view.name)),
          onRemove: () => run(() => props.onRemove(view.name)),
        }).map(({ glyph: shape, ...control }) => ({
          ...control,
          icon: glyph(shape),
        })),
      });
    };
    return () => {
      const labels = resolveLabels(props.labels);
      const controls = props.slots;
      for (const key of ["Surface", "Row", "Input", "Empty"] as const)
        if (!controls[key])
          throw new Error(
            `AdaptTable: required adapter control slot "SavedViewsPanel.${key}" is missing.`
          );
      const children: VNodeChild[] = props.views.length
        ? props.views.map(rowFor)
        : [controls.Empty({ message: labels.savedViews })];
      return controls.Surface({
        "data-adapttable-part": "saved-views-panel",
        className: props.className,
        title: labels.savedViews,
        footer: props.footer,
        children,
      });
    };
  },
  {
    name: "SavedViewsPanelChrome",
    props: [
      "views",
      "onApply",
      "onRename",
      "onMove",
      "onSetDefault",
      "onRemove",
      "labels",
      "footer",
      "slots",
      "className",
    ],
  }
);
