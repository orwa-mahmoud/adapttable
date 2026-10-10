import type { ExportSlots } from "@adapttable/vue/adapter";
import { ProgressIndicator, ProgressRoot } from "reka-ui";
import { h } from "vue";

import { Button } from "../components/button";
import { shadcnActionButton } from "./controls";

export const shadcnExportControls = (
  names: Readonly<Record<string, string | undefined>> = {}
): ExportSlots => ({
  Button: ({ attrs, label, icon }) =>
    shadcnActionButton(attrs, [
      attrs["aria-busy"] === true
        ? h("span", {
            "data-adapttable-part": "export-spinner",
            class: [
              "size-4 animate-spin rounded-full border-2 border-current border-t-transparent",
              names.exportSpinner,
            ],
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
        class: [
          "grid gap-3 rounded-lg border bg-card p-4 text-card-foreground",
          names.exportProgress,
        ],
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
                class: [
                  "relative h-2 w-full overflow-hidden rounded-full bg-primary/20",
                  names.exportProgressBar,
                ],
                max: 100,
                modelValue: control.progress ?? null,
                "aria-label": control.progressLabel,
              },
              {
                default: () =>
                  h(ProgressIndicator, {
                    class: "h-full bg-primary transition-all",
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
        h(
          "div",
          {
            class: "flex flex-wrap gap-2",
            "data-adapttable-part": "export-progress-actions",
          },
          [
            ...(
              [
                ["cancel", control.cancel],
                ["retry", control.retry],
                ["dismiss", control.dismiss],
              ] as const
            ).map(([key, action]) =>
              action
                ? shadcnActionButton(
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
                  Button,
                  {
                    as: "a",
                    variant: "outline",
                    "data-adapttable-part": "export-progress-download",
                    class: names.exportProgressDownload,
                    href: control.download.url,
                    download: "",
                  },
                  { default: () => control.download?.label }
                )
              : null,
          ]
        ),
      ]
    ),
});
