import type { TableLabels } from "@adapttable/angular";
import {
  CDK_CONNECTED_OVERLAY_DEFAULT_CONFIG,
  CdkConnectedOverlay,
  OverlayContainer,
} from "@angular/cdk/overlay";
import { Component, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { MatCheckbox } from "@angular/material/checkbox";
import { By } from "@angular/platform-browser";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AdaptMaterialDialog } from "./components/materialDialog";
import { AdaptMaterialPopover } from "./components/materialPopover";
import { AdaptSelectionCheckbox } from "./components/selectionCheckbox";
import { AdaptDataTable } from "./dataTable";

@Component({
  imports: [AdaptDataTable],
  template: `<adapt-data-table
    [data]="rows"
    [columns]="columns"
    [rowKey]="rowKey"
    [urlSync]="false"
    [forceMobile]="mobile()"
    [labels]="labels()"
    [selectable]="true"
    tableLabel="People"
  />`,
})
class TableHost {
  readonly mobile = signal(false);
  readonly labels = signal<TableLabels>({});
  readonly rows = [{ id: "ada", name: "Ada" }];
  readonly columns = [
    {
      key: "name",
      header: "Name",
      accessor: (row: { name: string }) => row.name,
      sortable: true,
    },
  ];
  readonly rowKey = (row: { id: string }) => row.id;
}

@Component({
  imports: [AdaptMaterialPopover],
  template: `<button #trigger type="button" (click)="open.set(true)">
      Filters
    </button>
    <adapt-material-popover
      [origin]="trigger"
      [open]="open()"
      [belowOnly]="belowOnly()"
      [filterSurface]="filterSurface()"
      dir="rtl"
      (dismiss)="close()"
    >
      <button type="button" class="inside">Inside</button>
    </adapt-material-popover>`,
})
class PopoverHost {
  readonly belowOnly = signal(false);
  readonly filterSurface = signal(false);
  readonly open = signal(false);
  readonly close = vi.fn(() => this.open.set(false));
}

@Component({
  imports: [AdaptMaterialDialog],
  template: `<button type="button" (click)="open.set(true)">Open</button>
    <adapt-material-dialog
      [open]="open()"
      label="Filters"
      [sheet]="true"
      backdropClassName="adapt-material-filters-backdrop"
      (dismiss)="open.set(false)"
    >
      <button type="button">Done</button>
    </adapt-material-dialog>`,
})
class DialogHost {
  readonly open = signal(false);
}

afterEach(() => {
  TestBed.resetTestingModule();
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
});

