/** Column-menu structure and keyboard wiring; kits supply every control. */
import {
  defineComponent,
  Fragment,
  h,
  nextTick,
  onScopeDispose,
  shallowRef,
  useId,
  type VNodeChild,
  watch,
} from "vue";

import { type Attrs, elementRef } from "../attrs";
import { isManagedOverlayPanel, type OverlayPanelSlot } from "../overlayPanel";
import type {
  ColumnHeaderRenameSlotProps,
  ColumnMenuLabels,
} from "./columnMenuContracts";
import type { ColumnMenuDisplayRow, ColumnMenuModel } from "./useColumnMenu";
import {
  type ColumnRenameEditorState,
  useColumnRenameEditor,
} from "./useColumnRenameEditor";

export interface ColumnMenuButtonProps {
  readonly attrs: Attrs;
  readonly label: string;
  readonly icon?: "grip" | "visible" | "hidden" | "pin" | "more" | "rename";
}
export interface ColumnMenuSlots {
  readonly Trigger: (props: ColumnMenuButtonProps) => VNodeChild;
  readonly Button: (props: ColumnMenuButtonProps) => VNodeChild;
  readonly Input: (props: {
    readonly attrs: Attrs;
    readonly value: string;
    readonly onChange: (value: string) => void;
  }) => VNodeChild;
  readonly Choice: (props: {
    readonly attrs: Attrs;
    readonly value: string;
    readonly options: readonly {
      readonly value: string;
      readonly label: string;
    }[];
    readonly onChange: (value: string) => void;
  }) => VNodeChild;
  readonly Panel: OverlayPanelSlot;
}
export type ColumnRenameSlots = Pick<ColumnMenuSlots, "Button" | "Input">;
type Names = Readonly<Record<string, string | undefined>>;
function part(name: string, names: Names): Attrs {
  const key = name.replace(/-([a-z])/g, (_match, letter: string) =>
    letter.toUpperCase()
  );
  return { "data-adapttable-part": name, class: names[key] };
}
function requireSlots(slots: ColumnRenameSlots): void {
  for (const name of ["Button", "Input"] as const)
    if (typeof slots[name] !== "function")
      throw new Error(
        `AdaptTable: required adapter control slot "ColumnRename.${name}" is missing.`
      );
}
function renameForm(
  editor: ColumnRenameEditorState,
  labels: ColumnMenuLabels,
  slots: ColumnRenameSlots,
  names: Names,
  prefix: "column" | "header"
): VNodeChild {
  if (!editor.editing.value) return null;
  const stem = `${prefix}-rename`;
  const error = editor.snapshot.value.error;
  return h(
    "form",
    {
      ...part(`${stem}-form`, names),
      onSubmit: (event: SubmitEvent): void => {
        event.preventDefault();
        event.stopPropagation();
        editor.submit();
      },
      style: {
        display: "flex",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "4px",
      },
    },
    [
      h(
        "label",
        { ...part(`${stem}-label`, names), for: editor.inputId },
        labels.columnName
      ),
      slots.Input({
        attrs: { ...part(`${stem}-input`, names), ...editor.inputAttrs() },
        value: editor.snapshot.value.draft,
        onChange: editor.setDraft,
      }),
      error
        ? h(
            "span",
            {
              ...part(`${stem}-error`, names),
              id: editor.errorId,
              role: "alert",
            },
            error
          )
        : null,
      slots.Button({
        attrs: { ...part(`${stem}-save`, names), type: "submit" },
        label: labels.saveColumnName,
      }),
      slots.Button({
        attrs: {
          ...part(`${stem}-cancel`, names),
          type: "button",
          onClick: editor.cancel,
        },
        label: labels.cancelColumnRename,
      }),
    ]
  );
}
function announcement(
  editor: ColumnRenameEditorState,
  names: Names,
  prefix: "column" | "header"
): VNodeChild {
  return h(
    "span",
    {
      ...part(`${prefix}-rename-announcer`, names),
      "aria-live": "polite",
      "aria-atomic": true,
      style: {
        position: "absolute",
        width: "1px",
        height: "1px",
        padding: 0,
        overflow: "hidden",
        clipPath: "inset(50%)",
        whiteSpace: "nowrap",
      },
    },
    editor.snapshot.value.announcement
  );
}
export const ColumnHeaderRenameChrome = defineComponent(
  (
    props: ColumnHeaderRenameSlotProps & { readonly slots: ColumnRenameSlots }
  ) => {
    const editor = useColumnRenameEditor(() => ({
      key: props.columnKey,
      name: props.name,
      onRename: props.onRenameColumn,
      requiredMessage: props.labels.columnNameRequired,
      renamedMessage: props.labels.columnRenamed,
    }));
    return () => {
      requireSlots(props.slots);
      const names = props.classNames ?? {};
      return h(Fragment, null, [
        props.slots.Button({
          attrs: {
            ...part("header-rename-button", names),
            type: "button",
            "aria-label": `${props.labels.renameColumn}: ${props.name}`,
            disabled: editor.editing.value,
            onClick: editor.begin,
          },
          label: props.labels.renameColumn,
          icon: "rename",
        }),
        editor.editing.value
          ? renameForm(editor, props.labels, props.slots, names, "header")
          : props.children,
        announcement(editor, names, "header"),
      ]);
    };
  },
  {
    name: "ColumnHeaderRenameChrome",
    props: [
      "columnKey",
      "name",
      "onRenameColumn",
      "labels",
      "children",
      "classNames",
      "slots",
    ],
  }
);

