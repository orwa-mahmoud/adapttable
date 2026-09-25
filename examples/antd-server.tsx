import { DataTable, type TableQuery } from "@adapttable/antd";
import { filters } from "@adapttable/antd/filters";
import { ConfigProvider } from "antd";
import { useState } from "react";

interface Person {
  id: string;
  name: string;
  city: string;
}

/**
 * Server data WITHOUT a query library: the table owns the query state (URL,
 * filters, debounce) and emits ONE consolidated `onQueryChange` per real
 * change — including the initial mount with URL-restored values. Forward
 * the `signal` to `fetch` and superseded (out-of-order) responses are
 * aborted for you. Your only job: call the API, hand back rows + total.
 */
export function AntdServerExample() {
  const [rows, setRows] = useState<Person[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  // Which request the rows on screen answer. Handed back as `responseKey`,
  // it is what lets a column's `formatAggregate` be told the operation the
  // numbers were computed with — including when a later fetch is aborted.
  const [answered, setAnswered] = useState<string>();

  async function load(query: TableQuery, signal: AbortSignal, key: string) {
    setLoading(true);
    try {
      const qs = new URLSearchParams({
        page: String(query.page),
        limit: String(query.limit),
        ...(query.search ? { q: query.search } : {}),
        // Sorting is server-owned in this tier, so forward the requested
        // column and direction for the API to apply.
        ...(query.sortBy ? { sortBy: query.sortBy } : {}),
        ...(query.sortDir ? { sortDir: query.sortDir } : {}),
        ...(typeof query.filters.city === "string"
          ? { city: query.filters.city }
          : {}),
      });
      const res = await fetch(`/api/people?${qs.toString()}`, { signal });
      const page = (await res.json()) as { items: Person[]; total: number };
      setRows(page.items);
      setTotal(page.total);
      setAnswered(key);
      setLoading(false);
    } catch (error) {
      // Aborted requests are expected (a newer query superseded this one).
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        setLoading(false);
        throw error;
      }
    }
  }

  return (
    <ConfigProvider>
      <DataTable
        data={rows}
        total={total}
        loading={loading}
        responseKey={answered}
        onQueryChange={(query, { signal, key }) =>
          void load(query, signal, key)
        }
        columns={[
          { key: "name", sortable: true },
          {
            key: "city",
            // The same declarative filter drives the widget, chip and URL —
            // the VALUE arrives in `query.filters.city` for your API.
            filter: {
              type: "select",
              options: [
                { value: "Dubai", label: "Dubai" },
                { value: "Riyadh", label: "Riyadh" },
              ],
            },
          },
        ]}
        rowKey={(r) => r.id}
        // Composes the Filters control that column `filter` declarations use.
        features={[filters([])]}
      />
    </ConfigProvider>
  );
}
