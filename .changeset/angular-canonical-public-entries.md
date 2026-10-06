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
"@adapttable/ai-angular": patch
---

Separate the Angular binding's canonical public entries for the 0.5 release. Keep application hooks, column/rendering contracts, feature composition and `AdaptCellTemplate` at the root; move headless feature factories and feature-specific options to `@adapttable/angular/features`; move structural Chrome, kit models, rendering directives and controllers to `@adapttable/angular/adapter`. Preserve the specialized formula, pivot, router, sparkline and stream entries and the identity of existing declarations and DI tokens.

Update all nine native kits and Angular AI to consume the canonical entries. Existing native-kit feature imports remain unchanged. Custom renderers and adapters must update binding imports as described in `docs/angular/migrating-to-0-5.md`. Versions are released through Changesets; the binding remains pre-1.0.
