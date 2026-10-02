import { type FilterOverlaySlotProps } from "@adapttable/angular";
import { resolveLabels } from "@adapttable/core";
import {
  Component,
  computed,
  signal,
  type TemplateRef,
  viewChild,
} from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { FormsModule } from "@angular/forms";
import { NzButtonModule } from "ng-zorro-antd/button";
import { NzCardModule } from "ng-zorro-antd/card";
import { NzSelectModule } from "ng-zorro-antd/select";

import { kitSelector } from "../testUtils";
import { AdaptFilterDrawer } from "./components/filterPanel";
import { AdaptFilterPopover } from "./components/filterPopover";
import {
  AdaptOverlayOrigin,
  overlayContains,
  registerOverlayOrigin,
} from "./components/overlayPlacement";

@Component({
  imports: [
    AdaptFilterPopover,
    AdaptFilterDrawer,
    AdaptOverlayOrigin,
    FormsModule,
    NzButtonModule,
    NzCardModule,
    NzSelectModule,
  ],
  template: `
    <div [dir]="dir()">
      <button nz-button class="outside" type="button">Outside</button>
      <ng-template #trigger>
        <button
          nz-button
          type="button"
          class="trigger"
          [attr.aria-expanded]="open()"
          (click)="open.set(!open())"
        >
          Filters
        </button>
      </ng-template>
      <ng-template #filters>
        <nz-select
          adaptOverlayOrigin
          [attr.aria-label]="label()"
          [attr.aria-describedby]="description()"
          [attr.aria-invalid]="invalid()"
          [attr.aria-required]="required()"
          [nzShowSearch]="searchable()"
          [nzOpen]="selectOpen()"
          (nzOpenChange)="selectOpen.set($event)"
          [ngModel]="value()"
          (ngModelChange)="value.set($event)"
          style="width: 180px"
        >
          <nz-option nzValue="Dubai" nzLabel="Dubai" />
          <nz-option nzValue="Amman" nzLabel="Amman" />
          <nz-option
            nzValue="Unavailable"
            nzLabel="Unavailable"
            [nzDisabled]="true"
          />
        </nz-select>
        <span id="city-description">Choose a city</span>
      </ng-template>
      @if (content()) {
        @if (drawer()) {
          <button
            nz-button
            class="drawer-trigger"
            type="button"
            (click)="open.set(true)"
          >
            Filters
          </button>
          <adapt-filter-drawer [props]="overlayProps()" />
        } @else {
          <adapt-filter-popover [props]="overlayProps()" />
        }
      }
    </div>
  `,
})
class Host {
  readonly open = signal(false);
  readonly drawer = signal(false);
  readonly dir = signal<"ltr" | "rtl">("ltr");
  readonly value = signal("Dubai");
  readonly selectOpen = signal(false);
  readonly searchable = signal(false);
  readonly label = signal("City");
  readonly description = signal<string | null>(null);
  readonly invalid = signal<string | null>(null);
  readonly required = signal<string | null>(null);
  readonly content = viewChild<TemplateRef<unknown>>("filters");
  private readonly trigger = viewChild<TemplateRef<unknown>>("trigger");
  readonly overlayProps = computed(
    (): FilterOverlaySlotProps<TemplateRef<unknown>> => ({
      open: this.open(),
      onClose: () => this.open.set(false),
      onClearFilters: () => this.value.set(""),
      activeFilterCount: this.value() ? 1 : 0,
      filters: this.content()!,
      children: this.trigger(),
      labels: resolveLabels(undefined),
      dir: this.dir(),
    })
  );
}

const part = (name: string) =>
  document.querySelector<HTMLElement>(kitSelector(name));

async function mount(drawer = false, rtl = false) {
  const fixture = TestBed.createComponent(Host);
  fixture.componentInstance.drawer.set(drawer);
  fixture.componentInstance.dir.set(rtl ? "rtl" : "ltr");
  fixture.autoDetectChanges();
  await fixture.whenStable();
  const element = fixture.nativeElement as HTMLElement;
  document.body.append(element);
  const trigger = element.querySelector<HTMLButtonElement>(
    drawer ? ".drawer-trigger" : ".trigger"
  )!;
  trigger.focus();
  trigger.click();
  await fixture.whenStable();
  return {
    fixture,
    element,
    trigger,
    host: fixture.componentInstance,
    settle: () => fixture.whenStable(),
  };
}

