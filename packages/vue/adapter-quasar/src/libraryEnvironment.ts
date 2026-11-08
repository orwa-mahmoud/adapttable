import { type KitEnvironment, useLocaleLabels } from "@adapttable/vue/adapter";
import { useQuasar } from "quasar";
import { computed, type ComputedRef } from "vue";

/** Quasar 2.34 ships `useQuasar` at runtime and omits it from the type barrel. */
declare module "quasar" {
  export function useQuasar(): {
    lang: { isoName: string; rtl?: boolean };
  };
}

const DEFAULT_ISO = "en-US";

/**
 * Quasar language pack.
 *
 * `$q.lang` defaults to `en-US` and left to right. That default stays unset
 * so a right-to-left page still reaches the table. Quasar has no app-wide
 * size or motion switch. A language AdaptTable has no labels for keeps the
 * current copy.
 */
export function useQuasarLibrary(): ComputedRef<KitEnvironment> {
  const quasar = useQuasar();
  return useLocaleLabels(
    computed(() => {
      const iso = quasar.lang.isoName;
      const rtl = quasar.lang.rtl === true;
      if (iso === DEFAULT_ISO && !rtl) return {};
      return {
        dir: rtl ? "rtl" : "ltr",
        locale: iso,
      };
    })
  );
}
