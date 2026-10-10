/**
 * Row count and the windowed pager.
 */
import {
  AdaptAttrs,
  AdaptIcon,
  expandChevronIcon,
} from "@adapttable/angular/adapter";
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  Directive,
  ElementRef,
  inject,
  input,
  type OnChanges,
  type OnInit,
  output,
  Renderer2,
} from "@angular/core";
import { FormsModule } from "@angular/forms";
import { PaginationComponent } from "ngx-bootstrap/pagination";

import type { TableView } from "../dataTable";

/**
 * Put semantics on ngx-bootstrap's actionable anchor, not its template span.
 * @internal
 */
@Directive({ selector: "[adaptPaginationLink]" })
export class AdaptPaginationLink implements OnChanges, OnInit {
  readonly state = input.required<{
    readonly part: string;
    readonly label: string;
    readonly page: number;
    readonly disabled?: boolean;
    readonly current?: boolean;
  }>({ alias: "adaptPaginationLink" });
  readonly adaptPageSelect = output<number>();
  readonly selected = this.adaptPageSelect;
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly renderer = inject(Renderer2);
  private readonly destroy = inject(DestroyRef);

  ngOnChanges(): void {
    const link = this.element.nativeElement.parentElement;
    if (!link) return;
    const state = this.state();
    this.renderer.setAttribute(link, "role", "button");
    this.renderer.setAttribute(link, "data-ngx-bootstrap-part", state.part);
    this.renderer.setAttribute(link, "aria-label", state.label);
    this.renderer.setAttribute(link, "aria-disabled", String(!!state.disabled));
    this.renderer.setAttribute(link, "tabindex", state.disabled ? "-1" : "0");
    if (state.current) this.renderer.setAttribute(link, "aria-current", "page");
    else this.renderer.removeAttribute(link, "aria-current");
  }

  ngOnInit(): void {
    const link = this.element.nativeElement.parentElement;
    if (!link) return;
    // Native pageChanged also fires for model writes. Only activation writes
    // back to the host; rendering or clamping the native pager must not.
    this.destroy.onDestroy(
      this.renderer.listen(link, "click", () => {
        const state = this.state();
        if (!state.disabled) this.selected.emit(state.page);
      })
    );
    // Enter already activates an anchor. A button role also promises Space.
    this.destroy.onDestroy(
      this.renderer.listen(link, "keydown", (event: KeyboardEvent) => {
        if (event.key !== " ") return;
        event.preventDefault();
        if (!this.state().disabled) link.click();
      })
    );
  }
}

/**
 * Prev/next pager with a rows-per-page select.
 *
 * @internal
 */
@Component({
  selector: "adapt-pagination-footer",
  imports: [
    AdaptAttrs,
    AdaptIcon,
    AdaptPaginationLink,
    PaginationComponent,
    FormsModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @let v = view();
    <div data-adapttable-part="footer">
      <label>
        {{ v.table.labels().rowsPerPage }}
        <select
          class="form-select form-select-sm"
          data-ngx-bootstrap-part="rows-per-page"
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
      <div data-ngx-bootstrap-part="pager">
        <span>{{
          v.table.labels().pageOf({
            page: v.table.pagination().safePage,
            total: v.table.pagination().totalPages,
          })
        }}</span>
        <pagination
          class="pagination-sm"
          [totalItems]="v.table.source().total"
          [itemsPerPage]="v.table.source().limit"
          [ngModel]="v.table.pagination().safePage"
          [maxSize]="5"
          [rotate]="false"
          [directionLinks]="true"
          [boundaryLinks]="false"
          [previousText]="v.table.labels().previousPage"
          [nextText]="v.table.labels().nextPage"
          [customPreviousTemplate]="previous"
          [customNextTemplate]="next"
          [customPageTemplate]="page"
        />
        <ng-template #previous let-disabled="disabled">
          <span
            (adaptPageSelect)="selectPage($event)"
            [adaptPaginationLink]="{
              part: 'page-prev',
              page: v.table.pagination().safePage - 1,
              label: v.table.labels().previousPage,
              disabled,
            }"
          >
            <svg [adaptIcon]="previousIcon()"></svg>
          </span>
        </ng-template>
        <ng-template #next let-disabled="disabled">
          <span
            (adaptPageSelect)="selectPage($event)"
            [adaptPaginationLink]="{
              part: 'page-next',
              page: v.table.pagination().safePage + 1,
              label: v.table.labels().nextPage,
              disabled,
            }"
          >
            <svg [adaptIcon]="nextIcon()"></svg>
          </span>
        </ng-template>
        <ng-template #page let-page let-currentPage="currentPage">
          <span
            (adaptPageSelect)="selectPage($event)"
            [adaptPaginationLink]="{
              part: page.text === '...' ? 'page-ellipsis' : 'page-number',
              page: page.number,
              label: v.table.labels().goToPage(page.number),
              current: page.number === currentPage,
            }"
            >{{ page.text }}</span
          >
        </ng-template>
      </div>
    </div>
  `,
})
export class AdaptPaginationFooter<TRow> {
  /** What the table renders from. */
  readonly view = input.required<TableView<TRow>>();

  protected selectPage(page: number): void {
    const table = this.view().table;
    if (page !== table.pagination().safePage) table.setPage(page);
  }

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
