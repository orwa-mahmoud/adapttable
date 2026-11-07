/**
 * The evaluator a composed grouping feature carries for the plain-table source.
 *
 * The shell reads it off the feature object. The feature module is the one
 * that imports the full evaluator, so a table that never composes grouping
 * does not.
 */
import type { FrontendEngineFactory } from "./frontendSource";

const FRONTEND_ROW_MODEL = "frontendRowModel";

/** Attach the evaluator `feature` needs. Spread by the binding's feature composer. */
export function withFrontendRowModel<T extends object>(
  feature: T,
  createEngine: FrontendEngineFactory<unknown>
): T {
  return { ...feature, [FRONTEND_ROW_MODEL]: createEngine };
}

function isEngineFactory(
  value: unknown
): value is FrontendEngineFactory<unknown> {
  return typeof value === "function";
}

function carriedFactory(feature: object): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(
    feature,
    FRONTEND_ROW_MODEL
  );
  return descriptor?.value;
}

/**
 * The evaluator the composed features require, later features winning.
 * Absent when none of them groups.
 */
export function frontendRowModelOf(
  features: readonly object[]
): FrontendEngineFactory<unknown> | undefined {
  let factory: FrontendEngineFactory<unknown> | undefined;
  for (const feature of features) {
    const candidate = carriedFactory(feature);
    if (isEngineFactory(candidate)) factory = candidate;
  }
  return factory;
}
