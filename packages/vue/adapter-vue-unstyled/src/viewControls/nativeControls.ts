import {
  type DensityChooserSlots,
  elementRef,
  type SavedViewsMenuSlots,
  type SavedViewsPanelSlots,
  type ViewControlButtonProps,
} from "@adapttable/vue/adapter";
import { h, mergeProps, type VNode } from "vue";

/** The binding's attrs include the actual semantic target and focus refs. */
export function nativeViewButton({
  attrs,
  label,
}: ViewControlButtonProps): VNode {
  return h("button", attrs, label);
}

export const nativeDensityControl: DensityChooserSlots["Control"] = (control) =>
  h(
    "select",
    mergeProps(control.attrs, {
      value: control.value,
      onChange: (event: Event): void => {
        const target = event.currentTarget;
        if (!(target instanceof HTMLSelectElement)) return;
        const value = target.value;
        if (value === "comfortable" || value === "compact")
          control.onChange(value);
        // The next Vue render applies accepted state. An unchanged controlled
        // prop must also restore the DOM after a host rejects the request.
        target.value = control.value;
      },
    }),
    control.options.map(({ value, label }) =>
      h(
        "option",
        { key: value, value, selected: value === control.value },
        label
      )
    )
  );

/** Inline native popovers stay inside the real fullscreen table root. */
export const nativeSavedViewsMenuSlots: SavedViewsMenuSlots = {
  Trigger: nativeViewButton,
  Button: nativeViewButton,
  Input: ({ attrs, value, onChange }) =>
    h(
      "input",
      mergeProps(attrs, {
        value,
        onInput: (event: Event): void => {
          const target = event.currentTarget;
          if (target instanceof HTMLInputElement) onChange(target.value);
        },
      })
    ),
  Panel: ({ attrs, content }) => h("div", attrs, [content]),
};

/** All management controls come from the binding's ordered neutral contract. */
export const nativeSavedViewsPanelSlots: SavedViewsPanelSlots = {
  Surface: (props) =>
    h(
      "section",
      {
        "data-adapttable-part": props["data-adapttable-part"],
        class: props.className,
      },
      [h("h2", props.title), props.children, props.footer]
    ),
  Row: (props) =>
    h(
      "div",
      {
        key: props.viewName,
        "data-adapttable-part": props["data-adapttable-part"],
        style: props.layout.row,
      },
      [
        h("div", { style: props.layout.caption }, [
          props.isEditing
            ? props.name
            : h(
                "button",
                {
                  type: "button",
                  title: props.applyLabel,
                  onClick: props.onApply,
                },
                [props.name]
              ),
          props.isDefault ? h("span", props.defaultLabel) : null,
          props.readOnly ? h("span", props.readOnlyLabel) : null,
        ]),
        h(
          "div",
          { style: props.layout.controls },
          props.controls.map((control) =>
            h(
              "button",
              {
                key: control.key,
                type: "button",
                title: control.label,
                "aria-label": control.label,
                "aria-pressed": control.pressed,
                disabled: !control.onPress,
                onClick: control.onPress,
                style: props.layout.control,
              },
              [control.icon]
            )
          )
        ),
      ]
    ),
  Input: (props) =>
    h("input", {
      ref: elementRef(props.ref),
      "aria-label": props.label,
      value: props.value,
      onInput: (event: Event): void => {
        const target = event.currentTarget;
        if (target instanceof HTMLInputElement) props.onChange(target.value);
      },
      onKeydown: (event: KeyboardEvent): void => {
        if (event.isComposing) return;
        if (event.key === "Enter") {
          event.preventDefault();
          props.onCommit();
        }
        if (event.key === "Escape") {
          event.preventDefault();
          props.onCancel();
        }
      },
    }),
  Empty: ({ message }) => h("p", message),
};
