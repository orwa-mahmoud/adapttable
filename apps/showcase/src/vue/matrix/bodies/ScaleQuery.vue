<script setup lang="ts">
/**
 * The query tier: the table's view becomes the params of an infinite query
 * composable over the people endpoint, and its pages the rows.
 */
import {
  type InfiniteQueryState,
  useFrontendData,
  useQuerySource,
} from "@adapttable/vue";
import { computed, type ShallowRef, shallowRef, watch } from "vue";

import {
  fetchPeople,
  peopleColumns,
  type PeoplePage,
  type PeopleParams,
  peopleRows,
  type Person,
  rowKey,
  TABLE_PRESENTATION,
} from "../data";
import { useShowcaseKit } from "../showcaseKit";

/** The people endpoint as an infinite query, keyed on the table's params. */
function usePeopleQuery(
  params: Readonly<ShallowRef<Partial<PeopleParams>>>
): InfiniteQueryState<PeoplePage> {
  const pages = shallowRef<PeoplePage[]>([]);
  const pageParams = shallowRef<number[]>([]);
  const fetching = shallowRef<"first" | "next" | null>(null);
  const error = shallowRef<Error | null>(null);
  let request = 0;
  const load = async (page: number, append: boolean): Promise<void> => {
    const ticket = ++request;
    fetching.value = append ? "next" : "first";
    try {
      const next = await fetchPeople({ ...params.value, page });
      if (ticket !== request) return;
      pages.value = append ? [...pages.value, next] : [next];
      pageParams.value = append ? [...pageParams.value, page] : [page];
      error.value = null;
    } catch (failure) {
      if (ticket === request)
        error.value =
          failure instanceof Error ? failure : new Error(String(failure));
    } finally {
      if (ticket === request) fetching.value = null;
    }
  };
  watch(params, (current) => load(current.page ?? 1, false), {
    immediate: true,
  });
  const nextPage = () => pages.value.at(-1)?.nextPage ?? null;
  return {
    data: () =>
      pages.value.length > 0
        ? { pages: pages.value, pageParams: pageParams.value }
        : undefined,
    isLoading: () => fetching.value === "first" && pages.value.length === 0,
    isFetching: () => fetching.value !== null,
    isFetchingNextPage: () => fetching.value === "next",
    hasNextPage: () => nextPage() !== null,
    error,
    fetchNextPage: () => {
      const page = nextPage();
      if (page !== null) return load(page, true);
    },
    refetch: () => load(params.value.page ?? 1, false),
  };
}

const kit = useShowcaseKit();
const columns = peopleColumns({ status: kit.status });
const alternate = shallowRef(false);
const query = useQuerySource<Person, PeopleParams, PeoplePage>({
  query: usePeopleQuery,
  urlSync: false,
  paginationMode: "paged",
  defaults: { limit: 10 },
  selectPage: (page) => ({
    rows: page.items,
    total: page.total,
    facets: page.facets,
  }),
});
const alternateSource = useFrontendData<Person>({
  data: peopleRows()
    .slice(0, 2)
    .map((row) => ({ ...row, name: `Alternate ${row.name}` })),
  columns,
  getRowId: rowKey,
  urlSync: false,
  defaults: { limit: 10 },
});
const source = computed(() =>
  alternate.value ? alternateSource.value : query.value
);
</script>

<template>
  <button
    type="button"
    class="seg__btn"
    :aria-pressed="alternate"
    @click="alternate = !alternate"
  >
    Use alternate data
  </button>
  <component
    :is="kit.DataTable"
    v-bind="TABLE_PRESENTATION"
    table-label="People"
    :url-sync="false"
    :source="source"
    :columns="columns"
    :row-key="rowKey"
  />
</template>
