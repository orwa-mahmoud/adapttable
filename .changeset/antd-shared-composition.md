---
"@adapttable/antd": patch
"@adapttable/react": minor
---

The Ant Design table draws through the binding's composition: the toolbar, bars, find, keyboard grid, export, context menu, side panel, footer and overlays are the ones every kit shares, and only the body stays antd's own `<Table>` and cards. A plain antd table loads 65.8 KiB instead of 71.0 (72.2 instead of 77.5 in total). antd's `virtualize` keeps windowing desktop rows through antd's virtual table. `@adapttable/react/adapter` exports `coreVirtualize` and `KEYED_WINDOW_RENDER` for a kit that brings its own `virtualize`.
