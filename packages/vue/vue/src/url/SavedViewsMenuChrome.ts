/** Saved-view disclosure and keyboard wiring, shared by every Vue kit. */
/** Saved-view disclosure and keyboard wiring, shared by every Vue kit. */
import {
  defineComponent,
  h,
  nextTick,
  onScopeDispose,
  type PropType,
  shallowRef,
  useId,
  type VNodeChild,
  watch,
} from "vue";

import { type Attrs, elementRef } from "../attrs";
import { isManagedOverlayPanel, type OverlayPanelSlot } from "../overlayPanel";
import { useScopeActivity } from "../store";
import type { SavedViewsControlProps } from "../viewControls/contracts";
import type { ViewControlButtonProps } from "../viewControls/viewControlsChrome";

export interface SavedViewsMenuSlots {
  readonly Trigger: (props: ViewControlButtonProps) => VNodeChild;
  readonly Button: (props: ViewControlButtonProps) => VNodeChild;
  readonly Input: (props: {
    readonly attrs: Attrs;
    readonly value: string;
    readonly onChange: (value: string) => void;
  }) => VNodeChild;
  readonly Panel: OverlayPanelSlot;
}
export interface SavedViewsMenuChromeProps extends SavedViewsControlProps {
  readonly slots: SavedViewsMenuSlots;
}
export const SavedViewsMenuChrome = /*#__PURE__*/ defineComponent(
  (props: SavedViewsMenuChromeProps) => {
    const active = useScopeActivity();
    const open = shallowRef(false);
    const name = shallowRef("");
    const root = shallowRef<HTMLElement | null>(null);
    const trigger = shallowRef<HTMLElement | null>(null);
    const panel = shallowRef<HTMLElement | null>(null);
    const panelId = `adapttable-views-${useId()}`;
    let focusPanel = false;
    let surfaceLifetime = 0;
    watch(
      [() => props.slots.Panel, () => props.savedViews],
      () => {
        surfaceLifetime += 1;
        focusPanel = false;
      },
      { flush: "sync" }
    );
    onScopeDispose(() => {
      surfaceLifetime += 1;
      focusPanel = false;
      open.value = false;
    });
    const close = (restore = false): void => {
      open.value = false;
      focusPanel = false;
      if (!restore || !active.value) return;
      const anchor = trigger.value;
      if (!anchor) return;
      const doc = anchor.ownerDocument;
      const focused = doc.activeElement;
      // Apply may navigate and focus a new host surface before closing.
      if (
        focused === doc.body ||
        focused === anchor ||
        panel.value?.contains(focused)
      )
        anchor.focus();
    };
    const focusFirst = (): void => {
      if (
        focusPanel &&
        active.value &&
        !isManagedOverlayPanel(props.slots.Panel)
      ) {
        panel.value
          ?.querySelector<HTMLElement>(
            'button:not([disabled]), input:not([disabled]), [tabindex="0"]'
          )
          ?.focus();
        if (panel.value) focusPanel = false;
      }
    };
    const show = (): void => {
      if (!active.value) return;
      if (!open.value) surfaceLifetime += 1;
      focusPanel = !isManagedOverlayPanel(props.slots.Panel);
      open.value = true;
      void nextTick(focusFirst);
    };
    const keyboard = (event: KeyboardEvent): void => {
      if (event.key === "Escape" && open.value) {
        event.preventDefault();
        event.stopPropagation();
        close(true);
      }
    };
    watch(
      [open, active, root, () => props.slots.Panel],
      ([expanded, live, element], _previous, onCleanup) => {
        if (!live) {
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
        doc.addEventListener("pointerdown", outside);
        doc.addEventListener("keydown", keyboard);
        onCleanup(() => {
          doc.removeEventListener("pointerdown", outside);
          doc.removeEventListener("keydown", keyboard);
        });
      },
      { flush: "sync" }
    );
    const rootRef = elementRef<HTMLElement>((element) => {
      root.value = element;
    });
    const triggerRef = elementRef<HTMLElement>((element) => {
      trigger.value = element;
    });
    const panelRef = elementRef<HTMLElement>((element) => {
      panel.value = element;
      focusFirst();
    });
    const canSave = (): boolean =>
      name.value.trim() !== "" &&
      !props.savedViews.views.value.some(
        (view) => view.name === name.value.trim() && view.readOnly
      );
    return () => {
      for (const key of ["Trigger", "Button", "Input", "Panel"] as const)
        if (!props.slots[key])
          throw new Error(
            `AdaptTable: required adapter control slot "SavedViewsMenu.${key}" is missing.`
          );
      const lifetime = surfaceLifetime;
      const driver = props.slots.Panel;
      const model = props.savedViews;
      const isCurrent = () =>
        active.value &&
        lifetime === surfaceLifetime &&
        driver === props.slots.Panel &&
        model === props.savedViews;
      const canAct = () => isCurrent() && open.value;
      // The trigger survives popup sessions; only its owner must remain live.
      const canToggle = () =>
        active.value &&
        driver === props.slots.Panel &&
        model === props.savedViews;
      const save = (): void => {
        if (!canAct() || !canSave()) return;
        model.save(name.value.trim());
        name.value = "";
      };
      const names = props.classNames ?? {};
      const control = props.slots;
      const parts = (part: string, className: string | undefined): Attrs => ({
        "data-adapttable-part": part,
        class: className,
      });
      const rows = props.savedViews.views.value.map((view) =>
        h(
          "div",
          {
            key: view.name,
            ...parts("views-row", names.viewsRow),
            style: { display: "flex", alignItems: "center", gap: "6px" },
          },
          [
            control.Button({
              attrs: {
                ...parts("views-item", names.viewsItem),
                type: "button",
                onClick: () => {
                  if (!canAct() || !model.views.value.includes(view)) return;
                  model.apply(view.name);
                  close(true);
                },
              },
              label: view.name,
            }),
            control.Button({
              attrs: {
                ...parts("views-delete", names.viewsDelete),
                type: "button",
                disabled: view.readOnly === true,
                "aria-label": `${props.labels.deleteView}: ${view.name}`,
                onClick: () => {
                  if (
                    canAct() &&
                    model.views.value.includes(view) &&
                    !view.readOnly
                  )
                    model.remove(view.name);
                },
              },
              label: "×",
            }),
          ]
        )
      );
      const content = [
        ...rows,
        h("hr", parts("views-divider", names.viewsDivider)),
        h(
          "div",
          {
            ...parts("views-save-row", names.viewsSaveRow),
            style: {
              display: "flex",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "6px",
            },
          },
          [
            control.Input({
              attrs: {
                ...parts("views-input", names.viewsInput),
                "aria-label": props.labels.viewName,
                placeholder: props.labels.viewName,
                onKeydown: (event: KeyboardEvent) => {
                  if (event.key === "Enter" && !event.isComposing) {
                    event.preventDefault();
                    save();
                  }
                },
              },
              value: name.value,
              onChange: (next) => {
                if (canAct()) name.value = next;
              },
            }),
            control.Button({
              attrs: {
                ...parts("views-save", names.viewsSave),
                type: "button",
                disabled: !canSave(),
                onClick: save,
              },
              label: props.labels.saveView,
            }),
          ]
        ),
      ];
      return h(
        "div",
        {
          ...parts("views-menu", names.viewsMenu),
          dir: props.dir,
          ref: rootRef,
          style: { position: "relative" },
        },
        [
          control.Trigger({
            attrs: {
              ...parts("views-button", names.viewsButton),
              type: "button",
              "aria-expanded": open.value,
              "aria-haspopup": "dialog",
              "aria-controls": open.value ? panelId : undefined,
              ref: triggerRef,
              onClick: () => {
                if (canToggle()) {
                  if (open.value) close();
                  else show();
                }
              },
              onKeydown: (event: KeyboardEvent) => {
                if (canToggle() && event.key === "ArrowDown") {
                  event.preventDefault();
                  show();
                }
              },
            },
            label: props.labels.savedViews,
          }),
          open.value
            ? control.Panel({
                attrs: {
                  ...parts("views-panel", names.viewsPanel),
                  id: panelId,
                  role: "dialog",
                  "aria-label": props.labels.savedViews,
                  dir: props.dir,
                  ref: panelRef,
                  style: isManagedOverlayPanel(driver)
                    ? undefined
                    : {
                        position: "absolute",
                        insetInlineStart: 0,
                        top: "100%",
                        zIndex: 100,
                        maxWidth: "min(24rem, 90vw)",
                      },
                },
                content,
                container: props.container,
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
  {
    name: "SavedViewsMenuChrome",
    props: {
      savedViews: {
        type: Object as PropType<SavedViewsMenuChromeProps["savedViews"]>,
      },
      labels: { type: Object as PropType<SavedViewsMenuChromeProps["labels"]> },
      dir: { type: String as PropType<SavedViewsMenuChromeProps["dir"]> },
      classNames: {
        type: Object as PropType<SavedViewsMenuChromeProps["classNames"]>,
      },
      container: {
        type: Object as PropType<SavedViewsMenuChromeProps["container"]>,
      },
      slots: { type: Object as PropType<SavedViewsMenuChromeProps["slots"]> },
    },
  }
);