async function openSelect(settle: () => Promise<unknown>) {
  const select = document.querySelector<HTMLElement>("nz-select")!;
  select.querySelector<HTMLInputElement>("input")!.focus();
  select.querySelector<HTMLElement>("nz-select-top-control")!.click();
  await settle();
  return select;
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("NG-ZORRO filter overlays", () => {
  it("uses an anchored portalled popover without a mask and restores focus on Escape", async () => {
    const { fixture, element, trigger, settle } = await mount();
    const surface = part("filters-popover")!;
    expect(surface.closest(".ant-popover")).not.toBeNull();
    expect(element.contains(surface)).toBe(false);
    expect(
      document.querySelector(".cdk-overlay-backdrop, .ant-drawer-mask")
    ).toBeNull();
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    trigger.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Escape",
        keyCode: 27,
        bubbles: true,
        cancelable: true,
      })
    );
    await settle();
    expect(part("filters-popover")).toBeNull();
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(trigger);
    fixture.destroy();
  });

  it("selects a real portalled option without closing its parent, then closes on an outside click", async () => {
    const { fixture, host, element, settle } = await mount();
    const select = await openSelect(settle);
    const list = document.querySelector<HTMLElement>('[role="listbox"]')!;
    expect(list).not.toBeNull();
    expect(part("filters-popover")!.contains(list)).toBe(false);
    const option = [
      ...list.querySelectorAll<HTMLElement>('[role="option"]'),
    ].find((node) => node.textContent?.trim() === "Amman")!;
    option.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    option.click();
    await settle();
    expect(host.value()).toBe("Amman");
    expect(part("filters-popover")).not.toBeNull();
    expect(select.querySelector("input")?.getAttribute("aria-expanded")).toBe(
      "false"
    );
    element.querySelector<HTMLElement>(".outside")!.click();
    await settle();
    expect(part("filters-popover")).toBeNull();
    fixture.destroy();
  });

  it("scopes RTL to the child portal and gives the child the first Escape", async () => {
    const { fixture, trigger, settle } = await mount(false, true);
    const select = await openSelect(settle);
    const input = select.querySelector<HTMLInputElement>("input")!;
    const list = document.querySelector<HTMLElement>('[role="listbox"]')!;
    expect(list.closest<HTMLElement>(".cdk-overlay-pane")?.dir).toBe("rtl");
    expect(input.getAttribute("role")).toBe("combobox");
    expect(input.getAttribute("aria-label")).toBe("City");
    expect(input.getAttribute("aria-controls")).toBe(list.id);
    expect(
      document
        .getElementById(input.getAttribute("aria-activedescendant")!)
        ?.getAttribute("role")
    ).toBe("option");
    input.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Escape",
        keyCode: 27,
        bubbles: true,
        cancelable: true,
      })
    );
    await settle();
    expect(input.getAttribute("aria-expanded")).toBe("false");
    expect(part("filters-popover")).not.toBeNull();
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(document.activeElement).toBe(input);
    input.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Escape",
        keyCode: 27,
        bubbles: true,
        cancelable: true,
      })
    );
    await settle();
    expect(part("filters-popover")).toBeNull();
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(trigger);
    fixture.destroy();
  });

  it("reflects controlled nzOpen changes in the real combobox and portal", async () => {
    const { fixture, host, settle } = await mount();
    const input = document.querySelector<HTMLInputElement>("nz-select input")!;
    expect(input.getAttribute("aria-expanded")).toBe("false");
    host.selectOpen.set(true);
    await settle();
    expect(input.getAttribute("aria-expanded")).toBe("true");
    const listId = input.getAttribute("aria-controls")!;
    expect(document.getElementById(listId)?.getAttribute("role")).toBe(
      "listbox"
    );
    host.selectOpen.set(false);
    await settle();
    expect(input.getAttribute("aria-expanded")).toBe("false");
    expect(input.hasAttribute("aria-controls")).toBe(false);
    expect(input.hasAttribute("aria-activedescendant")).toBe(false);
    expect(part("filters-popover")).not.toBeNull();
    fixture.destroy();
  });

  it("mirrors searchable select labels, validation and disabled option state to the actual controls", async () => {
    const { fixture, host, settle } = await mount();
    host.searchable.set(true);
    host.description.set("city-description");
    host.invalid.set("true");
    host.required.set("true");
    await settle();
    const select = await openSelect(settle);
    const input = select.querySelector<HTMLInputElement>("input")!;
    expect(input.getAttribute("aria-autocomplete")).toBe("list");
    expect(input.getAttribute("aria-describedby")).toBe("city-description");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(input.getAttribute("aria-required")).toBe("true");
    const option = [
      ...document.querySelectorAll<HTMLElement>('[role="option"]'),
    ].find((candidate) => candidate.getAttribute("title") === "Unavailable")!;
    expect(option.getAttribute("aria-disabled")).toBe("true");
    expect(option.getAttribute("aria-selected")).toBe("false");
    option.click();
    await settle();
    expect(host.value()).toBe("Dubai");
    expect(input.getAttribute("aria-expanded")).toBe("true");

    host.label.set("Destination city");
    host.invalid.set("false");
    await settle();
    expect(input.getAttribute("aria-label")).toBe("Destination city");
    expect(input.getAttribute("aria-invalid")).toBe("false");
    const escape = new KeyboardEvent("keydown", {
      key: "Escape",
      bubbles: true,
      cancelable: true,
    });
    option.dispatchEvent(escape);
    await settle();
    expect(escape.defaultPrevented).toBe(true);
    expect(input.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(input);
    expect(part("filters-popover")).not.toBeNull();
    fixture.destroy();
  });

  it("does not consume an Escape outside an open child select and unregisters destroyed controls", async () => {
    const { fixture, element, trigger, settle } = await mount();
    const select = await openSelect(settle);
    const popup = document.querySelector<HTMLElement>('[role="listbox"]')!;
    expect(overlayContains(select, popup)).toBe(true);
    const outside = element.querySelector<HTMLButtonElement>(".outside")!;
    outside.focus();
    const escape = new KeyboardEvent("keydown", {
      key: "Escape",
      bubbles: true,
      cancelable: true,
    });
    outside.dispatchEvent(escape);
    await settle();
    expect(escape.defaultPrevented).toBe(false);
    expect(part("filters-popover")).toBeNull();
    expect(document.activeElement).toBe(trigger);
    expect(overlayContains(select, popup)).toBe(false);
    fixture.destroy();
    const afterDestroy = new KeyboardEvent("keydown", {
      key: "Escape",
      cancelable: true,
    });
    document.dispatchEvent(afterDestroy);
    expect(afterDestroy.defaultPrevented).toBe(false);
  });

  it("uses the real drawer mask, with a named modal panel and nested Escape order", async () => {
    const { fixture, trigger, settle } = await mount(true, true);
    expect(
      part("filters-backdrop")?.classList.contains("ant-drawer-mask")
    ).toBe(true);
    expect(
      part("filters-panel")?.classList.contains("ant-drawer-content")
    ).toBe(true);
    expect(part("filters-panel")?.getAttribute("aria-modal")).toBe("true");
    expect(part("filters-panel")?.getAttribute("aria-label")).toBe("Filters");
    expect(part("filters-panel")?.closest(".ant-drawer-left")).not.toBeNull();
    const select = await openSelect(settle);
    select.querySelector("input")!.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Escape",
        bubbles: true,
        cancelable: true,
      })
    );
    await settle();
    expect(part("filters-panel")).not.toBeNull();
    part("filters-backdrop")!.click();
    await settle();
    expect(part("filters-panel")).toBeNull();
    expect(document.activeElement).toBe(trigger);
    trigger.click();
    await settle();
    const reopened = part("filters-panel")!;
    expect(reopened).not.toBeNull();
    const controls = [
      ...reopened.querySelectorAll<HTMLElement>(
        "button:not([disabled]), input:not([disabled])"
      ),
    ];
    for (const control of controls)
      Object.defineProperty(control, "offsetHeight", {
        configurable: true,
        value: 20,
      });
    const sentinels = [
      ...document.querySelectorAll<HTMLElement>(".cdk-focus-trap-anchor"),
    ];
    expect(sentinels).toHaveLength(2);
    sentinels[0]!.focus();
    expect(document.activeElement).toBe(controls.at(-1));
    sentinels[1]!.focus();
    expect(document.activeElement).toBe(controls[0]);
    controls[0]!.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
    );
    await settle();
    expect(part("filters-panel")).toBeNull();
    expect(document.activeElement).toBe(trigger);
    expect(document.querySelectorAll(".cdk-focus-trap-anchor")).toHaveLength(0);
    fixture.destroy();
  });
});

