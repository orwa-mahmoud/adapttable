/** Structural controls: adapter slots supply every interactive element. */
import type { VNodeChild } from "vue";

import type { Attrs } from "../attrs";
import type { DensityControlProps, FullscreenControlProps } from "./contracts";

export interface ViewControlButtonProps {
  readonly attrs: Attrs;
  readonly label: string;
}
export interface DensityChooserSlots {
  readonly Control: (props: {
    readonly attrs: Attrs;
    readonly value: DensityControlProps["density"];
    readonly options: readonly {
      readonly value: DensityControlProps["density"];
      readonly label: string;
    }[];
    readonly onChange: DensityControlProps["onDensityChange"];
  }) => VNodeChild;
}
function requireControl<T>(slot: T | undefined, name: string): T {
  if (!slot)
    throw new Error(
      `AdaptTable: required adapter control slot "${name}" is missing.`
    );
  return slot;
}
export function DensityChooserChrome(
  props: DensityControlProps & { readonly slots: DensityChooserSlots }
): VNodeChild {
  return requireControl(
    props.slots.Control,
    "DensityChooser.Control"
  )({
    attrs: {
      "data-adapttable-part": "density-select",
      "aria-label": props.labels.density,
      class: props.classNames?.densitySelect,
      dir: props.dir,
    },
    value: props.density,
    options: [
      { value: "comfortable", label: props.labels.densityComfortable },
      { value: "compact", label: props.labels.densityCompact },
    ],
    onChange: props.onDensityChange,
  });
}
export function FullscreenButtonChrome(
  props: FullscreenControlProps & {
    readonly slots: {
      readonly Button: (props: ViewControlButtonProps) => VNodeChild;
    };
  }
): VNodeChild {
  if (!props.fullscreen.supported) return null;
  const label = props.fullscreen.active
    ? props.labels.exitFullscreen
    : props.labels.enterFullscreen;
  return requireControl(
    props.slots.Button,
    "Fullscreen.Button"
  )({
    attrs: {
      type: "button",
      "aria-label": label,
      "aria-pressed": props.fullscreen.active,
      "data-adapttable-part": "fullscreen-button",
      class: props.classNames?.fullscreenButton,
      dir: props.dir,
      onClick: props.fullscreen.toggle,
    },
    label,
  });
}
