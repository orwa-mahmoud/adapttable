# @adapttable/naive-ui

Naive UI controls for the AdaptTable Vue binding. AdaptTable owns table state,
feature composition and semantic table structure. Naive UI supplies the visible
controls and their styling.

The adapter uses the following public Naive UI APIs:

- `NButton` renders action controls. Its `attrType` forwards native button types.
- `NCheckbox` exposes its focusable `role="checkbox"` root. Controlled `checked`
  and `indeterminate` values come from AdaptTable; one `update:checked` event
  requests one selection toggle.
- `NInput.inputProps` sends IDs, accessible names, part markers and classes to
  the actual input. Value changes use `update:value`.
- `NSelect` is a compound control. Its part marker and class are on the component
  host; `inputProps` supplies the accessible name of its filtering input. Its
  menu stays inside the table with `to=false`, including in fullscreen mode.

## Server rendering

Use Naive UI's CSS-render SSR integration on the server. Install
`@css-render/vue3-ssr` and collect the component styles after rendering:

```ts
import { setup } from "@css-render/vue3-ssr";
import { createSSRApp } from "vue";
import { renderToString } from "vue/server-renderer";

const app = createSSRApp(App);
const { collect } = setup(app);
const html = await renderToString(app);
const styles = collect();
```

Include `styles` in the document head and hydrate `html` with the matching
client app. This is required by Naive UI's floating controls as well as its
stylesheet collection.

## Component documentation

- [Naive UI button](https://www.naiveui.com/en-US/os-theme/components/button)
- [Naive UI checkbox](https://www.naiveui.com/en-US/os-theme/components/checkbox)
- [Naive UI input](https://www.naiveui.com/en-US/os-theme/components/input)
- [Naive UI select](https://www.naiveui.com/en-US/os-theme/components/select)
- [Naive UI license](https://github.com/tusen-ai/naive-ui/blob/main/LICENSE)

## License

MIT.
