/**
 * The table conformance suite — `@adapttable/core/conformance`.
 *
 * The behaviour every binding and every kit must show, asserted against the
 * DOM. It depends on no test runner and no framework: a driver mounts the
 * table, the caller's runner registers the tests.
 *
 * @packageDocumentation
 */
export {
  featureLifecycleConformanceTests,
  type FeatureLifecycleDriver,
  type LifecycleDeclaration,
  type LifecycleHarness,
  type LifecycleObservation,
} from "./conformance/featureLifecycleConformance";
export {
  CONFORMANCE_COLUMNS,
  CONFORMANCE_ROWS,
  type ConformanceColumn,
  type ConformanceDriver,
  type ConformanceExpectation,
  type ConformanceHarness,
  type ConformanceLabels,
  type ConformanceMount,
  type ConformanceRow,
  type ConformanceScenario,
  type ConformanceTest,
  tableConformanceTests,
} from "./conformance/tableConformance";
