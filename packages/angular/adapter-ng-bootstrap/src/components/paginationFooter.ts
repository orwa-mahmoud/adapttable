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
import {
  NgbPagination,
  NgbPaginationPages,
} from "@ng-bootstrap/ng-bootstrap/pagination";

import type { TableView } from "../dataTable";

/**
 * Prev/next pager with a rows-per-page select.
 *
 * @internal
 */
@Component({
  selector: "adapt-pagination-footer",
  imports: [AdaptAttrs, AdaptIcon, NgbPagination, NgbPaginationPages],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @let v = view();
    <div data-adapttable-part="footer">
      <label>
        {{ v.table.labels().rowsPerPage }}
        <select
          class="form-select form-select-sm"
          data-ng-bootstrap-part="rows-per-page"
          [attr.aria-label]="v.table.labels().rowsPerPage"
          [adaptAttrs]="{ value: v.table.source().limit }"
          (change)="v.table.setLimit(+$any($event.target).value)"
        >
          @for (size of v.table.pageSizeOptions(); track size) {
            <option
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
      <div data-ng-bootstrap-part="pager">
        <span>{{
          v.table.labels().pageOf({
            page: v.table.pagination().safePage,
            total: v.table.pagination().totalPages,
          })
        }}</span>
        <ngb-pagination
          [collectionSize]="v.table.source().total"
          [pageSize]="v.table.source().limit"
          [page]="v.table.pagination().safePage"
          [directionLinks]="false"
          [boundaryLinks]="false"
          size="sm"
          [attr.aria-label]="
            v.table.labels().pageOf({
              page: v.table.pagination().safePage,
              total: v.table.pagination().totalPages,
            })
          "
        >
          <ng-template ngbPaginationPages>
            <li class="page-item">
              <button
                class="page-link"
                type="button"
                data-ng-bootstrap-part="page-prev"
                [attr.aria-label]="v.table.labels().previousPage"
                [disabled]="v.table.pagination().safePage <= 1"
                (click)="v.table.setPage(v.table.pagination().safePage - 1)"
              >
                <svg [adaptIcon]="previousIcon()"></svg>
              </button>
            </li>
            @for (slot of v.table.pagerSlots(); track slot.key) {
              @if (slot.item === "ellipsis") {
                <li class="page-item disabled">
                  <span
                    class="page-link"
                    data-ng-bootstrap-part="page-ellipsis"
                    aria-hidden="true"
                    >…</span
                  >
                </li>
              } @else {
                <li class="page-item">
                  <button
                    class="page-link"
                    type="button"
                    data-ng-bootstrap-part="page-number"
                    [attr.aria-label]="v.table.labels().goToPage(+slot.item)"
                    [attr.aria-current]="
                      slot.item === v.table.pagination().safePage
                        ? 'page'
                        : null
                    "
                    (click)="v.table.setPage(+slot.item)"
                  >
                    {{ slot.item }}
                  </button>
                </li>
              }
            }
            <li class="page-item">
              <button
                class="page-link"
                type="button"
                data-ng-bootstrap-part="page-next"
                [attr.aria-label]="v.table.labels().nextPage"
                [disabled]="
                  v.table.pagination().safePage >=
                  v.table.pagination().totalPages
                "
                (click)="v.table.setPage(v.table.pagination().safePage + 1)"
              >
                <svg [adaptIcon]="nextIcon()"></svg>
              </button>
            </li>
          </ng-template>
        </ngb-pagination>
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
