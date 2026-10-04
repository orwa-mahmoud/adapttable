/** Native control contract fixture, shared by DOM and browser conformance. */
import { slotRender } from "@adapttable/core/binding";
import { defineComponent, h, type MaybeRefOrGetter } from "vue";

import { elementRef } from "../../src/attrs";
import { densityChooser } from "../../src/features/density";
import { fullscreen } from "../../src/features/fullscreen";
import { savedViews } from "../../src/features/savedViews";
import { extendFeature } from "../../src/features/tableFeature";
import {
  SavedViewsMenuChrome,
  type SavedViewsMenuSlots,
} from "../../src/url/SavedViewsMenuChrome";
import type { SavedViewsPanelSlots } from "../../src/url/SavedViewsPanelChrome";
import type { UseSavedViewsOptions } from "../../src/url/useSavedViews";
import {
  useDataTableShell,
  type UseDataTableShellOptions,
} from "../../src/useDataTableShell";
import {
  DENSITY_CONTROL,
  FULLSCREEN_CONTROL,
  SAVED_VIEWS_CONTROL,
} from "../../src/viewControls/contracts";
import {
  DensityChooserChrome,
  FullscreenButtonChrome,
  type ViewControlButtonProps,
} from "../../src/viewControls/viewControlsChrome";
const button = ({ attrs, label }: ViewControlButtonProps) =>
  h("button", attrs, label);
export const nativeMenuSlots: SavedViewsMenuSlots = {
  Trigger: button,
  Button: button,
  Input: ({ attrs, value, onChange }) =>
    h("input", {
      ...attrs,
      value,
      onInput: (event: Event) => {
        if (event.target instanceof HTMLInputElement)
          onChange(event.target.value);
      },
    }),
  Panel: ({ attrs, content }) => h("div", attrs, [content]),
};
export const nativePanelSlots: SavedViewsPanelSlots = {
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
      onInput: (event: Event) => {
        if (event.target instanceof HTMLInputElement)
          props.onChange(event.target.value);
      },
      onKeydown: (event: KeyboardEvent) => {
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
  Empty: (props) => h("p", props.message),
};
export function nativeDensity() {
  return extendFeature(densityChooser(), [
    slotRender(DENSITY_CONTROL, (props) =>
      DensityChooserChrome({
        ...props,
        slots: {
          Control: (control) =>
            h(
              "select",
              {
                ...control.attrs,
                value: control.value,
                onChange: (event: Event) => {
                  if (
                    event.target instanceof HTMLSelectElement &&
                    (event.target.value === "comfortable" ||
                      event.target.value === "compact")
                  )
                    control.onChange(event.target.value);
                },
              },
              control.options.map((option) =>
                h("option", { value: option.value }, option.label)
              )
            ),
        },
      })
    ),
  ]);
}
export function nativeFullscreen() {
  return extendFeature(fullscreen(), [
    slotRender(FULLSCREEN_CONTROL, (props) =>
      FullscreenButtonChrome({ ...props, slots: { Button: button } })
    ),
  ]);
}
export function nativeSavedViews(
  options: MaybeRefOrGetter<UseSavedViewsOptions>
) {
  return extendFeature(savedViews(options), [
    slotRender(SAVED_VIEWS_CONTROL, (props) =>
      h(SavedViewsMenuChrome, { ...props, slots: nativeMenuSlots })
    ),
  ]);
}
export interface FixtureRow {
  readonly id: string;
  readonly name: string;
}
export const ViewControlsFixture = defineComponent(
  (props: {
    readonly options?: Partial<UseDataTableShellOptions<FixtureRow>>;
  }) => {
    const shell = useDataTableShell<FixtureRow>(() => ({
      data: [{ id: "a", name: "Ada" }],
      columns: [{ key: "name" }],
      rowKey: (row) => row.id,
      urlSync: false,
      features: [
        nativeDensity(),
        nativeFullscreen(),
        nativeSavedViews({ storageKey: "fixture", storage: null }),
      ],
      ...props.options,
    }));
    const rootRef = elementRef<HTMLElement>((value) =>
      shell.setSurface(
        value ? { rootElement: () => value, scrollElement: () => value } : null
      )
    );
    return () =>
      h(
        "section",
        {
          dir: shell.table.dir.value,
          "data-adapttable-part": "root",
          "data-density": shell.density.value,
          ref: rootRef,
        },
        [
          h(
            "div",
            { "data-adapttable-part": "toolbar" },
            shell.renderToolbarExtras()
          ),
          h("output", { "data-testid": "density" }, shell.density.value),
        ]
      );
  },
  { name: "ViewControlsFixture", props: ["options"] }
);
