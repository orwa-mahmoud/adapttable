/**
 * Filter widgets in Angular: a filters feature publishes the widgets it was
 * composed with, and the form draws each field with the one for its kind.
 */
import {
  defaultFilterRegistry,
  type FilterDef,
  type FilterTypeRegistry,
  type FilterTypeSpec,
} from "@adapttable/core";
import { defaultLabels, withFilterType } from "@adapttable/core/binding";
import { Component, inject, Injector, input, viewChild } from "@angular/core";
import { TestBed } from "@angular/core/testing";

import { injectDataTable } from "../dataTable";
import { type AdaptTableFeature, tableFeaturesOf } from "../featureHost";
import { mountTableFeatures } from "../featureLifecycle";
import { ADAPTTABLE_FEATURE_STATE, createFeatureState } from "../featureState";
import { tableRuntimeFor } from "../layout/tableRuntime";
import { injectLocalFrontendData } from "../source/localFrontendData";
import {
  AdaptFilterWidgetFormModel,
  type FilterWidget,
  withFilterWidgets,
} from "./filterWidgets";

@Component({ selector: "adapt-text-widget", template: "" })
class TextWidget {}

@Component({ selector: "adapt-widget-form", template: "" })
class WidgetForm extends AdaptFilterWidgetFormModel<unknown> {
  readonly fieldList = this.widgetFields;
}

const text: FilterWidget = { kinds: ["text"], render: TextWidget };

@Component({
  imports: [WidgetForm],
  providers: [
    { provide: ADAPTTABLE_FEATURE_STATE, useFactory: createFeatureState },
  ],
  template: `<adapt-widget-form
    [defs]="defs()"
    [source]="source()"
    [labels]="labels"
    [registry]="registry()"
  />`,
})
class Host {
  readonly defs = input.required<readonly FilterDef<unknown>[]>();
  readonly registry = input<FilterTypeRegistry>(defaultFilterRegistry);
  readonly features = input<readonly AdaptTableFeature[]>([]);
  readonly labels = defaultLabels;
  readonly form = viewChild.required(WidgetForm);
  readonly state = inject(ADAPTTABLE_FEATURE_STATE);
  readonly source = injectLocalFrontendData<unknown>({ data: [] });
  private readonly injector = inject(Injector);
  private readonly table = injectDataTable<unknown>({
    source: this.source,
    columns: [],
    rowKey: () => "row",
  });

  mount(): () => void {
    const features = tableFeaturesOf(this.injector, this.features());
    return mountTableFeatures(features, {
      runtime: tableRuntimeFor(this.table, this.source, features),
      state: this.state,
      injector: this.injector,
    });
  }
}

function host(
  defs: readonly FilterDef<unknown>[],
  features: readonly AdaptTableFeature[],
  registry = defaultFilterRegistry
) {
  const fixture = TestBed.createComponent(Host);
  fixture.componentRef.setInput("defs", defs);
  fixture.componentRef.setInput("features", features);
  fixture.componentRef.setInput("registry", registry);
  fixture.detectChanges();
  const dispose = fixture.componentInstance.mount();
  return { fixture, dispose, form: fixture.componentInstance.form() };
}

describe("filter widgets", () => {
  it("publishes its widgets while mounted and keeps the feature's own mount", () => {
    const release = vi.fn();
    const own = vi.fn(() => release);
    const { form, dispose } = host(
      [{ key: "name", type: "text" }],
      [withFilterWidgets({ id: "filters", mount: own }, [text])]
    );
    expect(own).toHaveBeenCalledOnce();
    expect(form.fieldList()[0]?.widget).toBe(TextWidget);
    dispose();
    expect(release).toHaveBeenCalledOnce();
    expect(() => form.fieldList()).toThrow("draws inside a filters feature");
  });

  it("hands the widget its definition, source and labels", () => {
    const { fixture, form } = host(
      [{ key: "name", type: "text" }],
      [withFilterWidgets({ id: "filters" }, [text])]
    );
    expect(form.fieldList()[0]?.inputs).toEqual({
      def: { key: "name", type: "text" },
      source: fixture.componentInstance.source(),
      labels: defaultLabels,
    });
  });

  it("leaves a registered render to the type", () => {
    const custom: FilterTypeSpec = {
      ...defaultFilterRegistry.get("text")!,
      type: "custom",
      render: () => "Custom",
    };
    const { form } = host(
      [{ key: "name", type: "custom" }],
      [withFilterWidgets({ id: "filters" }, [])],
      withFilterType(defaultFilterRegistry, custom)
    );
    expect(form.fieldList()[0]?.text).toBe("Custom");
    expect(form.fieldList()[0]?.widget).toBeUndefined();
  });

  it("names the widget a composed form lacks", () => {
    const { form } = host(
      [{ key: "status", type: "select" }],
      [withFilterWidgets({ id: "filters" }, [text])]
    );
    expect(() => form.fieldList()).toThrow('draws the "select" widget');
  });
});
