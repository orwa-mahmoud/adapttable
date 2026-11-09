/**
 * The evaluator a composed grouping feature publishes for the plain-table source.
 *
 * Absent, the source uses the basic evaluator. The key lives next to the
 * feature that owns the full model, and the shell only reads it.
 */
import type { FrontendEngineFactory } from "@adapttable/core";
import { featureStateKey } from "@adapttable/core/binding";

export const FRONTEND_ROW_MODEL =
  featureStateKey<FrontendEngineFactory<unknown>>("frontend-row-model");
