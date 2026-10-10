---
"@adapttable/angular": minor
"@adapttable/angular-aria": patch
"@adapttable/angular-cdk": patch
"@adapttable/angular-unstyled": patch
"@adapttable/angular-material": patch
"@adapttable/ng-bootstrap": patch
"@adapttable/ng-zorro": patch
"@adapttable/ngx-bootstrap": patch
"@adapttable/spartan": patch
"@adapttable/taiga-ui": patch
---

Keep Angular native filter cards and toolbar menus within the viewport on phones
and in RTL layouts. Material filters can flip above a low trigger, retain native
placement on rendered-size changes and scrollbar gutters, and scroll their body
while headers/actions remain visible. The optional `injectPopoverSpace`
`allowAbove` getter preserves existing below-only defaults.

Material Clear all labels fit a text button; resize handles keep their 48px
native targets inside the header. Aria, CDK and Unstyled menus cap/flip within the
viewport, and Taiga UI menus preserve readable name fields and a viewport gutter.
NG-ZORRO, ngx-bootstrap and Taiga UI restore name-field focus after saving.
Palettes handle Escape and Tab from command buttons; rename focus work retires
with its owner. Spartan header filters follow live inherited writing direction.
