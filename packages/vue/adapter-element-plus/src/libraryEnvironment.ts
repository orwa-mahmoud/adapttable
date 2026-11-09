import { type KitEnvironment, useLocaleLabels } from "@adapttable/vue/adapter";
import { configProviderContextKey } from "element-plus";
import { computed, type ComputedRef, inject } from "vue";

function densityForSize(size: string | undefined): KitEnvironment["density"] {
  if (size === "small") return "compact";
  if (size === "large" || size === "default") return "comfortable";
  return undefined;
}

/**
 * Element Plus locale and component size.
 *
 * `ElConfigProvider` in 2.14 has no direction prop and no motion switch.
 * Without a provider, the table keeps the page direction, its own labels
 * and its own density. A language AdaptTable has no labels for keeps the
 * current copy.
 */
export function useElementPlusLibrary(): ComputedRef<KitEnvironment> {
  const config = inject(configProviderContextKey, undefined);
  return useLocaleLabels(
    computed(() => {
      const value = config?.value;
      if (!value) return {};
      const name = value.locale?.name;
      const locale = typeof name === "string" && name !== "" ? name : undefined;
      return {
        locale,
        density: densityForSize(value.size),
      };
    })
  );
}
