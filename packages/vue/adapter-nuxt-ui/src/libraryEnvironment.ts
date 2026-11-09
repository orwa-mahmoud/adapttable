import { type KitEnvironment, useLocaleLabels } from "@adapttable/vue/adapter";
import {
  computed,
  type ComputedRef,
  inject,
  type InjectionKey,
  type Ref,
  shallowRef,
} from "vue";

interface NuxtLocale {
  readonly code?: string;
  readonly dir?: "ltr" | "rtl";
}

/**
 * The key `UApp` provides its locale under: Nuxt UI registers it as a global
 * symbol, so it resolves the same under every module condition, `require`
 * included, without loading Nuxt UI's composables.
 */
const NUXT_LOCALE = Symbol.for("nuxt-ui.locale-context") as InjectionKey<
  Ref<NuxtLocale | undefined>
>;

/** Keeps a missing `UApp` from warning. An empty app also leaves this unset. */
const ABSENT = shallowRef<NuxtLocale | undefined>(undefined);

/**
 * Nuxt UI `UApp` locale.
 *
 * A locale or an explicit `dir` wins over the page. An app that sets neither
 * stays unset, so a right-to-left page still reaches the table. Nuxt UI has
 * no app-wide size or motion switch. A language AdaptTable has no labels for
 * keeps the current copy.
 */
export function useNuxtLibrary(): ComputedRef<KitEnvironment> {
  const provided = inject(NUXT_LOCALE, ABSENT);
  return useLocaleLabels(
    computed(() => {
      const locale = provided.value;
      if (!locale) return {};
      const tag =
        typeof locale.code === "string" && locale.code !== ""
          ? locale.code
          : undefined;
      return {
        dir:
          locale.dir === "rtl" || locale.dir === "ltr" ? locale.dir : undefined,
        locale: tag,
      };
    })
  );
}
