import type { ExportSlots } from "@adapttable/vue/adapter";
import { Progress, TypographyLink } from "ant-design-vue";
import { h } from "vue";

import { antdButton } from "../controls/button";
import { antdIcon } from "../controls/icon";
import { AntdCard } from "../presentation/AntdCard";
export const antdExportSlots = (
  names: Readonly<Record<string, string | undefined>> = {}
): ExportSlots => ({
  Button: ({ attrs, label, icon }) =>
    antdButton(attrs, [
      attrs["aria-busy"] === true
        ? antdIcon(
            {
              "aria-hidden": "true",
              "data-adapttable-part": "export-spinner",
              class: ["anticon-spin", names.exportSpinner],
            },
            h(
              "svg",
              {
                viewBox: "0 0 24 24",
                width: "1em",
                height: "1em",
                fill: "none",
                stroke: "currentColor",
                "stroke-width": 2,
              },
              [h("path", { d: "M21 12a9 9 0 1 1-6.22-8.56" })]
            )
          )
        : icon,
      label,
    ]),
  Surface: (props) =>
    h(
      AntdCard,
      {
        attrs: {
          "data-adapttable-part": "export-progress-surface",
          class: names.exportProgress,
          role: "region",
          "aria-label": props.heading,
        },
      },
      {
        default: () => [
          h("h3", props.heading),
          props.status === "busy"
            ? h(Progress, {
                "data-adapttable-part": "export-progress-bar",
                class: names.exportProgressBar,
                percent: props.progress ?? 0,
                status: props.progress === undefined ? "active" : "normal",
                showInfo: props.progress !== undefined,
                "aria-label": props.progressLabel,
              })
            : null,
          props.message
            ? h(
                "p",
                {
                  "data-adapttable-part": "export-progress-message",
                  class: names.exportProgressMessage,
                },
                props.message
              )
            : null,
          props.error
            ? h(
                "p",
                {
                  role: "alert",
                  "data-adapttable-part": "export-progress-message",
                  class: names.exportProgressMessage,
                },
                props.error
              )
            : null,
          h("div", { "data-adapttable-part": "export-progress-actions" }, [
            ...(
              [
                ["cancel", props.cancel],
                ["retry", props.retry],
                ["dismiss", props.dismiss],
              ] as const
            ).map(([key, action]) =>
              action
                ? antdButton(
                    {
                      key,
                      type: "button",
                      "data-adapttable-part": `export-progress-${key}`,
                      class: names.exportProgressButton,
                      onClick: action.onAction,
                    },
                    action.label
                  )
                : null
            ),
            props.download
              ? h(
                  TypographyLink,
                  {
                    "data-adapttable-part": "export-progress-download",
                    class: names.exportProgressDownload,
                    href: props.download.url,
                    download: "",
                  },
                  { default: () => props.download?.label }
                )
              : null,
          ]),
        ],
      }
    ),
});
