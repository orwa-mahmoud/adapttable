import type { Attrs } from "@adapttable/vue";
import type { ActionButton, ExportSlots } from "@adapttable/vue/adapter";
import { NCard, NProgress, NSpin, NText } from "naive-ui";
import { h } from "vue";

import { naiveButton } from "../controls/button";

type Names = Readonly<Record<string, string | undefined>>;
type Progress = Parameters<ExportSlots["Surface"]>[0];
export const naiveActionButton = ({ label, attrs, icon }: ActionButton) =>
  naiveButton(attrs, [icon, label]);

function progress(control: Progress, names: Names) {
  if (control.status !== "busy") return null;
  const attrs = {
    "data-adapttable-part": "export-progress-bar",
    class: names.exportProgressBar,
    "aria-label": control.progressLabel,
  };
  return control.progress === undefined
    ? h(NSpin, { ...attrs, size: "small", role: "progressbar" })
    : h(NProgress, { ...attrs, type: "line", percentage: control.progress });
}
function message(attrs: Attrs, text: string) {
  return h(NText, attrs, { default: () => text });
}
function actions(control: Progress, names: Names) {
  return h("div", { "data-adapttable-part": "export-progress-actions" }, [
    ...(
      [
        ["cancel", control.cancel],
        ["retry", control.retry],
        ["dismiss", control.dismiss],
      ] as const
    ).map(([key, action]) =>
      action
        ? naiveButton(
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
      ? naiveButton(
          {
            "data-adapttable-part": "export-progress-download",
            class: names.exportProgressDownload,
            href: control.download.url,
            download: "",
          },
          control.download.label,
          { tag: "a" }
        )
      : null,
  ]);
}
export const naiveExportSlots = (names: Names = {}): ExportSlots => ({
  Button: ({ attrs, label, icon }) =>
    naiveButton(attrs, [
      attrs["aria-busy"] === true
        ? h(NSpin, {
            size: 16,
            "data-adapttable-part": "export-spinner",
            class: names.exportSpinner,
            "aria-hidden": true,
          })
        : icon,
      label,
    ]),
  Surface: (control) =>
    h(
      NCard,
      {
        size: "small",
        "data-adapttable-part": "export-progress-surface",
        class: names.exportProgress,
        role: "region",
        "aria-label": control.heading,
        title: control.heading,
      },
      {
        default: () => [
          progress(control, names),
          control.message
            ? message(
                {
                  "data-adapttable-part": "export-progress-message",
                  class: names.exportProgressMessage,
                },
                control.message
              )
            : null,
          control.error
            ? message(
                {
                  role: "alert",
                  type: "error",
                  "data-adapttable-part": "export-progress-message",
                  class: names.exportProgressMessage,
                },
                control.error
              )
            : null,
          actions(control, names),
        ],
      }
    ),
});
