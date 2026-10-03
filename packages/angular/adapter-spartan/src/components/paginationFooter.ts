/**
 * Row count and the windowed pager.
 */
import { AdaptAttrs, AdaptIcon, expandChevronIcon } from "@adapttable/angular";
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from "@angular/core";

import type { TableView } from "../dataTable";
import { HlmButton, HlmNativeOption, HlmNativeSelect } from "../helm/controls";

/**
 * Prev/next pager with a rows-per-page select.
 *
 * @internal
 */
@Component({
  selector: "adapt-pagination-footer",
  imports: [HlmButton, HlmNativeSelect, HlmNativeOption, AdaptAttrs, AdaptIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @let v = view();
    <div data-adapttable-part="footer">
      <label>
        {{ v.table.labels().rowsPerPage }}
        <select
          adaptHlmNativeSelect
          data-spartan-part="rows-per-page"
          [attr.aria-label]="v.table.labels().rowsPerPage"
          [adaptAttrs]="{ value: v.table.source().limit }"
          (change)="v.table.setLimit(+$any($event.target).value)"
        >
          @for (size of v.table.pageSizeOptions(); track size) {
            <option
              adaptHlmNativeOption
              [value]="size"
              [attr.selected]="size === v.table.source().limit ? '' : null"
            >
              {{ size }}
            </option>
          }
        </select>
      </label>
      @if (v.table.source().total > 0) {
        <span>{{
          v.table.labels().showing({
            from: v.table.pagination().fromIndex,
            to: v.table.pagination().toIndex,
            total: v.table.source().total,
          })
        }}</span>
      }
      <div data-spartan-part="pager">
        <span>{{
          v.table.labels().pageOf({
            page: v.table.pagination().safePage,
            total: v.table.pagination().totalPages,
          })
        }}</span>
        <button
          adaptHlmButton
          type="button"
          data-spartan-part="page-prev"
          [attr.aria-label]="v.table.labels().previousPage"
          [disabled]="v.table.pagination().safePage <= 1"
          (click)="v.table.setPage(v.table.pagination().safePage - 1)"
        >
          <svg [adaptIcon]="previousIcon()"></svg>
        </button>
        @for (slot of v.table.pagerSlots(); track slot.key) {
          @if (slot.item === "ellipsis") {
            <span data-spartan-part="page-ellipsis" aria-hidden="true">…</span>
          } @else {
            <button
              adaptHlmButton
              type="button"
              data-spartan-part="page-number"
              [attr.aria-label]="v.table.labels().goToPage(+slot.item)"
              [attr.aria-current]="
                slot.item === v.table.pagination().safePage ? 'page' : null
              "
              (click)="v.table.setPage(+slot.item)"
            >
              {{ slot.item }}
            </button>
          }
        }
        <button
          adaptHlmButton
          type="button"
          data-spartan-part="page-next"
          [attr.aria-label]="v.table.labels().nextPage"
          [disabled]="
            v.table.pagination().safePage >= v.table.pagination().totalPages
          "
          (click)="v.table.setPage(v.table.pagination().safePage + 1)"
        >
          <svg [adaptIcon]="nextIcon()"></svg>
        </button>
      </div>
    </div>
  `,
})
export class AdaptPaginationFooter<TRow> {
  /** What the table renders from. */
  readonly view = input.required<TableView<TRow>>();

  /** Pagination follows reading order, including live direction changes. */
  protected readonly previousIcon = computed(() =>
    expandChevronIcon({
      open: false,
      dir: this.view().table.dir() === "rtl" ? "ltr" : "rtl",
    })
  );
  protected readonly nextIcon = computed(() =>
    expandChevronIcon({ open: false, dir: this.view().table.dir() })
  );
}
