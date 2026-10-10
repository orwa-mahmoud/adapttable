import type {
  ExportProgressSurfaceSlotProps,
  ExportSlots,
} from "@adapttable/vue/adapter";
import { Fragment, h } from "vue";
import {
  VCard,
  VCardActions,
  VCardText,
  VCardTitle,
} from "vuetify/components/VCard";
import { VProgressCircular } from "vuetify/components/VProgressCircular";
import { VProgressLinear } from "vuetify/components/VProgressLinear";

import { vuetifyButton } from "../controls";

function progressActions(
  control: ExportProgressSurfaceSlotProps,
  names: Readonly<Record<string, string | undefined>>
) {
  return [
    ...(
      [
        ["cancel", control.cancel],
        ["retry", control.retry],
        ["dismiss", control.dismiss],
      ] as const
    ).map(([key, action]) =>
      action
        ? vuetifyButton(
            {
              key,
              "data-adapttable-part": `export-progress-${key}`,
              class: names.exportProgressButton,
              onClick: action.onAction,
            },
            action.label
          )
        : null
    ),
    control.download
      ? vuetifyButton(
          {
            "data-adapttable-part": "export-progress-download",
            class: names.exportProgressDownload,
            href: control.download.url,
            download: "",
          },
          control.download.label
        )
      : null,
  ];
}

export function vuetifyExportSlots(
  names: Readonly<Record<string, string | undefined>> = {},
  dir: "ltr" | "rtl" = "ltr"
): ExportSlots {
  return {
    Button: ({ attrs, label, icon }) =>
      vuetifyButton(
        { ...attrs, dir },
        h(Fragment, [
          attrs["aria-busy"] === true
            ? h(VProgressCircular, {
                "data-adapttable-part": "export-spinner",
                class: names.exportSpinner,
                indeterminate: true,
                size: 16,
                width: 2,
                "aria-hidden": "true",
              })
            : icon,
          label,
        ])
      ),
    Surface: (control) =>
      h(
        VCard,
        {
          tag: "section",
          "data-adapttable-part": "export-progress-surface",
          class: ["adapttable-vuetify-export", names.exportProgress],
          role: "region",
          "aria-label": control.heading,
          dir,
        },
        () => [
          h(VCardTitle, { tag: "h3" }, () => control.heading),
          h(VCardText, {}, () => [
            control.status === "busy"
              ? h(VProgressLinear, {
                  "data-adapttable-part": "export-progress-bar",
                  class: names.exportProgressBar,
                  modelValue: control.progress ?? 0,
                  indeterminate: control.progress === undefined,
                  "aria-label": control.progressLabel,
                })
              : null,
            control.message
              ? h(
                  "p",
                  {
                    "data-adapttable-part": "export-progress-message",
                    class: names.exportProgressMessage,
                  },
                  control.message
                )
              : null,
            control.error
              ? h(
                  "p",
                  {
                    "data-adapttable-part": "export-progress-message",
                    class: names.exportProgressMessage,
                    role: "alert",
                  },
                  control.error
                )
              : null,
          ]),
          h(
            VCardActions,
            { "data-adapttable-part": "export-progress-actions" },
            () => progressActions(control, names)
          ),
        ]
      ),
  };
}
