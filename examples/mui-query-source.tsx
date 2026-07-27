import { type ColumnDef, DataTable, useQuerySource } from "@adapttable/mui";
import {
  QueryClient,
  QueryClientProvider,
  useInfiniteQuery,
} from "@tanstack/react-query";

interface Person {
  id: string;
  name: string;
  city: string;
}

interface Page {
  items: Person[];
  total: number;
  nextPage: number | null;
}

const columns: ColumnDef<Person>[] = [
  { key: "name", sortable: true },
  { key: "city" },
];

/** Replace with your real API call. */
async function fetchPeople(params: {
  page?: number;
  limit?: number;
  search?: string;
}): Promise<Page> {
  const qs = new URLSearchParams({
    page: String(params.page ?? 1),
    limit: String(params.limit ?? 25),
    ...(params.search ? { q: params.search } : {}),
  });
  const res = await fetch(`/api/people?${qs.toString()}`);
  return (await res.json()) as Page;
}

function usePeopleQuery(params: {
  page?: number;
  limit?: number;
  search?: string;
}) {
  return useInfiniteQuery({
    queryKey: ["people", params],
    queryFn: ({ pageParam }) => fetchPeople({ ...params, page: pageParam }),
    initialPageParam: params.page ?? 1,
    getNextPageParam: (last) => last.nextPage ?? undefined,
  });
}

const queryClient = new QueryClient();

/**
 * Server data, query-library tier: `useQuerySource` + TanStack Query gives
 * caching, infinite mode and prefetching. No query library? See
 * `mantine-server.tsx` — `onQueryChange` needs nothing but `fetch`.
 */
export function MuiBackendExample() {
  return (
    <QueryClientProvider client={queryClient}>
      <Inner />
    </QueryClientProvider>
  );
}

function Inner() {
  const source = useQuerySource<
    Person,
    { page?: number; limit?: number; search?: string },
    Page
  >({
    usePaginatedQuery: usePeopleQuery,
    selectPage: (page) => ({ rows: page.items, total: page.total }),
  });
  return <DataTable source={source} columns={columns} rowKey={(r) => r.id} />;
}
