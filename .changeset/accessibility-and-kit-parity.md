---
"@adapttable/angular": patch
"@adapttable/angular-aria": patch
"@adapttable/angular-cdk": patch
"@adapttable/angular-material": patch
"@adapttable/angular-unstyled": patch
"@adapttable/antd": patch
"@adapttable/base-ui": patch
"@adapttable/chakra": patch
"@adapttable/core": minor
"@adapttable/mantine": patch
"@adapttable/mui": patch
"@adapttable/ng-bootstrap": patch
"@adapttable/ng-zorro": patch
"@adapttable/ngx-bootstrap": patch
"@adapttable/radix": patch
"@adapttable/react": minor
"@adapttable/reka-ui": patch
"@adapttable/shadcn": patch
"@adapttable/shadcn-vue": patch
"@adapttable/spartan": patch
"@adapttable/taiga-ui": patch
"@adapttable/unstyled": minor
"@adapttable/vue": minor
---

Every kit exposes the same structure and accessibility.

- Tree tables are a `treegrid` with its `aria-rowcount`, and each row names its level, expanded state and position (`treeTableAria(entryCount)` returns the pair) in every kit.
- Busy buttons keep their accessible name and report `aria-busy` (Chakra, MUI); a mixed checkbox reports the mixed state (Chakra); a rejected text value sets `aria-invalid` (Ant Design); a popover opening a menu says `aria-haspopup="menu"` (Mantine); Base UI's menu divider carries its part and data attributes.
- A header's caption carries `data-adapttable-part="header-caption-control"` in every kit, styled through `classNames.headerCaptionControl` in React unstyled and the Vue kits; the virtualized spacer row and card carry `virtual-spacer` in every kit.
- `watchOverlayDismiss` and `usePointerDismiss` take `OverlayDismissOptions`; an Escape an input method is composing with, or that an earlier handler took, no longer closes an overlay. The MUI, Mantine and Ant Design filters popovers ignore the press that opened them, close on touch, and hand focus back to the Filters button after Escape.
- Ctrl/Cmd+F opens Ant Design's find bar only when `findInTable` is set; Spartan's fill handle is outside the tab order; Reka UI's and shadcn-vue's `contextMenu()` take `true` or `false`; ng-zorro's saved-views menu types its direction as `Direction`.
- The columns menu has one accessible name in the React kits.
- The loading placeholder exposes `loading` with `loading-table` or `loading-cards` in MUI, Chakra, Ant Design, Radix, Base UI and Mantine.
- Closing a dialog or the filters drawer returns focus to the control that opened it in every Angular kit, including after the browser drops focus onto the page; `watchClickedOpener` on `@adapttable/core/binding` and `@adapttable/angular/adapter` records that control.
- The Filters button carries `data-adapttable-part="filters-button"` and `data-active` while open in every kit.
- Escape closes a native row actions menu and returns focus to its trigger in the React unstyled, Angular unstyled and Angular Aria kits, as it does in Vue.
