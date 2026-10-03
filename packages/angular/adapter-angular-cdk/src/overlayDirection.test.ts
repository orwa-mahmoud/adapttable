import { contextMenu } from "@adapttable/angular-cdk/context-menu";
import { rowActions } from "@adapttable/angular-cdk/row-actions";
import { savedViews } from "@adapttable/angular-cdk/saved-views";
import {
  CdkMenuModule,
  CdkMenuTrigger,
  MENU_SCROLL_STRATEGY,
} from "@angular/cdk/menu";
import {
  CdkConnectedOverlay,
  CdkOverlayOrigin,
  createRepositionScrollStrategy,
  type OverlayRef,
  type ScrollStrategy,
} from "@angular/cdk/overlay";
import { ViewportRuler } from "@angular/cdk/scrolling";
import { Component, inject, Injectable, Injector, signal } from "@angular/core";
import { type ComponentFixture, TestBed } from "@angular/core/testing";
import { By } from "@angular/platform-browser";
import { EMPTY } from "rxjs";

import { fixtureOverlayProviders } from "../testing/overlayFixture";
import { AdaptDataTable } from "./dataTable";

/** Observe the public scroll-strategy lifecycle while retaining real repositioning. */
@Injectable()
class MenuScrollProbe {
  readonly records: { overlay?: OverlayRef; strategy: ScrollStrategy }[] = [];

  create(injector: Injector): ScrollStrategy {
    const native = createRepositionScrollStrategy(injector);
    const record: { overlay?: OverlayRef; strategy: ScrollStrategy } = {
      strategy: {
        attach: vi.fn((overlay: OverlayRef) => {
          record.overlay = overlay;
          native.attach(overlay);
        }),
        enable: vi.fn(() => native.enable()),
        disable: vi.fn(() => native.disable()),
        detach: vi.fn(() => native.detach()),
      },
    };
    this.records.push(record);
    return record.strategy;
  }
}

@Component({
  imports: [AdaptDataTable, CdkMenuModule],
  providers: [
    ...fixtureOverlayProviders,
    MenuScrollProbe,
    {
      provide: MENU_SCROLL_STRATEGY,
      useFactory: () => {
        const probe = inject(MenuScrollProbe);
        const injector = inject(Injector);
        return () => probe.create(injector);
      },
    },
    {
      provide: ViewportRuler,
      useValue: {
        getViewportSize: () => ({ width: 1000, height: 800 }),
        getViewportScrollPosition: () => ({ top: 0, left: 0 }),
        getViewportRect: () => new DOMRect(0, 0, 1000, 800),
        change: () => EMPTY,
      },
    },
  ],
  template: `
    <adapt-data-table
      [data]="rows"
      [columns]="columns"
      [rowKey]="rowKey"
      [features]="features"
      [dir]="dir()"
      [urlSync]="false"
      [forceMobile]="false"
    />
    <button class="unrelated-trigger" [cdkMenuTriggerFor]="unrelated">
      Unrelated menu
    </button>
    <ng-template #unrelated
      ><div cdkMenu class="unrelated-menu" aria-label="Unrelated actions">
        <button cdkMenuItem>Unrelated action</button>
      </div></ng-template
    >
  `,
})
class Host {
  readonly dir = signal<"ltr" | "rtl">("rtl");
  readonly rows = [{ id: "1", name: "Ada" }];
  readonly columns = [
    { key: "name", accessor: (row: { name: string }) => row.name },
  ];
  readonly rowKey = (row: { id: string }) => row.id;
  readonly acted = vi.fn();
  readonly features = [
    savedViews({ storageKey: "cdk-live-direction", storage: null }),
    rowActions(
      [{ key: "inspect", label: "Inspect", onClick: () => this.acted() }],
      { layout: "menu" }
    ),
    contextMenu({
      items: () => [
        { key: "inspect", label: "Inspect", onSelect: () => this.acted() },
      ],
    }),
  ];
}

type Kind = "saved views" | "row actions" | "context menu";

const menuParts: Record<
  Kind,
  { trigger: string; field: string; panel: string | null }
