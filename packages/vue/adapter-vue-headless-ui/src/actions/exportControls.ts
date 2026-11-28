import type { ActionButton, ExportSlots } from "@adapttable/vue/adapter";
import { h } from "vue";

import { headlessButton } from "../controls/basic";
import { HeadlessPrimitive } from "../controls/primitive";

export const headlessActionButton = ({ label, attrs, icon }: ActionButton) =>
  headlessButton(attrs, [icon, label]);

export const headlessExportControls = (
  names: Readonly<Record<string, string | undefined>> = {}
): ExportSlots => ({
  Button: ({ attrs, label, icon }) =>
    headlessButton(attrs, [
      attrs["aria-busy"] === true
        ? h("span", {
            "data-adapttable-part": "export-spinner",
            class: ["at-headless-spinner", names.exportSpinner],
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
              HeadlessPrimitive,
              {
                as: "div",
                role: "progressbar",
                "data-adapttable-part": "export-progress-bar",
                class: ["at-headless-progress", names.exportProgressBar],
                "aria-valuemin": 0,
                "aria-valuemax": 100,
                "aria-valuenow": control.progress,
                "aria-label": control.progressLabel,
                "data-state":
                  control.progress === undefined ? "indeterminate" : "loading",
              },
              {
                default: () =>
                  h("div", {
                    class: "at-headless-progress-indicator",
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
              ? headlessButton(
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
                HeadlessPrimitive,
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