const ColumnMenuRowChrome = defineComponent(
  (props: {
    readonly row: ColumnMenuDisplayRow;
    readonly labels: ColumnMenuLabels;
    readonly slots: ColumnMenuSlots;
    readonly classNames: Names;
    readonly active: boolean;
  }) => {
    const open = shallowRef(false);
    const editor = useColumnRenameEditor(() => props.row.rename);
    const actionTrigger = shallowRef<HTMLElement | null>(null);
    const onKeydown = (event: KeyboardEvent): void => {
      if (event.key === "Escape" && open.value) {
        event.preventDefault();
        event.stopPropagation();
        open.value = false;
        actionTrigger.value?.focus();
      }
    };
    watch(
      () => props.active,
      (active) => {
        if (!active) open.value = false;
      }
    );
    return () => {
      const { row, slots, labels, classNames: names } = props;
      const visibleLabel = `${row.hidden ? labels.showColumn : labels.hideColumn}: ${row.name}`;
      const actions = open.value ? row.actions(editor.begin) : [];
      return h(
        "div",
        {
          ...part("column-menu-item", names),
          ...row.rowAttrs,
          "data-hidden": row.hidden || undefined,
          "data-pinned": row.pinned,
          "data-actions": row.edge === "actions" ? "" : undefined,
          "data-reorder": row.edge === "reorder" ? "" : undefined,
          onKeydown,
        },
        [
          row.edge
            ? null
            : slots.Button({
                attrs: {
                  ...part("column-menu-grip", names),
                  type: "button",
                  ...row.gripAttrs,
                },
                label: `${labels.moveStart} / ${labels.moveEnd}: ${row.name}`,
                icon: "grip",
              }),
          slots.Button({
            attrs: {
              ...part("column-menu-visibility", names),
              type: "button",
              "aria-label": visibleLabel,
              "aria-pressed": !row.hidden,
              "data-active": !row.hidden || undefined,
              disabled: !row.canHide,
              onClick: row.toggleVisible,
            },
            label: visibleLabel,
            icon: row.hidden ? "hidden" : "visible",
          }),
          h(
            "span",
            {
              ...part("column-menu-label", names),
              "data-hidden": row.hidden || undefined,
            },
            row.name
          ),
          slots.Button({
            attrs: {
              ...part("column-menu-pin", names),
              type: "button",
              "aria-label": `${row.pinLabel}: ${row.name}`,
              "aria-pressed": row.pinned !== undefined,
              "data-active": row.pinned !== undefined || undefined,
              disabled: !row.canPin,
              onClick: row.togglePin,
            },
            label: `${row.pinLabel}: ${row.name}`,
            icon: "pin",
          }),
          row.edge
            ? null
            : slots.Button({
                attrs: {
                  ...part("column-menu-more", names),
                  type: "button",
                  "aria-label": `${labels.columnActions}: ${row.name}`,
                  "aria-expanded": open.value,
                  ref: elementRef<HTMLElement>((element) => {
                    actionTrigger.value = element;
                  }),
                  onClick: (): void => {
                    if (props.active) open.value = !open.value;
                  },
                },
                label: labels.columnActions,
                icon: "more",
              }),
          open.value
            ? h("div", part("column-menu-submenu", names), [
                ...actions.map((item) =>
                  "kind" in item
                    ? h(
                        "label",
                        { ...part("column-menu-choice", names), key: item.id },
                        [
                          h(
                            "span",
                            part("column-menu-choice-label", names),
                            item.label
                          ),
                          slots.Choice({
                            attrs: {
                              ...part("column-menu-choice-select", names),
                              "aria-label": item.label,
                              disabled: item.disabled,
                              onKeydown,
                            },
                            value: item.value,
                            options: item.options,
                            onChange: item.onChange,
                          }),
                        ]
                      )
                    : slots.Button({
                        attrs: {
                          ...part("column-menu-action", names),
                          key: item.id,
                          type: "button",
                          disabled:
                            item.disabled ||
                            (item.id === "rename" && editor.editing.value),
                          onClick: (): void => {
                            if (!props.active || item.disabled) return;
                            item.run();
                            if (item.id !== "rename") open.value = false;
                          },
                        },
                        label: item.label,
                      })
                ),
                renameForm(editor, labels, slots, names, "column"),
              ])
            : null,
          announcement(editor, names, "column"),
        ]
      );
    };
  },
  {
    name: "ColumnMenuRowChrome",
    props: ["row", "labels", "slots", "classNames", "active"],
  }
);

