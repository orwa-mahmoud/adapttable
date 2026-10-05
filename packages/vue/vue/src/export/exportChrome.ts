import { exportProgressView } from "@adapttable/core";
import type {
  ExportHandlerState,
  ExportProgressChromeProps as NeutralProps,
  ExportProgressSlots as NeutralSlots,
} from "@adapttable/core/binding";
import { h, type VNodeChild } from "vue";

import type { ActionPresentation } from "../actions/contracts";
import type { ActionButtonSlots } from "../actions/simpleChrome";
export type ExportProgressSlots = NeutralSlots<VNodeChild>;
export type ExportProgressChromeProps = NeutralProps<VNodeChild>;
export function ExportProgressChrome(
  props: ExportProgressChromeProps
): VNodeChild {
  if (typeof props.slots.Surface !== "function")
    throw new Error(
      "AdaptTable: ExportProgressChrome requires the Surface control slot."
    );
  if (!props.progress) return null;
  const view = exportProgressView(props.progress, props.labels);
  // The mounted feature supplies table-local focus restoration; core's generic
  // document fallback must not focus a different table's export button.
  return props.slots.Surface({
    ...view,
    dismiss:
      view.dismiss && props.progress.onDismiss
        ? { ...view.dismiss, onAction: props.progress.onDismiss }
        : undefined,
  });
}
export interface ExportSlots extends ActionButtonSlots, ExportProgressSlots {}
export interface ExportChromeProps extends ActionPresentation {
  readonly model: ExportHandlerState;
  readonly slots: ExportSlots;
}
export function ExportChrome(props: ExportChromeProps): VNodeChild {
  if (typeof props.slots.Button !== "function")
    throw new Error(
      "AdaptTable: ExportChrome requires the Button control slot."
    );
  const { model } = props;
  if (!model.onExportCsv) return null;
  return [
    props.slots.Button({
      label: model.exportLabel,
      attrs: {
        type: "button",
        "data-adapttable-part": "export-csv-button",
        class: props.classNames?.exportCsvButton,
        disabled: model.exportDisabled || model.exportBusy,
        title: model.exportDisabledReason || undefined,
        "aria-label": model.exportLabel,
        "aria-busy": model.exportBusy,
        onClick: model.onExportCsv,
      },
    }),
    h(
      "span",
      {
        role: "status",
        "aria-live": "polite",
        "aria-atomic": true,
        "data-adapttable-part": "export-announcer",
        style: {
          position: "absolute",
          width: "1px",
          height: "1px",
          overflow: "hidden",
          clipPath: "inset(50%)",
        },
      },
      model.exportAnnouncement
    ),
    ExportProgressChrome({
      progress: model.exportProgressState,
      labels: props.labels,
      slots: props.slots,
    }),
  ];
}
