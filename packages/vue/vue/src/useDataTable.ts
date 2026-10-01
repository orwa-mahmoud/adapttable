interface DataTableProps {
  columns?: any[];
  data?: any[];
}

export function useDataTable(props: DataTableProps) {
  const rows = props.data || [];
  const filters: any[] = [];

  return {
    rows,
    filters,
  };
}
