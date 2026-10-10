import { ExportProgressChrome, resolveLabels } from "@adapttable/vue/adapter";
import { expect, it, vi } from "vitest";
import { h, nextTick } from "vue";

import { elementExportSlots } from "../src/actions/elementExportSlots";
import { mount, node } from "./mount";

it("renders indeterminate native progress while the export size is unknown", () => {
  const { root } = mount(() =>
    h(ExportProgressChrome, {
      progress: {
        status: "busy",
        value: undefined,
        message: "Preparing rows",
        error: "",
        downloadUrl: undefined,
        onCancel: vi.fn(),
        onRetry: undefined,
        onDismiss: undefined,
      },
      labels: resolveLabels(undefined),
      slots: elementExportSlots(),
    })
  );
  const progress = node(root, '[data-adapttable-part="export-progress-bar"]');
  expect(progress.classList.contains("el-progress")).toBe(true);
  expect(
    progress.querySelector(".el-progress-bar__inner--indeterminate")
  ).not.toBeNull();
  expect(
    node(root, '[data-adapttable-part="export-progress-message"]').textContent
  ).toBe("Preparing rows");
});

it("offers a native download link on successful export and forwards dismissal", async () => {
  const dismiss = vi.fn();
  const { root } = mount(() =>
    h(ExportProgressChrome, {
      progress: {
        status: "done",
        value: 100,
        message: "Ready",
        error: "",
        downloadUrl: "blob:https://example.test/export",
        onCancel: undefined,
        onRetry: undefined,
        onDismiss: dismiss,
      },
      labels: resolveLabels(undefined),
      slots: elementExportSlots({ exportProgressDownload: "host-download" }),
    })
  );
  await nextTick();
  const link = node<HTMLAnchorElement>(
    root,
    'a[data-adapttable-part="export-progress-download"]'
  );
  expect(link.classList.contains("el-link")).toBe(true);
  expect(link.classList.contains("host-download")).toBe(true);
  expect(link.getAttribute("href")).toBe("blob:https://example.test/export");
  expect(link.hasAttribute("download")).toBe(true);
  expect(link.textContent?.trim()).toBeTruthy();
  expect(
    root.querySelector('[data-adapttable-part="export-progress-bar"]')
  ).toBeNull();
  node<HTMLButtonElement>(
    root,
    '[data-adapttable-part="export-progress-dismiss"]'
  ).click();
  expect(dismiss).toHaveBeenCalledTimes(1);
});