export const ColumnMenuChrome = defineComponent(
  (props: {
    readonly model: ColumnMenuModel;
    readonly slots: ColumnMenuSlots;
  }) => {
    const open = shallowRef(false);
    const root = shallowRef<HTMLElement | null>(null);
    const trigger = shallowRef<HTMLElement | null>(null);
    const panel = shallowRef<HTMLElement | null>(null);
    const panelId = `adapttable-columns-${useId()}`;
    let generation = 0;
    let surfaceLifetime = 0;
    let disposed = false;
    const rootRef = elementRef<HTMLElement>((element) => {
      if (element === null || !disposed) root.value = element;
    });
    const triggerRef = elementRef<HTMLElement>((element) => {
      if (element === null || !disposed) trigger.value = element;
    });
    const panelRef = elementRef<HTMLElement>((element) => {
      if (element === null || !disposed) panel.value = element;
    });
    watch(
      [() => props.slots.Panel, () => props.model],
      () => {
        surfaceLifetime += 1;
        generation += 1;
      },
      { flush: "sync" }
    );
    onScopeDispose(() => {
      disposed = true;
      surfaceLifetime += 1;
      generation += 1;
      open.value = false;
    });
    const close = (restore = false): void => {
      generation += 1;
      open.value = false;
      if (restore && !disposed && props.model.active.value)
        trigger.value?.focus();
    };
    const show = (): void => {
      if (disposed || !props.model.active.value) return;
      if (!open.value) surfaceLifetime += 1;
      open.value = true;
      const ticket = ++generation;
      void nextTick(() => {
        if (
          !disposed &&
          ticket === generation &&
          open.value &&
          props.model.active.value &&
          !isManagedOverlayPanel(props.slots.Panel)
        )
          panel.value
            ?.querySelector<HTMLElement>(
              'input:not([disabled]),button:not([disabled]),[tabindex="0"]'
            )
            ?.focus();
      });
    };
    watch(
      [open, () => props.model.active.value, root, () => props.slots.Panel],
      ([expanded, active, element], _previous, cleanup) => {
        if (!active) {
          surfaceLifetime += 1;
          close();
          return;
        }
        if (!expanded || !element || isManagedOverlayPanel(props.slots.Panel))
          return;
        const doc = element.ownerDocument;
        const outside = (event: PointerEvent): void => {
          const path = event.composedPath();
          if (
            !path.includes(element) &&
            (!panel.value || !path.includes(panel.value))
          )
            close();
        };
        const keyboard = (event: KeyboardEvent): void => {
          if (event.key === "Escape" && !event.defaultPrevented) {
            event.preventDefault();
            close(true);
          }
        };
        doc.addEventListener("pointerdown", outside);
        doc.addEventListener("keydown", keyboard);
        cleanup(() => {
          doc.removeEventListener("pointerdown", outside);
          doc.removeEventListener("keydown", keyboard);
        });
      },
      { flush: "sync" }
    );
    return () => {
      const { model, slots } = props;
      const lifetime = surfaceLifetime;
      const driver = slots.Panel;
      const isCurrent = () =>
        !disposed &&
        model.active.value &&
        lifetime === surfaceLifetime &&
        driver === props.slots.Panel &&
        model === props.model;
      for (const name of [
        "Trigger",
        "Button",
        "Input",
        "Choice",
        "Panel",
      ] as const)
        if (typeof slots[name] !== "function")
          throw new Error(
            `AdaptTable: required adapter control slot "ColumnMenu.${name}" is missing.`
          );
      const {
        labels,
        dir,
        classNames = {},
        container,
      } = model.presentation.value;
      const names = classNames;
      const row = (item: ColumnMenuDisplayRow) =>
        h(ColumnMenuRowChrome, {
          key: item.key,
          row: item,
          labels,
          slots,
          classNames: names,
          active: model.active.value,
        });
      const button = (name: string, label: string, onClick: () => void) =>
        slots.Button({
          attrs: { ...part(name, names), type: "button", onClick },
          label,
        });
      const content = open.value
        ? [
            h("div", part("column-menu-header", names), [
              h("span", part("column-menu-title", names), labels.columns),
            ]),
            slots.Input({
              attrs: {
                ...part("column-menu-search", names),
                type: "search",
                placeholder: labels.searchColumns,
                "aria-label": labels.searchColumns,
              },
              value: model.query.value,
              onChange: model.setQuery,
            }),
            h("div", part("column-menu-bulk", names), [
              button(
                "column-menu-bulk-button",
                labels.showAllColumns,
                model.showAll
              ),
              button(
                "column-menu-bulk-button",
                labels.hideAllColumns,
                model.hideAll
              ),
              button(
                "column-menu-bulk-button",
                labels.unpinAllColumns,
                model.unpinAll
              ),
            ]),
            ...model.rows.value.map(row),
            model.edgeRows.value.length
              ? h("hr", part("column-menu-separator", names))
              : null,
            ...model.edgeRows.value.map(row),
            button(
              "column-menu-auto-size",
              labels.autoSizeColumns,
              model.autoSize
            ),
            button("column-menu-reset", labels.resetColumns, model.reset),
          ]
        : null;
      return h(
        "div",
        {
          ...part("column-menu", names),
          dir,
          ref: rootRef,
          style: { position: "relative" },
        },
        [
          slots.Trigger({
            attrs: {
              ...part("column-menu-button", names),
              type: "button",
              "aria-expanded": open.value,
              "aria-haspopup": "dialog",
              "aria-controls": open.value ? panelId : undefined,
              "data-active": open.value || undefined,
              ref: triggerRef,
              onClick: (): void => {
                if (open.value) close();
                else show();
              },
              onKeydown: (event: KeyboardEvent): void => {
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  show();
                }
              },
            },
            label: labels.columns,
          }),
          open.value
            ? slots.Panel({
                attrs: {
                  ...part("column-menu-panel", names),
                  id: panelId,
                  role: "dialog",
                  "aria-label": labels.columns,
                  dir,
                  ref: panelRef,
                  style: isManagedOverlayPanel(driver)
                    ? undefined
                    : {
                        position: "absolute",
                        insetInlineEnd: 0,
                        top: "100%",
                        zIndex: 100,
                        maxWidth: "min(28rem, 90vw)",
                        maxHeight: "70vh",
                        overflow: "auto",
                      },
                },
                content,
                container,
                anchor: trigger.value,
                open: open.value,
                isCurrent,
                onClose: () => {
                  if (!isManagedOverlayPanel(driver)) {
                    close(true);
                    return;
                  }
                  if (isCurrent() && open.value) close();
                },
              })
            : null,
        ]
      );
    };
  },
  { name: "ColumnMenuChrome", props: ["model", "slots"] }
);