describe("Material control ownership", () => {
  it("renders Material controls while retaining the semantic table and native checkbox parts", async () => {
    const fixture = TestBed.createComponent(TableHost);
    document.body.append(fixture.nativeElement);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const table = document.querySelector('[data-adapttable-part="table"]');
    expect(table?.tagName).toBe("TABLE");
    expect(
      document
        .querySelector('[data-adapttable-part="search"]')
        ?.classList.contains("mat-mdc-input-element")
    ).toBe(true);
    expect(
      document
        .querySelector(".adapt-material-page-next")
        ?.classList.contains("mat-mdc-button")
    ).toBe(true);
    const checkbox = document.querySelector<HTMLInputElement>(
      ".adapt-material-checkbox"
    )!;
    expect(checkbox.tagName).toBe("INPUT");
    expect(checkbox.closest("mat-checkbox")).not.toBeNull();
    checkbox.click();
    await fixture.whenStable();
    expect(checkbox.checked).toBe(true);
  });
  for (const mobile of [false, true]) {
    it(`keeps localized selection names on ${mobile ? "mobile" : "desktop"} native inputs`, async () => {
      const fixture = TestBed.createComponent(TableHost);
      fixture.componentInstance.mobile.set(mobile);
      fixture.autoDetectChanges();
      await fixture.whenStable();
      const inputs = () => [
        ...(
          fixture.nativeElement as HTMLElement
        ).querySelectorAll<HTMLInputElement>(".adapt-material-checkbox"),
      ];
      const names = () =>
        inputs().map((input) => input.getAttribute("aria-label"));
      expect(names()).toEqual(
        mobile ? ["Select row"] : ["Select all", "Select row"]
      );
      fixture.componentInstance.labels.set({
        selectAll: "Tout sélectionner",
        selectRow: "Sélectionner la ligne",
      });
      await fixture.whenStable();
      expect(names()).toEqual(
        mobile
          ? ["Sélectionner la ligne"]
          : ["Tout sélectionner", "Sélectionner la ligne"]
      );
      inputs().at(-1)!.click();
      await fixture.whenStable();
      expect(inputs().at(-1)!.checked).toBe(true);
      expect(names()).toEqual(
        mobile
          ? ["Sélectionner la ligne"]
          : ["Tout sélectionner", "Sélectionner la ligne"]
      );
      fixture.componentInstance.labels.set({});
      await fixture.whenStable();
      expect(names()).toEqual(
        mobile ? ["Select row"] : ["Select all", "Select row"]
      );
    });
  }

  it("lets Material retain, clear and reapply the native input's accessible name and description", async () => {
    const fixture = TestBed.createComponent(AdaptSelectionCheckbox);
    const change = vi.fn();
    const keydown = vi.fn();
    const attrs = {
      checked: false,
      "aria-label": "Select row",
      "aria-labelledby": "row-name",
      "aria-describedby": "selection-help",
      "data-adapttable-part": "group-select",
      onChange: change,
      onKeyDown: keydown,
    };
    fixture.componentRef.setInput("attrs", attrs);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const material = fixture.debugElement.query(By.directive(MatCheckbox))
      .componentInstance as MatCheckbox;
    const input = (
      fixture.nativeElement as HTMLElement
    ).querySelector<HTMLInputElement>("input")!;
    const expectNaming = (
      label: string | null,
      labelledby: string | null,
      description: string | null
    ) => {
      expect(material.ariaLabel).toBe(label ?? "");
      expect(material.ariaLabelledby).toBe(labelledby);
      expect(material.ariaDescribedby).toBe(description ?? "");
      expect(input.getAttribute("aria-label")).toBe(label);
      expect(input.getAttribute("aria-labelledby")).toBe(labelledby);
      expect(input.getAttribute("aria-describedby")).toBe(description ?? "");
      expect(input.getAttribute("data-adapttable-part")).toBe("group-select");
    };
    expectNaming("Select row", "row-name", "selection-help");
    input.click();
    await fixture.whenStable();
    expect(change).toHaveBeenCalledTimes(1);
    expect(input.checked).toBe(true);
    expectNaming("Select row", "row-name", "selection-help");
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown" }));
    expect(keydown).toHaveBeenCalledTimes(1);

    fixture.componentRef.setInput("attrs", {
      checked: true,
      disabled: true,
      "data-adapttable-part": "group-select",
      onChange: change,
    });
    await fixture.whenStable();
    expectNaming(null, null, null);
    expect(input.disabled).toBe(true);
    input.click();
    expect(change).toHaveBeenCalledTimes(1);

    fixture.componentRef.setInput("attrs", {
      ...attrs,
      "aria-label": "Sélectionner la ligne",
      "aria-labelledby": "translated-row-name",
      "aria-describedby": "translated-selection-help",
    });
    await fixture.whenStable();
    expect(input.disabled).toBe(false);
    expectNaming(
      "Sélectionner la ligne",
      "translated-row-name",
      "translated-selection-help"
    );
    input.click();
    await fixture.whenStable();
    expect(change).toHaveBeenCalledTimes(2);
    expect(input.checked).toBe(true);
    expectNaming(
      "Sélectionner la ligne",
      "translated-row-name",
      "translated-selection-help"
    );
  });

  it("preserves mixed state, refs, class hooks and one toggle per Material event", async () => {
    const fixture = TestBed.createComponent(AdaptSelectionCheckbox);
    const change = vi.fn();
    const ref = vi.fn();
    fixture.componentRef.setInput("attrs", {
      checked: false,
      indeterminate: true,
      "aria-label": "Select all",
      onChange: change,
      ref,
    });
    fixture.componentRef.setInput("part", "checkbox");
    fixture.componentRef.setInput("className", "custom-checkbox");
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const input = (
      fixture.nativeElement as HTMLElement
    ).querySelector<HTMLInputElement>("input")!;
    const material = fixture.debugElement.query(By.directive(MatCheckbox))
      .componentInstance as MatCheckbox;
    expect(material.ariaLabel).toBe("Select all");
    expect(input.indeterminate).toBe(true);
    expect(input.getAttribute("aria-label")).toBe("Select all");
    expect(input.classList.contains("custom-checkbox")).toBe(true);
    expect(ref).toHaveBeenCalledWith(input);
    input.click();
    await fixture.whenStable();
    expect(change).toHaveBeenCalledTimes(1);
    fixture.componentRef.setInput("attrs", {
      checked: true,
      disabled: true,
      onChange: change,
    });
    await fixture.whenStable();
    input.click();
    expect(change).toHaveBeenCalledTimes(1);
    expect(input.disabled).toBe(true);
  });
});

