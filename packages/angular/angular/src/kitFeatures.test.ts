import { FILTER_ENGINE_IMPL } from "@adapttable/core";
import { FILTER_ENGINE } from "@adapttable/core/binding";

import { injectExportCsv } from "./export/exportHandler";
import {
  featureImplementation,
  withFeatureImplementation,
} from "./featureHost";
import { FEATURE_IMPLEMENTATIONS } from "./featureImplementations";
import { FIND_IN_TABLE_IMPLEMENTATION } from "./find/findInTableImplementation";
import {
  coreExportCsv,
  coreFilters,
  coreFindInTable,
  coreHeaderFilters,
} from "./kitFeatures";

describe("the code a feature brings", () => {
  it("finds nothing when no composed feature brings the key", () => {
    expect(
      featureImplementation([{ id: "column-menu" }], FILTER_ENGINE)
    ).toBeUndefined();
  });

  it("returns the implementation a later feature brings", () => {
    const replacement = { ...FILTER_ENGINE_IMPL };
    const later = withFeatureImplementation(
      { id: "custom-engine" },
      FILTER_ENGINE,
      replacement
    );
    expect(featureImplementation([coreFilters([]), later], FILTER_ENGINE)).toBe(
      replacement
    );
  });

  it("keeps the implementations a feature already carries", () => {
    const feature = withFeatureImplementation(
      coreFilters([]),
      FEATURE_IMPLEMENTATIONS.exportCsv,
      injectExportCsv
    );
    expect(featureImplementation([feature], FILTER_ENGINE)).toBe(
      FILTER_ENGINE_IMPL
    );
    expect(
      featureImplementation([feature], FEATURE_IMPLEMENTATIONS.exportCsv)
    ).toBe(injectExportCsv);
  });
});

describe("the core factories a kit extends", () => {
  it("bring the filter engine with filters and header filters", () => {
    expect(featureImplementation([coreFilters([])], FILTER_ENGINE)).toBe(
      FILTER_ENGINE_IMPL
    );
    expect(featureImplementation([coreHeaderFilters()], FILTER_ENGINE)).toBe(
      FILTER_ENGINE_IMPL
    );
  });

  it("bring the export with the export option the table reads", () => {
    const feature = coreExportCsv();
    expect(feature.apply?.({})).toMatchObject({ exportCsv: true });
    expect(
      featureImplementation([feature], FEATURE_IMPLEMENTATIONS.exportCsv)
    ).toBe(injectExportCsv);
  });

  it("bring find with the option that opens the bar", () => {
    const feature = coreFindInTable();
    expect(feature.apply?.({})).toMatchObject({ findInTable: true });
    expect(
      featureImplementation([feature], FEATURE_IMPLEMENTATIONS.findInTable)
    ).toBe(FIND_IN_TABLE_IMPLEMENTATION);
  });
});
