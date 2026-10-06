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
  effect,
  ElementRef,
  inject,
  input,
  viewChild,
} from "@angular/core";
import { FormsModule } from "@angular/forms";
import { NzButtonModule } from "ng-zorro-antd/button";
import { NzFlexModule } from "ng-zorro-antd/flex";
import { NzI18nService } from "ng-zorro-antd/i18n";
import { NzPaginationModule } from "ng-zorro-antd/pagination";
import { NzSelectModule } from "ng-zorro-antd/select";

import type { TableView } from "../dataTable";
import { AdaptOverlayOrigin } from "./overlayPlacement";

/**
 * Prev/next pager with a rows-per-page select.
 *
 * @internal
 */
@Component({
  selector: "adapt-pagination-footer",
  imports: [
    AdaptOverlayOrigin,
    AdaptAttrs,
    AdaptIcon,
    FormsModule,
    NzButtonModule,
    NzFlexModule,
    NzPaginationModule,
    NzSelectModule,
  ],
  providers: [NzI18nService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @let v = view();
    <div
      nz-flex
      nzAlign="center"
      nzJustify="space-between"
      nzWrap="wrap"
      [nzGap]="8"
      data-adapttable-part="footer"
    >
      <span>
        {{ v.table.labels().rowsPerPage }}
        <nz-select
          adaptOverlayOrigin
          #pageSize
          [attr.aria-label]="v.table.labels().rowsPerPage"
          [adaptAttrs]="{ 'aria-label': v.table.labels().rowsPerPage }"
          [adaptAttrsTarget]="selectInput"
          [ngModel]="v.table.source().limit"
          [ngModelOptions]="{ standalone: true }"
          (ngModelChange)="v.table.setLimit($event)"
        >
          @for (size of v.table.pageSizeOptions(); track size) {
            <nz-option [nzValue]="size" [nzLabel]="size.toString()" />
          }
        </nz-select>
      </span>
      @if (v.table.source().total > 0) {
        <span>{{
          v.table.labels().showing({
            from: v.table.pagination().fromIndex,
            to: v.table.pagination().toIndex,
            total: v.table.source().total,
          })
        }}</span>
      }
      <div nz-flex nzAlign="center" [nzGap]="4">
        <span>{{
          v.table.labels().pageOf({
            page: v.table.pagination().safePage,
            total: v.table.pagination().totalPages,
          })
        }}</span>
        <nz-pagination
          [nzPageIndex]="v.table.pagination().safePage"
          [nzPageSize]="v.table.source().limit"
          [nzTotal]="v.table.source().total"
          [nzShowSizeChanger]="false"
          [nzShowQuickJumper]="false"
          [nzItemRender]="paginationItem"
          (nzPageIndexChange)="changePage($event)"
        />
        <ng-template #paginationItem let-kind let-page="page">
          @switch (kind) {
            @case ("page") {
              <button
                nz-button
                nzType="text"
                type="button"
                [attr.aria-label]="v.table.labels().goToPage(page)"
                [attr.aria-current]="
                  page === v.table.pagination().safePage ? 'page' : null
                "
              >
                <span>{{ page }}</span>
              </button>
            }
            @case ("prev") {
              <button
                nz-button
                nzType="text"
                type="button"
                [attr.aria-label]="v.table.labels().previousPage"
                [disabled]="v.table.pagination().safePage <= 1"
              >
                <svg [adaptIcon]="previousIcon()"></svg>
              </button>
            }
            @case ("next") {
              <button
                nz-button
                nzType="text"
                type="button"
                [attr.aria-label]="v.table.labels().nextPage"
                [disabled]="
                  v.table.pagination().safePage >=
                  v.table.pagination().totalPages
                "
              >
                <svg [adaptIcon]="nextIcon()"></svg>
              </button>
            }
            @default {
              <button
                nz-button
                nzType="text"
                type="button"
                [attr.aria-label]="v.table.labels().goToPage(jumpPage(kind))"
              >
                <span>…</span>
              </button>
            }
          }
        </ng-template>
      </div>
    </div>
  `,
})
export class AdaptPaginationFooter<TRow> {
  private readonly pageSize = viewChild<
    ElementRef<HTMLElement>,
    ElementRef<HTMLElement>
  >("pageSize", { read: ElementRef });
  protected readonly selectInput = (): HTMLElement | null =>
    this.pageSize()?.nativeElement.querySelector("input") ?? null;

  /** What the table renders from. */
  readonly view = input.required<TableView<TRow>>();

  private readonly kitLabels = inject(NzI18nService);
  private readonly baseLocale = this.kitLabels.getLocale();
  private localeRevision = 0;

  constructor() {
    effect(() => {
      const labels = this.view().table.labels();
      // NG-ZORRO deduplicates by locale id; custom labels can change within
      // the same language. This service is scoped to this footer only.
      this.kitLabels.setLocale({
        ...this.baseLocale,
        locale: `${this.baseLocale.locale}:pagination:${String(++this.localeRevision)}`,
        Pagination: {
          ...this.baseLocale.Pagination,
          items_per_page: labels.rowsPerPage,
          prev_page: labels.previousPage,
          next_page: labels.nextPage,
          prev_5: labels.goToPage(this.jumpPage("prev_5")),
          next_5: labels.goToPage(this.jumpPage("next_5")),
        },
      });
    });
  }

  /** NG-ZORRO also emits when a changed total clamps its controlled input. */
  protected changePage(page: number): void {
    const table = this.view().table;
    // A pending query can temporarily report total 0. Echoing that rendered
    // page back would cancel the requested page before its response arrives.
    // The source owns clamping once the host's total has settled.
    if (page !== table.pagination().safePage) table.setPage(page);
  }

  /** The kit's five-page jump still announces the binding's bounded destination. */
  protected jumpPage(kind: string): number {
    const pagination = this.view().table.pagination();
    return Math.min(
      pagination.totalPages,
      Math.max(1, pagination.safePage + (kind === "prev_5" ? -5 : 5))
    );
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
