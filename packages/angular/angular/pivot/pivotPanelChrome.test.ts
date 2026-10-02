/**
 * The pivot panel's structure and keyboard path, against a minimal slot set.
 *
 * The slots here are plain HTML on purpose: what is being tested is which
 * zones exist, which move buttons are offered, and what each button does to
 * the configuration.
 */
import {
  EMPTY_PIVOT_CONFIG,
  type PivotConfig,
  type PivotField,
} from "@adapttable/core";
import { NgTemplateOutlet } from "@angular/common";
import { Component, input, type TemplateRef } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { describe, expect, it } from "vitest";

import {
  AdaptPivotPanelChrome,
  type PivotPanelSlots,
} from "./pivotPanelChrome";

const FIELDS: PivotField[] = [
  { key: "region", label: "Region" },
  { key: "team", label: "Team" },
  { key: "amount", label: "Amount" },
];

@Component({
  selector: "adapt-stub-surface",
  imports: [NgTemplateOutlet],
  template: `<div [class]="props().className">
    @if (props().children; as children) {
      <ng-container [ngTemplateOutlet]="children" />
    }
  </div>`,
})
class StubSurface {
  readonly props = input.required<{
    className?: string;
    children?: TemplateRef<unknown>;
  }>();
}

@Component({
  selector: "adapt-stub-zone",
  imports: [NgTemplateOutlet],
  template: `<section [attr.aria-label]="props().label">
    @if (props().children; as children) {
      <ng-container [ngTemplateOutlet]="children" />
    }
  </section>`,
})
class StubZone {
  readonly props = input.required<{
    label: string;
    children?: TemplateRef<unknown>;
  }>();
}

@Component({
  selector: "adapt-stub-field",
  imports: [NgTemplateOutlet],
  template: `<div [attr.data-field]="props().label">
    <span>{{ props().label }}</span>
    @if (props().aggregation; as aggregation) {
      <ng-container [ngTemplateOutlet]="aggregation" />
    }
    @if (props().onMoveUp) {
      <button type="button" (click)="props().onMoveUp!()">
        {{ props().moveUpLabel }} {{ props().label }}
      </button>
    }
    @if (props().onMoveDown) {
      <button type="button" (click)="props().onMoveDown!()">
        {{ props().moveDownLabel }} {{ props().label }}
      </button>
    }
    <button type="button" (click)="props().onRemove()">
      {{ props().removeLabel }} {{ props().label }}
    </button>
  </div>`,
})
class StubField {
  readonly props = input.required<{
    label: string;
    moveUpLabel: string;
    moveDownLabel: string;
    removeLabel: string;
    onMoveUp?: () => void;
    onMoveDown?: () => void;
    onRemove: () => void;
    aggregation?: TemplateRef<unknown>;
  }>();
}

@Component({
  selector: "adapt-stub-add",
  template: `<select
    [attr.aria-label]="props().label"
    [disabled]="props().options.length === 0"
    (change)="add($event)"
  >
    <option value=""></option>
    @for (option of props().options; track option.key) {
      <option [value]="option.key">{{ option.label }}</option>
    }
  </select>`,
})
class StubAdd {
  readonly props = input.required<{
    label: string;
    options: readonly PivotField[];
    onAdd: (key: string) => void;
  }>();

  protected add(event: Event): void {
    const key = (event.target as HTMLSelectElement).value;
    if (key) this.props().onAdd(key);
  }
}

@Component({
  selector: "adapt-stub-agg",
  template: `<select
    [attr.aria-label]="props().label"
    (change)="changed($event)"
  >
    @for (option of props().options; track option) {
      <option [value]="option">{{ option }}</option>
    }
  </select>`,
})
class StubAgg {
  readonly props = input.required<{
    label: string;
    value: string;
    options: readonly string[];
    onChange: (next: string) => void;
  }>();

  protected changed(event: Event): void {
    this.props().onChange((event.target as HTMLSelectElement).value);
  }
}

const slots: PivotPanelSlots = {
  Surface: StubSurface,
  Zone: StubZone,
  Field: StubField,
  Add: StubAdd,
  Agg: StubAgg,
};

@Component({
  imports: [AdaptPivotPanelChrome],
  template: `<adapt-pivot-panel-chrome
    [fields]="fields"
    [config]="config"
    [onChange]="change"
    [labels]="labels"
    [className]="className"
    [slots]="slots"
  />`,
})
class Host {
  config: PivotConfig = { ...EMPTY_PIVOT_CONFIG };
  readonly fields = FIELDS;
  readonly labels = { pivotRows: "Rijen" };
  readonly className = "panel";
  readonly slots = slots;
  readonly change = (next: PivotConfig) => {
    this.config = next;
  };
}

function setup() {
  TestBed.configureTestingModule({ imports: [Host] });
  const fixture = TestBed.createComponent(Host);
  fixture.detectChanges();
  return fixture;
}

function selectZone(fixture: ReturnType<typeof setup>, name: string) {
  return [...fixture.nativeElement.querySelectorAll("select")].find(
    (node) => (node as HTMLSelectElement).getAttribute("aria-label") === name
  ) as HTMLSelectElement;
}

function choose(select: HTMLSelectElement, value: string) {
  select.value = value;
  select.dispatchEvent(new Event("change"));
}

describe("AdaptPivotPanelChrome", () => {
  it("lays out the three zones and adds, moves and removes fields", () => {
    const fixture = setup();
    const host = fixture.componentInstance;
    const root = fixture.nativeElement as HTMLElement;

    expect(root.querySelector("div")?.className).toBe("panel");
    expect(
      [...root.querySelectorAll("section")].map((section) =>
        section.getAttribute("aria-label")
      )
    ).toEqual(["Rijen", "Columns", "Measures"]);

    const adds = () =>
      [...root.querySelectorAll("select")].filter(
        (node) => node.getAttribute("aria-label") === "Add field"
      );

    choose(adds()[0]!, "region");
    fixture.detectChanges();
    choose(adds()[0]!, "team");
    fixture.detectChanges();
    expect(host.config.rows).toEqual(["region", "team"]);

    const button = (label: string) =>
      [...root.querySelectorAll("button")].find((node) =>
        node.textContent?.includes(label)
      )!;

    button("Move down Region").click();
    fixture.detectChanges();
    expect(host.config.rows).toEqual(["team", "region"]);

    button("Move up Region").click();
    fixture.detectChanges();
    expect(host.config.rows).toEqual(["region", "team"]);

    button("Remove field Region").click();
    fixture.detectChanges();
    expect(host.config.rows).toEqual(["team"]);

    choose(adds().at(-1)!, "amount");
    fixture.detectChanges();
    expect(host.config.measures).toEqual([{ key: "amount", agg: "sum" }]);

    choose(selectZone(fixture, "Aggregation"), "count");
    fixture.detectChanges();
    expect(host.config.measures).toEqual([{ key: "amount", agg: "count" }]);
  });
});
