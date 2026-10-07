import type {
  ExportProgressSurfaceSlotProps,
  ExportSlots,
} from "@adapttable/vue/adapter";
import {
  QCard,
  QCardActions,
  QCardSection,
  QLinearProgress,
  QSpinner,
} from "quasar";
import { h } from "vue";

import QuasarButton from "../controls/QuasarButton.vue";

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
        ? h(QuasarButton, {
            key,
            attrs: {
              "data-adapttable-part": `export-progress-${key}`,
              class: names.exportProgressButton,
              onClick: action.onAction,
            },
            label: action.label,
          })
        : null
    ),
    control.download
      ? h(QuasarButton, {
          attrs: {
            "data-adapttable-part": "export-progress-download",
            class: names.exportProgressDownload,
            href: control.download.url,
            download: "",
          },
          label: control.download.label,
        })
      : null,
  ];
}

export function quasarExportSlots(
  names: Readonly<Record<string, string | undefined>> = {},
  dir: "ltr" | "rtl" = "ltr"
): ExportSlots {
  return {
    Button: ({ attrs, label, icon }) =>
      h(QuasarButton, { attrs: { ...attrs, dir } }, () => [
        attrs["aria-busy"] === true
          ? h(QSpinner, {
              "data-adapttable-part": "export-spinner",
              class: names.exportSpinner,
              "aria-hidden": "true",
              focusable: "false",
            })
          : icon,
        label,
      ]),
    Surface: (control) =>
      h(
        QCard,
        {
          tag: "section",
          "data-adapttable-part": "export-progress-surface",
          class: ["adapttable-quasar-export", names.exportProgress],
          role: "region",
          "aria-label": control.heading,
          dir,
        },
        () => [
          h(QCardSection, {}, () => h("h3", control.heading)),
          h(QCardSection, {}, () => [
            control.status === "busy"
              ? h(QLinearProgress, {
                  "data-adapttable-part": "export-progress-bar",
                  class: names.exportProgressBar,
                  value: (control.progress ?? 0) / 100,
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
            QCardActions,
            { "data-adapttable-part": "export-progress-actions" },
            () => progressActions(control, names)
          ),
        ]
      ),
  };
}
