---
"@adapttable/angular": patch
"@adapttable/angular-aria": patch
"@adapttable/angular-cdk": patch
"@adapttable/angular-material": patch
"@adapttable/angular-unstyled": patch
"@adapttable/ng-bootstrap": patch
"@adapttable/ng-zorro": patch
"@adapttable/ngx-bootstrap": patch
"@adapttable/spartan": patch
"@adapttable/taiga-ui": patch
---

Cell editors hand their focus target to the table after they render and again whenever it changes, and the editor layer and ngx-bootstrap's pager links attach their browser listeners only in the browser.
