import type { ActionButton, ExportSlots } from "@adapttable/vue/adapter";
import { Primitive, ProgressIndicator, ProgressRoot } from "reka-ui";
import { h } from "vue";

import { rekaButton } from "../controls/basic";

export const rekaActionButton = ({ label, attrs, icon }: ActionButton) =>
  rekaButton(attrs, [icon, label]);

export const rekaExportControls = (
  names: Readonly<Record<string, string | undefined>> = {}
): ExportSlots => ({
  Button: ({ attrs, label, icon }) =>
    rekaButton(attrs, [
      attrs["aria-busy"] === true
        ? h("span", {
            "data-adapttable-part": "export-spinner",
            class: ["at-reka-spinner", names.exportSpinner],
            "aria-hidden": true,
          })
        : icon,
      label,
    ]),
  Surface: (control) =>
    h(
      "section",
      {
        "data-adapttable-part": "export-progress-surface",
        class: names.exportProgress,
        role: "region",
        "aria-label": control.heading,
      },
      [
        h("h3", control.heading),
        control.status === "busy"
          ? h(
              ProgressRoot,
              {
                "data-adapttable-part": "export-progress-bar",
                class: ["at-reka-progress", names.exportProgressBar],
                max: 100,
                modelValue: control.progress ?? null,
                "aria-label": control.progressLabel,
              },
              {
                default: () =>
                  h(ProgressIndicator, {
                    class: "at-reka-progress-indicator",
                    style: {
                      inlineSize:
                        control.progress === undefined
                          ? "40%"
                          : `${control.progress}%`,
                    },
                  }),
              }
            )
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
        h("div", { "data-adapttable-part": "export-progress-actions" }, [
          ...(
            [
              ["cancel", control.cancel],
              ["retry", control.retry],
              ["dismiss", control.dismiss],
            ] as const
          ).map(([key, action]) =>
            action
              ? rekaButton(
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
            ? h(
                Primitive,
                {
                  as: "a",
                  "data-adapttable-part": "export-progress-download",
                  class: names.exportProgressDownload,
                  href: control.download.url,
                  download: "",
                },
                { default: () => control.download?.label }
              )
            : null,
        ]),
      ]
    ),
});
