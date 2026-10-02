/** Test queries for kit-owned widgets whose internal parts belong to NG-ZORRO. */
const KIT_SELECTORS: Readonly<Record<string, string>> = {
  checkbox: 'adapt-selection-checkbox:not([part]) input[type="checkbox"]',
  "sort-button":
    '[data-adapttable-part="header-cell"] button[aria-label]:not([data-adapttable-part])',
  "sort-index": "button[data-sort-index] > span:nth-of-type(2)",
  "sort-select": '[data-adapttable-part="toolbar"] > span > nz-select',
  "rows-per-page": "adapt-pagination-footer nz-select",
  pager: "adapt-pagination-footer > div > div[nz-flex]",
  "page-prev": "nz-pagination .ant-pagination-prev button",
  "page-next": "nz-pagination .ant-pagination-next button",
  "page-number": "nz-pagination .ant-pagination-item button",
  "page-ellipsis":
    "nz-pagination .ant-pagination-jump-prev button, nz-pagination .ant-pagination-jump-next button",
  "virtual-spacer":
    'tbody > tr[aria-hidden="true"], [data-adapttable-part="cards"] > li[aria-hidden="true"]',
  "expand-button": "adapt-expand-toggle button",
  "load-more": "adapt-table-region + div",
  "load-more-button": "adapt-table-region + div > button",
  "refresh-indicator": '[data-adapttable-part="root"] > nz-spin',
  "empty-clear": '[data-adapttable-part="empty"] button',
  "retry-button": "adapt-error-state button",
  "filters-button":
    'adapt-filter-popover > span > button, [data-adapttable-part="toolbar"] > button:not([data-adapttable-part])',
  "filters-icon": "adapt-filter-popover > span > button > span",
  "filters-count": "adapt-filter-popover nz-badge",
  "filters-anchor": "adapt-filter-popover > span",
  "filters-popover": ".ant-popover-inner-content > section",
  "filters-header":
    ".ant-popover-inner-content > section > header, .ant-drawer-title > header",
  "filters-title":
    ".ant-popover-inner-content > section > header > h3, .ant-drawer-title > header > h3",
  "filters-clear":
    ".ant-popover-inner-content > section > header > button, .ant-drawer-footer > footer > button:first-child",
  "filters-body":
    ".ant-popover-inner-content > section > div, .ant-drawer-body > div",
  "filters-panel": '.ant-drawer-content[role="dialog"]',
  "filters-backdrop": ".ant-drawer-mask",
  "filters-close": ".ant-drawer-title > header > button",
  "filters-footer": ".ant-drawer-footer > footer",
  "filters-done": ".ant-drawer-footer > footer > button:last-child",
  "column-menu": "adapt-column-menu > div",
  "column-menu-panel":
    '.ant-popover-inner-content > fieldset:has([data-adapttable-part="column-menu-search"])',
  "column-menu-header":
    ".ant-popover-inner-content > fieldset > div:first-child",
  "column-menu-title":
    ".ant-popover-inner-content > fieldset > div:first-child > span",
  "column-menu-grip":
    'adapt-column-menu-row > [data-adapttable-part="column-menu-item"] > button:first-of-type',
  "column-menu-visibility":
    'adapt-column-menu-row > [data-adapttable-part="column-menu-item"] > button:nth-of-type(2), adapt-column-menu-edge-row > [data-adapttable-part="column-menu-item"] > button:first-of-type',
  "column-menu-label": '[data-adapttable-part="column-menu-item"] > span',
  "column-menu-pin":
    'adapt-column-menu-row > [data-adapttable-part="column-menu-item"] > button:nth-of-type(3), adapt-column-menu-edge-row > [data-adapttable-part="column-menu-item"] > button:nth-of-type(2)',
  "column-menu-choice-label":
    '[data-adapttable-part="column-menu-choice"] > span',
  "column-menu-choice-select":
    '[data-adapttable-part="column-menu-choice"] > nz-select',
  "column-menu-separator": ".ant-popover-inner-content > fieldset > nz-divider",
  "column-menu-auto-size":
    ".ant-popover-inner-content > fieldset > button:nth-last-of-type(2)",
  "column-menu-reset":
    ".ant-popover-inner-content > fieldset > button:last-of-type",
  "views-menu": "adapt-saved-views-menu > div",
  "views-button": "adapt-saved-views-menu > div > button",
  "views-panel":
    ".ant-popover-inner-content > div:has(> nz-divider):has(input)",
  "views-row":
    ".ant-popover-inner-content > div > div:has(> button):not(:has(input))",
  "views-item":
    ".ant-popover-inner-content > div > div:not(:has(input)) > button:first-of-type",
  "views-delete":
    ".ant-popover-inner-content > div > div:not(:has(input)) > button:last-of-type",
  "views-divider": ".ant-popover-inner-content > div > nz-divider",
  "views-save-row": ".ant-popover-inner-content > div > div:has(input)",
  "views-input": ".ant-popover-inner-content > div > div > input",
  "views-save": ".ant-popover-inner-content > div > div:has(input) > button",

  loading: 'adapt-table-skeleton > div[aria-busy="true"]',
  "loading-table": "adapt-table-skeleton nz-table table",
  "loading-header-row": "adapt-table-skeleton nz-table thead > tr",
  "loading-header-cell": "adapt-table-skeleton nz-table thead > tr > th",
  "loading-row":
    "adapt-table-skeleton nz-table tbody > tr:has(nz-skeleton-element)",
  "loading-cell": "adapt-table-skeleton nz-table tbody > tr > td",
  "loading-cards": "adapt-table-skeleton > div > div:has(> nz-card)",
  "loading-card": "adapt-table-skeleton nz-card",
  "loading-line": "adapt-table-skeleton nz-skeleton-element",
  "assistant-examples-list":
    'ul[nz-menu][aria-label]:has([data-adapttable-part="assistant-examples-item"])',
  "export-spinner": '[data-adapttable-part="export-csv-button"] nz-spin',
  "filter-checkbox-group":
    "adapt-multi-select-filter-field > fieldset > div:last-child",
  "filter-options-loading":
    "adapt-multi-select-filter-field > fieldset > div:last-child > span",
};

/** Shared hooks stay exact; widget internals are queried through their actual kit DOM. */
export function kitSelector(name: string): string {
  return KIT_SELECTORS[name] ?? `[data-adapttable-part="${name}"]`;
}