describe("Material overlay ownership", () => {
  it("uses a backdrop-free CDK card, keeps inside interactions open and restores the opener on Escape", async () => {
    const fixture = TestBed.createComponent(PopoverHost);
    document.body.append(fixture.nativeElement);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const trigger = (
      fixture.nativeElement as HTMLElement
    ).querySelector<HTMLButtonElement>("button")!;
    trigger.click();
    await fixture.whenStable();
    expect(document.querySelector(".cdk-overlay-backdrop")).toBeNull();
    const card = document.querySelector<HTMLElement>(
      ".cdk-overlay-pane mat-card"
    )!;
    expect(card).not.toBeNull();
    expect(card.dir).toBe("rtl");
    card.querySelector<HTMLButtonElement>("button")!.click();
    await fixture.whenStable();
    expect(fixture.componentInstance.open()).toBe(true);
    card.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Escape",
        bubbles: true,
        cancelable: true,
      })
    );
    await fixture.whenStable();
    expect(fixture.componentInstance.open()).toBe(false);
    expect(document.activeElement).toBe(trigger);
    expect(fixture.componentInstance.close).toHaveBeenCalledTimes(1);
  });
  it.each([false, true])(
    "preserves generic overlay defaults after filter sizing: custom defaults %s",
    async (customDefaults) => {
      if (customDefaults) {
        TestBed.configureTestingModule({
          providers: [
            {
              provide: CDK_CONNECTED_OVERLAY_DEFAULT_CONFIG,
              useValue: { flexibleDimensions: true, width: 260 },
            },
          ],
        });
      }
      const fixture = TestBed.createComponent(PopoverHost);
      document.body.append(fixture.nativeElement);
      fixture.autoDetectChanges();
      await fixture.whenStable();
      fixture.componentInstance.open.set(true);
      await fixture.whenStable();
      const connected = fixture.debugElement
        .queryAllNodes(By.directive(CdkConnectedOverlay))[0]!
        .injector.get(CdkConnectedOverlay);
      expect(connected.flexibleDimensions).toBe(customDefaults);
      expect(connected.push).toBe(true);
      expect(
        connected.overlayRef.overlayElement.matches(
          ":has(> mat-card.adapt-material-filter-card)"
        )
      ).toBe(false);
      expect(connected.overlayRef.overlayElement.style.width).toBe(
        customDefaults ? "260px" : ""
      );

      fixture.componentInstance.belowOnly.set(true);
      await fixture.whenStable();
      expect(connected.flexibleDimensions).toBe(true);
      expect(connected.push).toBe(false);
      expect(
        connected.overlayRef.overlayElement.matches(
          ":has(> mat-card.adapt-material-filter-card)"
        )
      ).toBe(true);
      expect(connected.overlayRef.overlayElement.style.width).toBe("374px");
      expect(
        connected.positions.every((position) => position.originY === "bottom")
      ).toBe(true);

      fixture.componentInstance.belowOnly.set(false);
      await fixture.whenStable();
      expect(connected.flexibleDimensions).toBe(customDefaults);
      expect(connected.push).toBe(true);
      expect(
        connected.overlayRef.overlayElement.matches(
          ":has(> mat-card.adapt-material-filter-card)"
        )
      ).toBe(false);
      expect(connected.overlayRef.overlayElement.style.width).toBe(
        customDefaults ? "260px" : ""
      );
      expect(
        connected.positions.some((position) => position.originY === "top")
      ).toBe(true);

      fixture.componentInstance.filterSurface.set(true);
      await fixture.whenStable();
      expect(connected.flexibleDimensions).toBe(true);
      expect(connected.push).toBe(true);
      expect(connected.overlayRef.overlayElement.style.width).toBe("374px");
      expect(connected.positions.map((position) => position.originY)).toEqual([
        "bottom",
        "bottom",
        "bottom",
        "top",
        "top",
        "top",
      ]);
      fixture.componentInstance.belowOnly.set(true);
      await fixture.whenStable();
      expect(connected.push).toBe(false);
      expect(
        connected.positions.every((position) => position.originY === "bottom")
      ).toBe(true);
    }
  );

  it("measures above space for a cramped filter while preserving below-only callers", async () => {
    const fixture = TestBed.createComponent(PopoverHost);
    document.body.append(fixture.nativeElement);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const trigger = (fixture.nativeElement as HTMLElement).querySelector(
      "button"
    )!;
    let top = window.innerHeight - 50;
    vi.spyOn(trigger, "getBoundingClientRect").mockImplementation(() =>
      DOMRect.fromRect({ x: 20, y: top, width: 80, height: 36 })
    );
    fixture.componentInstance.filterSurface.set(true);
    fixture.componentInstance.open.set(true);
    await fixture.whenStable();
    const card = document.querySelector<HTMLElement>(
      "mat-card.adapt-material-filter-card"
    )!;
    expect(card.style.maxHeight).toBe(`${top - 16}px`);
    const connected = fixture.debugElement
      .queryAllNodes(By.directive(CdkConnectedOverlay))[0]!
      .injector.get(CdkConnectedOverlay);
    const reposition = vi.spyOn(connected.overlayRef, "updatePosition");
    top = 100;
    window.dispatchEvent(new Event("resize"));
    await fixture.whenStable();
    expect(card.style.maxHeight).toBe(`${window.innerHeight - 152}px`);
    expect(reposition).toHaveBeenCalled();
    top = window.innerHeight - 50;
    fixture.componentInstance.belowOnly.set(true);
    await fixture.whenStable();
    expect(card.style.maxHeight).toBe("80px");
  });

  it("settles native separation after the rendered filter height catches up", async () => {
    let notifyResize: (() => void) | undefined;
    vi.stubGlobal(
      "ResizeObserver",
      class {
        readonly observe = vi.fn();
        readonly disconnect = vi.fn();
        constructor(callback: () => void) {
          notifyResize = callback;
        }
      }
    );
    vi.stubGlobal("innerWidth", 1180);
    vi.stubGlobal("innerHeight", 757);
    vi.spyOn(document.documentElement, "clientWidth", "get").mockReturnValue(
      1180
    );
    vi.spyOn(document.documentElement, "clientHeight", "get").mockReturnValue(
      757
    );
    const fixture = TestBed.createComponent(PopoverHost);
    document.body.append(fixture.nativeElement);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const trigger = (fixture.nativeElement as HTMLElement).querySelector(
      "button"
    )!;
    const origin = DOMRect.fromRect({
      x: 53.5,
      y: 360.375,
      width: 82.78125,
      height: 36,
    });
    vi.spyOn(trigger, "getBoundingClientRect").mockReturnValue(origin);
    let renderedHeight = 360;
    const getRect = HTMLElement.prototype.getBoundingClientRect;
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
      function (this: HTMLElement) {
        if (this.classList.contains("cdk-overlay-pane"))
          return DOMRect.fromRect({
            x: 53.5,
            width: 374,
            height: renderedHeight,
          });
        if (this.classList.contains("cdk-overlay-container"))
          return DOMRect.fromRect({ width: 1165, height: 757 });
        return getRect.call(this);
      }
    );
    fixture.componentInstance.filterSurface.set(true);
    fixture.componentInstance.open.set(true);
    await fixture.whenStable();
    const connected = fixture.debugElement
      .queryAllNodes(By.directive(CdkConnectedOverlay))[0]!
      .injector.get(CdkConnectedOverlay);
    const pane = connected.overlayRef.overlayElement;
    const host = connected.overlayRef.hostElement;
    const positionedBottom = () =>
      757 - Number.parseFloat(pane.style.bottom || host.style.bottom) - 4;
    expect(pane.style.bottom).toBe("389px");
    expect(positionedBottom()).toBeGreaterThan(origin.top);
    const positionChanges = vi.fn();
    const subscription = connected.positionChange.subscribe(positionChanges);

    // Model the actual DOM resize after afterRenderEffect read the new signal.
    // The same native connection emits no positionChange, but needs reapplying.
    const reposition = vi.spyOn(connected.overlayRef, "updatePosition");
    renderedHeight = 344.625;
    notifyResize?.();
    expect(pane.style.bottom).toBe("");
    expect(host.style.bottom).toBe("396.625px");
    expect(positionedBottom()).toBeLessThanOrEqual(origin.top);
    expect(positionedBottom() - renderedHeight).toBeGreaterThanOrEqual(8);
    expect(positionChanges).not.toHaveBeenCalled();
    expect(reposition).toHaveBeenCalledTimes(1);
    notifyResize?.();
    expect(reposition).toHaveBeenCalledTimes(1);
    expect(host.style.bottom).toBe("396.625px");
    expect(positionedBottom()).toBeLessThanOrEqual(origin.top);
    subscription.unsubscribe();
  });

  it("corrects a filter after native positioning and resize, then releases generic menus", async () => {
    const observe = vi.fn();
    const disconnect = vi.fn();
    let notifyResize: (() => void) | undefined;
    vi.stubGlobal(
      "ResizeObserver",
      class {
        readonly observe = observe;
        readonly disconnect = disconnect;
        constructor(callback: () => void) {
          notifyResize = callback;
        }
      }
    );
    const fixture = TestBed.createComponent(PopoverHost);
    document.body.append(fixture.nativeElement);
    fixture.componentInstance.filterSurface.set(true);
    fixture.componentInstance.open.set(true);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const connected = fixture.debugElement
      .queryAllNodes(By.directive(CdkConnectedOverlay))[0]!
      .injector.get(CdkConnectedOverlay);
    const pane = connected.overlayRef.overlayElement;
    const container = TestBed.inject(OverlayContainer).getContainerElement();
    expect(observe).toHaveBeenCalledWith(pane);
    expect(observe).toHaveBeenCalledWith(container);
    vi.spyOn(document.documentElement, "clientWidth", "get").mockReturnValue(
      390
    );
    vi.spyOn(container, "getBoundingClientRect").mockReturnValue(
      DOMRect.fromRect({ x: 0, width: 375 })
    );
    vi.spyOn(pane, "getBoundingClientRect").mockReturnValue(
      DOMRect.fromRect({ x: -7, width: 359 })
    );
    pane.style.transform = "translateY(-4px)";
    connected.positionChange.emit({
      connectionPair: connected.positions[0]!,
      scrollableViewProperties: {
        isOriginClipped: false,
        isOriginOutsideView: false,
        isOverlayClipped: false,
        isOverlayOutsideView: false,
      },
    });
    expect(pane.style.translate).toBe("15px");
    expect(pane.style.transform).toBe("translateY(-4px)");
    pane.style.translate = "";
    window.dispatchEvent(new Event("resize"));
    expect(pane.style.translate).toBe("15px");

    pane.style.translate = "";
    notifyResize?.();
    expect(pane.style.translate).toBe("15px");
    fixture.componentInstance.filterSurface.set(false);
    await fixture.whenStable();
    expect(disconnect).toHaveBeenCalled();
    expect(pane.style.translate).toBe("");
    window.dispatchEvent(new Event("resize"));
    expect(pane.style.translate).toBe("");
    fixture.destroy();
    window.dispatchEvent(new Event("resize"));
    expect(pane.style.translate).toBe("");
  });

  it("uses Material's real modal backdrop and closes on an outside press", async () => {
    const fixture = TestBed.createComponent(DialogHost);
    document.body.append(fixture.nativeElement);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>("button")!
      .click();
    await fixture.whenStable();
    expect(
      document.querySelector('mat-dialog-container[aria-label="Filters"]')
    ).not.toBeNull();
    const backdrop = document.querySelector<HTMLElement>(
      ".adapt-material-filters-backdrop"
    )!;
    expect(backdrop.classList.contains("cdk-overlay-backdrop")).toBe(true);
    backdrop.click();
    await fixture.whenStable();
    expect(fixture.componentInstance.open()).toBe(false);
  });
});
