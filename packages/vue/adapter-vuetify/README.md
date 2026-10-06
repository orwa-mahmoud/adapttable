# @adapttable/vuetify

Vuetify controls for the headless AdaptTable Vue binding. AdaptTable owns query
state and requests changes from the host; Vuetify supplies Material Design
presentation. The adapter does not introduce a second table data engine.

## Vuetify setup

This adapter targets Vuetify 4.2.4 or later in the 4.x line and Vue 3.5. Install
and register the Vuetify plugin in the host application. Import Vuetify's base
styles once.

```ts
import { createApp } from "vue";
import { createVuetify } from "vuetify";
import { aliases, mdi } from "vuetify/iconsets/mdi-svg";
import "vuetify/styles";
import App from "./App.vue";

const vuetify = createVuetify({
  icons: { defaultSet: "mdi", aliases, sets: { mdi } },
});

createApp(App).use(vuetify).mount("#app");
```

The host owns its theme, icon set and locale configuration. SVG icons above are
included with Vuetify and do not require a font download. An existing Vuetify
application can keep its current plugin and settings.

For server rendering, create a fresh Vue app and Vuetify plugin for each request,
set `ssr: true` on `createVuetify`, and hydrate with the same configuration. Do
not share a Vuetify plugin instance between server requests.

## Control ownership

Buttons use `VBtn`. Checkboxes use `VCheckboxBtn` and its documented input slot,
retaining Vuetify's icons and interaction handling. Text and choice controls
use `VTextField`, `VTextarea` and `VSelect`. Their compound host owns the
`data-adapttable-part` marker and class hook; the actual input owns its ID,
accessible name, validation attributes and keyboard behavior. The documented
`controlRef` exposes that native focus target to AdaptTable without DOM queries
or mutations. This ownership is present in server-rendered HTML as well as the
hydrated application.

## Upstream references

- [Vuetify installation and SSR](https://vuetifyjs.com/en/getting-started/installation/)
- [VTextField API](https://vuetifyjs.com/en/api/v-text-field/)
- [VSelect API](https://vuetifyjs.com/en/api/v-select/)
- [VCheckboxBtn API and slots](https://vuetifyjs.com/en/api/v-checkbox-btn/)

Vuetify and AdaptTable are MIT licensed.
