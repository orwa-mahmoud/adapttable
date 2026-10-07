import type { ExportSlots } from "@adapttable/vue/adapter";
import { ElLink, ElProgress } from "element-plus";
import { h } from "vue";

import { elementButton } from "../controls/button";
import { ElementCard } from "../presentation/ElementCard";
export const elementExportSlots = (
  names: Readonly<Record<string, string | undefined>> = {}
): ExportSlots => ({
  Button: ({ attrs, label, icon }) =>
    elementButton({ ...attrs, loading: attrs["aria-busy"] === true }, [
      icon,
      label,
    ]),
  Surface: (props) =>
    h(
      ElementCard,
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
            ? h(ElProgress, {
                "data-adapttable-part": "export-progress-bar",
                class: names.exportProgressBar,
                percentage: props.progress ?? 0,
                indeterminate: props.progress === undefined,
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
                ? elementButton(
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
                  ElLink,
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