> = {
  "saved views": {
    trigger: "views-button",
    field: "views-input",
    panel: "views-panel",
  },
  "row actions": {
    trigger: "row-actions-trigger",
    field: "action-button",
    panel: null,
  },
  "context menu": {
    trigger: "cell",
    field: "context-menu-item",
    panel: "context-menu",
  },
};

beforeEach(() => {
  vi.spyOn(document.documentElement, "clientWidth", "get").mockReturnValue(
    1000
  );
  vi.spyOn(document.documentElement, "clientHeight", "get").mockReturnValue(
    800
  );
});

afterEach(() => {
  vi.restoreAllMocks();
});

async function mount() {
  const fixture = TestBed.createComponent(Host);
  const element = fixture.nativeElement as HTMLElement;
  document.body.append(element);
  const settle = async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };
  const find = (selector: string): HTMLElement => {
    const found = element.querySelector<HTMLElement>(selector);
    if (!found) throw new Error(`Missing owned ${selector}`);
    return found;
  };
  const part = (name: string) => find(`[data-adapttable-part="${name}"]`);
  const probe = fixture.debugElement.injector.get(MenuScrollProbe);
  await settle();
  return { fixture, element, settle, find, part, probe };
}

function connectedFor(
  fixture: ComponentFixture<Host>,
  panel: HTMLElement
): CdkConnectedOverlay {
  const overlay = fixture.debugElement
    .queryAllNodes(By.directive(CdkConnectedOverlay))
    .map((node) => node.injector.get(CdkConnectedOverlay))
    .find((candidate) => candidate.overlayRef?.overlayElement.contains(panel));
  if (!overlay) throw new Error("Missing actual connected overlay");
  return overlay;
}

function positionContextOrigin(connected: CdkConnectedOverlay) {
  const origin = connected.origin;
  if (!(origin instanceof CdkOverlayOrigin))
    throw new Error("Missing context menu origin");
  const originElement: unknown = origin.elementRef.nativeElement;
  if (!(originElement instanceof HTMLElement))
    throw new Error("Missing context menu origin element");
  originElement.getBoundingClientRect = () => new DOMRect(300, 20, 0, 0);
}

function overlayFor(
  kind: Kind,
  mounted: Awaited<ReturnType<typeof mount>>,
  panel: HTMLElement
): OverlayRef {
  if (kind === "row actions") {
    const record = mounted.probe.records.find((candidate) =>
      candidate.overlay?.overlayElement.contains(panel)
    );
    if (!record?.overlay)
      throw new Error(
        "Native menu did not attach its inherited scroll strategy"
      );
    return record.overlay;
  }
  const connected = connectedFor(mounted.fixture, panel);
  if (kind === "context menu") positionContextOrigin(connected);
  return connected.overlayRef;
}

async function open(kind: Kind, mounted: Awaited<ReturnType<typeof mount>>) {
  const { part, settle } = mounted;
  const parts = menuParts[kind];
  const trigger = part(parts.trigger);
  trigger.getBoundingClientRect = () => new DOMRect(300, 0, 100, 20);
  if (kind === "context menu") {
    trigger.dispatchEvent(
      new MouseEvent("contextmenu", {
        bubbles: true,
        cancelable: true,
        clientX: 300,
        clientY: 20,
      })
    );
  } else {
    trigger.click();
  }
  await settle();
  const field = part(parts.field);
  const panel = parts.panel
    ? part(parts.panel)
    : field.closest<HTMLElement>('[role="menu"]');
  if (!panel) throw new Error("Missing actual menu panel");
  const overlay = overlayFor(kind, mounted, panel);
  overlay.overlayElement.getBoundingClientRect = () =>
    new DOMRect(0, 0, 200, 40);
  overlay.updatePosition();
  field.focus();
  return { trigger, field, panel, overlay };
}

function expectPlacement(
  overlay: OverlayRef,
  kind: Kind,
  direction: "ltr" | "rtl"
) {
  expect(overlay.getDirection()).toBe(direction);
  expect(overlay.hostElement.dir).toBe(direction);
  expect(overlay.overlayElement.style.top).toBe("20px");
  if (direction === "rtl") {
    expect(overlay.overlayElement.style.right).toBe(
      kind === "context menu" ? "700px" : "600px"
    );
    expect(overlay.overlayElement.style.left).toBe("");
  } else {
    expect(overlay.overlayElement.style.left).toBe("300px");
    expect(overlay.overlayElement.style.right).toBe("");
  }
}

