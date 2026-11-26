import {
  ADAPTTABLE_FEATURE_STATE,
  ADAPTTABLE_SLOT_TABLE,
  createFeatureState,
  type SlotComponent,
  type SlotTable,
} from "@adapttable/angular";
import {
  drawnSlotFills,
  type FeatureSlotKey,
  sameItems,
} from "@adapttable/core/binding";
import {
  type ComponentRef,
  type DestroyableInjector,
  DestroyRef,
  Directive,
  effect,
  inject,
  Injector,
  input,
  untracked,
  ViewContainerRef,
} from "@angular/core";

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
  /**
   * The table whose features fill the slot; inside a slot component, the
   * table that component draws in.
   */
  readonly table = input<SlotTable>(undefined, { alias: "adaptSlotTable" });
  private readonly slotTable = inject(ADAPTTABLE_SLOT_TABLE, {
    optional: true,
  });

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
      const table = this.table() ?? this.slotTable;
      if (!table)
        throw new Error(
          `AdaptTable: [adaptSlot] for "${slot.id}" needs [adaptSlotTable] outside a table slot.`
        );
      const components = drawnSlotFills(
        slot,
        table.slotFills.get(slot.id) ?? []
      ).map((fill) => (fill.render as (value: TProps) => SlotComponent)(props));
      untracked(() => {
        if (table !== this.drawnTable || !sameItems(components, this.drawn)) {
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
