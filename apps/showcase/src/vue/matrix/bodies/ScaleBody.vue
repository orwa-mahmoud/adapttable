<script setup lang="ts">
/** Scale: fifty thousand rows, windowed, in a scroll box — or served. */
import { scaleParams } from "../../../shared/scaleScenario";
import ScaleFrontend from "./ScaleFrontend.vue";
import ScaleQuery from "./ScaleQuery.vue";
import ScaleServer from "./ScaleServer.vue";

/** Where the page's rows come from: `?tier=server` or `?tier=query`. */
const requested = new URLSearchParams(window.location.search).get("tier");
const tier =
  requested === "server" || requested === "query" ? requested : "frontend";
const total = scaleParams().total.toLocaleString("en-US");
const hint = {
  frontend: `${total} rows — only the ones in view render`,
  server: `${total} rows on the server — each slice fetched as you scroll`,
  query: "Every page comes from an infinite query composable",
}[tier];
</script>

<template>
  <div class="mx-demo">
    <div class="hint-row">
      <span class="hint">{{ hint }}</span>
    </div>
    <div class="mx-demo__body">
      <ScaleServer v-if="tier === 'server'" />
      <ScaleQuery v-else-if="tier === 'query'" />
      <ScaleFrontend v-else />
    </div>
  </div>
</template>