describe("already-open native CDK overlay direction", () => {
  it.each<Kind>(["saved views", "row actions", "context menu"])(
    "updates %s without replacing its panel or focus, and stops after close/destroy",
    async (kind) => {
      const mounted = await mount();
      const { fixture, element, settle, probe } = mounted;
      let lastOverlay: OverlayRef | undefined;
      try {
        for (let cycle = 0; cycle < 2; cycle++) {
          fixture.componentInstance.dir.set("rtl");
          await settle();
          const { trigger, field, panel, overlay } = await open(kind, mounted);
          lastOverlay = overlay;
          expectPlacement(overlay, kind, "rtl");
          if (kind === "row actions" && cycle === 0) {
            // A repeated public enable call must not duplicate direction work.
            overlay.getConfig().scrollStrategy?.enable();
          }
          const direction = vi.spyOn(overlay, "setDirection");
          for (const dir of ["ltr", "rtl"] as const) {
            direction.mockClear();
            fixture.componentInstance.dir.set(dir);
            await settle();
            expectPlacement(overlay, kind, dir);
            expect(overlay.hasAttached()).toBe(true);
            expect(overlay.overlayElement.contains(panel)).toBe(true);
            expect(panel.isConnected).toBe(true);
            expect(overlay.overlayElement.children).toHaveLength(1);
            expect(document.activeElement).toBe(field);
            expect(direction).toHaveBeenCalledTimes(1);
            expect(fixture.componentInstance.acted).not.toHaveBeenCalled();
          }
          field.dispatchEvent(
            new KeyboardEvent("keydown", {
              key: "Escape",
              keyCode: 27,
              bubbles: true,
              cancelable: true,
            })
          );
          await settle();
          expect(panel.isConnected).toBe(false);
          expect(overlay.hasAttached()).toBe(false);
          if (kind !== "context menu") {
            expect(trigger.getAttribute("aria-expanded")).toBe("false");
            expect(document.activeElement).toBe(trigger);
          }
          direction.mockClear();
          const position = vi.spyOn(overlay, "updatePosition");
          fixture.componentInstance.dir.set("ltr");
          await settle();
          expect(direction).not.toHaveBeenCalled();
          expect(position).not.toHaveBeenCalled();
          direction.mockRestore();
          position.mockRestore();
        }
        if (kind === "row actions") {
          expect(probe.records).toHaveLength(1);
          const { strategy } = probe.records[0]!;
          expect(strategy.attach).toHaveBeenCalledTimes(1);
          expect(strategy.enable).toHaveBeenCalledTimes(3);
          expect(strategy.disable).toHaveBeenCalledTimes(2);
          expect(strategy.detach).not.toHaveBeenCalled();
        }
        if (!lastOverlay) throw new Error("Menu never opened");
        const direction = vi.spyOn(lastOverlay, "setDirection");
        const position = vi.spyOn(lastOverlay, "updatePosition");
        fixture.destroy();
        fixture.componentInstance.dir.set("rtl");
        await fixture.whenStable();
        expect(direction).not.toHaveBeenCalled();
        expect(position).not.toHaveBeenCalled();
        expect(element.querySelector(".cdk-overlay-container")).toBeNull();
        if (kind === "row actions") {
          expect(probe.records[0]!.strategy.disable).toHaveBeenCalledTimes(3);
          expect(probe.records[0]!.strategy.detach).toHaveBeenCalledTimes(1);
        }
      } finally {
        fixture.destroy();
        element.remove();
      }
    }
  );

  it("cancels pending direction work when a native row menu closes before its first render", async () => {
    const mounted = await mount();
    const { fixture, element, part, probe, settle } = mounted;
    try {
      const trigger = part("row-actions-trigger");
      trigger.click();
      const overlay = probe.records[0]?.overlay;
      if (!overlay) throw new Error("Native row menu did not attach");
      const direction = vi.spyOn(overlay, "setDirection");
      const position = vi.spyOn(overlay, "updatePosition");
      trigger.click();
      fixture.componentInstance.dir.set("ltr");
      await settle();
      expect(overlay.hasAttached()).toBe(false);
      expect(direction).not.toHaveBeenCalled();
      expect(position).not.toHaveBeenCalled();
      expect(probe.records[0]!.strategy.enable).toHaveBeenCalledTimes(1);
      expect(probe.records[0]!.strategy.disable).toHaveBeenCalledTimes(1);
      trigger.click();
      direction.mockClear();
      position.mockClear();
      fixture.destroy();
      await fixture.whenStable();
      expect(direction).not.toHaveBeenCalled();
      expect(position).not.toHaveBeenCalled();
      expect(probe.records[0]!.strategy.detach).toHaveBeenCalledTimes(1);
      expect(element.querySelector(".cdk-overlay-container")).toBeNull();
    } finally {
      fixture.destroy();
      element.remove();
    }
  });

  it("wraps only the adapted trigger's inherited strategy and leaves another table and native menu independent", async () => {
    const first = await mount();
    const second = await mount();
    try {
      const triggers = first.fixture.debugElement.queryAll(
        By.directive(CdkMenuTrigger)
      );
      const adapted = triggers.find(
        (node) => node.nativeElement === first.part("row-actions-trigger")
      );
      const unrelated = triggers.find(
        (node) => node.nativeElement === first.find(".unrelated-trigger")
      );
      if (!adapted || !unrelated)
        throw new Error("Missing native menu triggers");
      const inherited =
        first.fixture.debugElement.injector.get(MENU_SCROLL_STRATEGY);
      expect(adapted.injector.get(MENU_SCROLL_STRATEGY)).not.toBe(inherited);
      expect(unrelated.injector.get(MENU_SCROLL_STRATEGY)).toBe(inherited);
      expect(
        second.fixture.debugElement.injector.get(MENU_SCROLL_STRATEGY)
      ).not.toBe(inherited);
      const secondViews = await open("saved views", second);
      const unrelatedTrigger = unrelated.injector.get(CdkMenuTrigger);
      const unrelatedButton = first.find(".unrelated-trigger");
      // HTMLElement.click() does not focus the trigger as user activation does.
      // Keep the native menu stack focused while its portal initializes.
      unrelatedButton.focus();
      unrelatedButton.click();
      await first.settle();
      const unrelatedMenu = first.find(".unrelated-menu");
      const unrelatedItem = first.find(".unrelated-menu button");
      unrelatedItem.focus();
      await first.settle();
      await second.settle();
      const unrelatedOverlay = first.probe.records[0]?.overlay;
      if (!unrelatedOverlay)
        throw new Error("Unrelated native menu did not open");
      const direction = vi.spyOn(unrelatedOverlay, "setDirection");
      const otherDirection = vi.spyOn(secondViews.overlay, "setDirection");
      expect(unrelatedTrigger.isOpen()).toBe(true);
      expect(unrelatedOverlay.hasAttached()).toBe(true);
      expect(unrelatedMenu.isConnected).toBe(true);
      expect(secondViews.overlay.hasAttached()).toBe(true);
      expect(secondViews.panel.isConnected).toBe(true);
      expect(document.activeElement).toBe(unrelatedItem);
      first.fixture.componentInstance.dir.set("ltr");
      await first.settle();
      await second.settle();
      expect(direction).not.toHaveBeenCalled();
      expect(otherDirection).not.toHaveBeenCalled();
      expect(unrelatedTrigger.isOpen()).toBe(true);
      expect(unrelatedOverlay.hasAttached()).toBe(true);
      expect(unrelatedMenu.isConnected).toBe(true);
      expect(document.activeElement).toBe(unrelatedItem);
      expect(secondViews.panel.isConnected).toBe(true);
      expect(secondViews.overlay.hostElement.dir).toBe("rtl");
      first.fixture.destroy();
      expect(secondViews.panel.isConnected).toBe(true);
      expect(first.element.querySelector(".cdk-overlay-container")).toBeNull();
    } finally {
      first.fixture.destroy();
      second.fixture.destroy();
      first.element.remove();
      second.element.remove();
    }
  });
});
