import type { Kit, KitInfo } from "../detect";
import {
  columnRows,
  type FrameworkTemplate,
  peopleRows,
  personInterface,
  type ScaffoldFile,
} from "../starter";

/** The application root a kit's components render inside, by kit. */
const ROOTS: Partial<Record<Kit, { name: string; import: string }>> = {
  vuetify: {
    name: "VApp",
    import: 'import { VApp } from "vuetify/components/VApp";\n',
  },
  "nuxt-ui": {
    name: "UApp",
    import: 'import UApp from "@nuxt/ui/components/App.vue";\n',
  },
};

/** Native Vue SFC; all state stays in the host's data and feature declarations. */
function component(info: KitInfo): string {
  const root = ROOTS[info.kit]?.name;
  const rootImport = ROOTS[info.kit]?.import ?? "";
  return `<script setup lang="ts">
import { DataTable } from "${info.adapter}";
import { filters } from "${info.adapter}/filters";
import type { ColumnDef } from "@adapttable/vue";
${rootImport}
${personInterface()}
const people: Person[] = [
${peopleRows("  ")}];
const columns: ColumnDef<Person>[] = [
${columnRows("  ", "row")}];
const rowKey = (row: Person) => row.id;
const features = [filters<Person>([{ key: "name", type: "text", label: "Name" }])];
</script>

<template>
${root ? `  <${root} class="isolate">\n` : ""}  <DataTable :data="people" :columns="columns" :row-key="rowKey" :features="features" />
${root ? `  </${root}>\n` : ""}</template>
`;
}

/** The global styles, plugin import and plugin install a kit needs, by kit. */
const KIT_SETUP: Partial<
  Record<Kit, { style: string; imports: string; install: string }>
> = {
  "element-plus": {
    style: 'import "element-plus/dist/index.css";\n',
    imports: "",
    install: "  void app;",
  },
  vuetify: {
    style: 'import "vuetify/styles";\n',
    imports:
      'import { createVuetify } from "vuetify/framework";\nimport { aliases, mdi } from "vuetify/iconsets/mdi-svg";\n',
    install:
      '  app.use(createVuetify({ icons: { defaultSet: "mdi", aliases, sets: { mdi } } }));',
  },
  quasar: {
    style: 'import "quasar/dist/quasar.css";\n',
    imports: 'import { Quasar } from "quasar";\n',
    install: "  app.use(Quasar, { config: {} });",
  },
  "nuxt-ui": {
    style: 'import "./adapttable.css";\n',
    imports: 'import ui from "@nuxt/ui/vue-plugin";\n',
    install: "  app.use(ui);",
  },
};

/** Host-owned registration and global kit styles; existing host files are untouched. */
function installer(info: KitInfo): string {
  const setup = KIT_SETUP[info.kit];
  const styles =
    info.kit === "vue-unstyled" || info.kit === "nuxt-ui"
      ? ""
      : `import "${info.adapter}/styles.css";\n`;
  const install =
    setup?.install ??
    "  // This kit needs no application plugin. Keep host theme/locale providers as needed.\n  void app;";
  return `${setup?.style ?? ""}${styles}${setup?.imports ?? ""}import type { App } from "vue";

/** Call once on your app, before mounting the generated PeopleTable. */
export function installAdaptTable(app: App): void {
${install}
}
`;
}

/** The Vite build plugins a kit needs, by kit. */
const VITE_FILES: Partial<Record<Kit, readonly ScaffoldFile[]>> = {
  "nuxt-ui": [
    {
      path: "src/adapttable.css",
      contents:
        '@import "tailwindcss";\n@import "@nuxt/ui";\n@import "@adapttable/nuxt-ui/styles.css";\n',
    },
    {
      path: "adapttable.vite.ts",
      contents:
        'import ui from "@nuxt/ui/vite";\nimport vue from "@vitejs/plugin-vue";\n\n// Router-less starter. Enable router integration if your host uses Vue Router.\nexport const adaptTableViteConfig = { plugins: [vue(), ui({ router: false, prose: true })], resolve: { dedupe: ["vue", "@nuxt/ui"] } };\n',
    },
  ],
  quasar: [
    {
      path: "adapttable.vite.ts",
      contents:
        'import { quasar, transformAssetUrls } from "@quasar/vite-plugin";\nimport vue from "@vitejs/plugin-vue";\n\nexport const adaptTableViteConfig = { plugins: [vue({ template: { transformAssetUrls } }), quasar()], resolve: { dedupe: ["vue"] } };\n',
    },
  ],
};

/** The Vue starter: one SFC plus the plain Vue/Vite setup its kit needs. */
export const VUE_TEMPLATE: FrameworkTemplate = {
  label: "Vue",
  bindings: ["@adapttable/vue", "vue@^3.5.18"],
  keepsHostPeers: true,
  component,
  componentPath: "src/PeopleTable.vue",
  setupFiles: (info) => [
    { path: "src/adapttable.ts", contents: installer(info) },
    ...(VITE_FILES[info.kit] ?? []),
  ],
  hostSetup: (info) => [
    '3. Import PeopleTable from "./PeopleTable.vue" and render <PeopleTable /> in your Vue component.',
    '   In src/main.ts: import { installAdaptTable } from "./adapttable"; call installAdaptTable(app) before app.mount().',
    ...(VITE_FILES[info.kit]
      ? [
          '   Merge adaptTableViteConfig from "./adapttable.vite.ts" into vite.config.ts with Vite mergeConfig. This includes the Vue compiler; do not register it twice.',
        ]
      : []),
    `   Provider and style setup: src/adapttable.ts. Kit guide: https://adapttable.orwamahmoud.com/vue/${info.kit === "vue-unstyled" ? "getting-started" : info.kit}/`,
  ],
};
