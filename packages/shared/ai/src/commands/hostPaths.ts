/** `views.apply` and `export.run`: commands that hand over to a host path. */
import {
  assertApply,
  hasFeature,
  type TableCommand,
  viewMoved,
} from "./command";
import { ID, objectSchema, OK_OUTPUT } from "./schema";

export const applyViewCommand: TableCommand<"views.apply"> = {
  key: "views.apply",
  summary: "Apply a saved view.",
  guide: "Apply a saved view by id through the host saved-views path.",
  input: objectSchema({ viewId: ID }, ["viewId"]),
  output: OK_OUTPUT,
  kind: "view",
  staging: "unsupported",
  partial: "unsupported",
  idempotent: true,
  isEnabled: (observation) =>
    hasFeature(observation, "saved-views") &&
    observation.hasSavedViews === true,
  apply: ({ context: { apply, observation }, body }) => {
    assertApply(apply, "applyView");
    apply.applyView(String(body.viewId));
    return viewMoved(observation);
  },
};

/** Every run emits another file, so a repeat is never a no-op. */
export const runExportCommand: TableCommand<"export.run"> = {
  key: "export.run",
  summary: "Export through the host export path.",
  guide: "Start an export through the host's existing export path.",
  input: objectSchema({ format: ID }, ["format"]),
  output: objectSchema({
    ok: { type: "boolean" },
    revision: { type: "integer", minimum: 1 },
  }),
  kind: "view",
  staging: "unsupported",
  partial: "unsupported",
  idempotent: false,
  isEnabled: (observation) =>
    hasFeature(observation, "export-csv") && observation.hasExport,
  apply: ({ context: { apply }, body }) => {
    assertApply(apply, "runExport");
    return apply.runExport(String(body.format));
  },
};
