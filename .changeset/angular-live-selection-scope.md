---
"@adapttable/angular": minor
---

Let Angular row selection follow live source capabilities and reset keys while
preserving host-controlled IDs and selection across paging/sorting. Current
cell-range callbacks receive changes; attaching a callback observes the current
range without replaying unchanged ranges to replacements.

Virtualized bodies react when `maxHeight` changes between element and page
scrolling without replacing the table or feature runtime. Live direction updates
reach command palettes and compact headers. Browser-only controls and overlays
respect the Angular server platform, including window-like server globals.
Retired row/bulk controls and delayed confirmations cannot start host writes or
clear a replacement selection. Side-panel declarations retain logical start/end.
