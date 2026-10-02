/**
 * Named positions a table asks features to fill.
 *
 * A kit's table marks a position with {@link AdaptSlot}; a feature fills it
 * with a component through `renders`. Nothing is the ordinary answer: a
 * table without the feature draws nothing there, and the component's code is
 * not in the build unless the feature is imported.
 */
import {
  drawnSlotFills,
  type FeatureHostState,
  type FeatureSlotKey,
  type SlotFill,
} from "@adapttable/core/binding";
import {
  type ComponentRef,
  type DestroyableInjector,
  DestroyRef,
  Directive,
  effect,
  inject,
  InjectionToken,
  Injector,
  input,
  untracked,
  ViewContainerRef,
} from "@angular/core";

import type { SlotComponent } from "./featureHost";
import {
  ADAPTTABLE_FEATURE_STATE,
  createFeatureState,
  type FeatureState,
} from "./featureState";

/**
 * Which components draw each slot — `DataTable.slotFills`.
 *
 * @public
 */
export type SlotFills = ReadonlyMap<string, readonly SlotFill<SlotComponent>[]>;

/**
 * What a slot component can ask of the table it draws in.
 *
 * @public
 */
export interface SlotTable {
  /** Which components the features draw into each slot. */
  readonly slotFills: SlotFills;
  /** The features' registrations: menu items, commands, writers. */
  readonly featureHost: FeatureHostState;
  /** Reactive values published by the table's mounted features. */
  readonly featureState?: FeatureState;
}

/**
 * The table a slot component draws in, for a component that needs more than
 * its props — the feature host a menu reads its plugin items from.
 *
 * @public
 */
export const ADAPTTABLE_SLOT_TABLE = new InjectionToken<SlotTable>(
  "ADAPTTABLE_SLOT_TABLE"
);

/** Whether two draws name the same components in the same order. */
function sameDraw(
  left: readonly SlotComponent[],
  right: readonly SlotComponent[]
): boolean {
  return (
    left.length === right.length &&
    left.every((component, index) => component === right[index])
  );
}

/**
 * Draws what the table's features contribute to one slot, handing each
 * component the slot's props through its `props` input. Put it on an
 * `<ng-container>`:
 *
 * ```html
 * <ng-container
 *   [adaptSlot]="COLUMN_MENU"
 *   [adaptSlotProps]="menuProps()"
 *   [adaptSlotTable]="table"
 * />
 * ```
 *
 * @public
 */
@Directive({ selector: "[adaptSlot]" })
export class AdaptSlot<TProps> {
  /** The slot to draw. */
  readonly slot = input.required<FeatureSlotKey<TProps>>({
    alias: "adaptSlot",
  });
  /** The props every component drawn here receives. */
  readonly props = input.required<TProps>({ alias: "adaptSlotProps" });
  /** The table whose features fill the slot. */
  readonly table = input.required<SlotTable>({ alias: "adaptSlotTable" });

  private readonly container = inject(ViewContainerRef);
  private readonly injector = inject(Injector);
  private drawn: readonly SlotComponent[] = [];
  private refs: ComponentRef<unknown>[] = [];
  private drawnTable: SlotTable | undefined;
  private slotInjector: DestroyableInjector | undefined;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.slotInjector?.destroy();
    });
    effect(() => {
      const slot = this.slot();
      const props = this.props();
      const table = this.table();
      const components = drawnSlotFills(
        slot,
        table.slotFills.get(slot.id) ?? []
      ).map((fill) => (fill.render as (value: TProps) => SlotComponent)(props));
      untracked(() => {
        if (table !== this.drawnTable || !sameDraw(components, this.drawn)) {
          this.container.clear();
          this.slotInjector?.destroy();
          const injector = Injector.create({
            providers: [
              { provide: ADAPTTABLE_SLOT_TABLE, useValue: table },
              {
                provide: ADAPTTABLE_FEATURE_STATE,
                useValue: table.featureState ?? createFeatureState(),
              },
            ],
            parent: this.injector,
          });
          this.slotInjector = injector;
          this.refs = components.map((component) =>
            this.container.createComponent(component, { injector })
          );
          this.drawn = components;
          this.drawnTable = table;
        }
        for (const ref of this.refs) ref.setInput("props", props);
      });
    });
  }
}
