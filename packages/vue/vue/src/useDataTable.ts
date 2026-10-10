import { type ColumnInput } from '@adapttable/core'
import { fromStore } from './fromStore'

interface DataTableProps {
  columns?: ColumnInput<Record<string, unknown>>[]
  data?: Record<string, unknown>[]
  frontendSource?: {
    getSnapshot: () => { rows: unknown[] }
    subscribe: (cb: (state: any) => void) => { unsubscribe: () => void }
    addRows?: (rows: unknown[]) => void
  }
}

export function useDataTable(props: DataTableProps) {
  const data = props.data ?? []

  const frontendSource = props.frontendSource ?? {
    getSnapshot: () => ({ rows: data }),
    subscribe: () => ({ unsubscribe: () => {} }),
  }

  const rows = fromStore(
    () => frontendSource.getSnapshot().rows,
    (cb) => frontendSource.subscribe(cb)
  )

  const filters: unknown[] = []

  return {
    rows,
    filters,
  }
}
