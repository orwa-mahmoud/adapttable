# @adapttable/ai-angular

## 0.1.2

### Patch Changes

- 7e33aa2: Organize the Angular 0.5 binding around canonical public entries: application
  hooks, column/rendering contracts, composition and `AdaptCellTemplate` at the
  root; headless factories/options under `/features`; structural Chrome, kit models,
  directives and controllers under `/adapter`. Specialized formula, pivot, router,
  sparkline and stream entries retain their declaration and DI-token identities.
  
  All nine native kits and Angular AI consume those entries; kit feature imports
  remain unchanged. Custom renderers/adapters must update binding imports using
  the migration guide. Each entry re-exports the public types its signatures return.
- Updated dependencies [7e33aa2]
- Updated dependencies [f7f62c6]
- Updated dependencies [f81d849]
- Updated dependencies [32e1255]
- Updated dependencies [0120bd4]
- Updated dependencies [aebbd39]
  - @adapttable/angular@0.5.0
  - @adapttable/ai@0.6.0

## 0.1.1

### Patch Changes

- Updated dependencies [089d5d5]
- Updated dependencies [0a9cb40]
- Updated dependencies [8d1e749]
  - @adapttable/angular@0.4.0
  - @adapttable/ai@0.5.2

## 0.1.0

### Minor Changes

- 42a4349: Prepare the first public release of `tableAgent`, `injectTableAssistant` and `injectSpeechInput` over the neutral AI controllers.
  
  Connect mounted Angular tables to approvals, conversation state, speech and the existing HTTP, JSON tools, OpenAI, MCP/MCP Apps, WebMCP, AG-UI and AI SDK integrations. Retained sessions follow replaced sources and editing callbacks, revoke removed write capabilities and disconnect cleanly when the table is destroyed.

### Patch Changes

- Updated dependencies [42a4349]
- Updated dependencies [6fd7108]
  - @adapttable/ai@0.5.1
  - @adapttable/angular@0.3.0
