import { type KitEnvironment, useLocaleLabels } from "@adapttable/vue/adapter";
import { computed, type ComputedRef } from "vue";

/**
 * Ant Design Vue keeps its `ConfigProvider` settings behind a private
 * injection key, so the table cannot read a provider's locale or size without
 * importing that internal. The table keeps the page direction, its own labels
 * and its own density; pass `locale`, `dir` and `density` to `DataTable` to
 * set them. Its colors, radius and fonts do follow the provider, through
 * `theme.useToken()`.
 */
export function useAntDesignVueLibrary(): ComputedRef<KitEnvironment> {
  return useLocaleLabels(computed((): KitEnvironment => ({})));
}