describe("scoped portal ownership", () => {
  it("follows nested registrations without treating another table's portal as inside", () => {
    const parent = document.createElement("div");
    const origin = document.createElement("button");
    parent.append(origin);
    const child = document.createElement("div");
    const nestedOrigin = document.createElement("button");
    child.append(nestedOrigin);
    const nested = document.createElement("div");
    const other = document.createElement("div");
    const stopChild = registerOverlayOrigin(origin, () => child);
    const stopNested = registerOverlayOrigin(nestedOrigin, () => nested);
    expect(overlayContains(parent, nested)).toBe(true);
    expect(overlayContains(parent, other)).toBe(false);
    expect(overlayContains(undefined, nested)).toBe(false);
    expect(overlayContains(parent, null)).toBe(false);
    stopNested();
    expect(overlayContains(parent, nested)).toBe(false);
    stopChild();
    expect(overlayContains(parent, child)).toBe(false);
  });

  it("terminates cyclic portal ownership and tolerates a portal that has already closed", () => {
    const parent = document.createElement("div");
    const origin = document.createElement("button");
    parent.append(origin);
    const child = document.createElement("div");
    const nestedOrigin = document.createElement("button");
    child.append(nestedOrigin);
    const unrelated = document.createElement("div");
    const unregisterChild = registerOverlayOrigin(origin, () => child);
    const unregisterCycle = registerOverlayOrigin(nestedOrigin, () => parent);
    const unregisterClosed = registerOverlayOrigin(origin, () => null);
    try {
      expect(overlayContains(parent, unrelated)).toBe(false);
      expect(overlayContains(parent, nestedOrigin)).toBe(true);
      expect(overlayContains(parent, new EventTarget())).toBe(false);
      unregisterChild();
      expect(overlayContains(parent, nestedOrigin)).toBe(false);
    } finally {
      unregisterChild();
      unregisterCycle();
      unregisterClosed();
    }
  });
});
