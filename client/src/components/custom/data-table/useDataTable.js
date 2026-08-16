import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";

/**
 * Thin wrapper around useReactTable with two modes:
 *  - manualPagination: true  -> server-paginated (Products, Orders). Caller
 *    drives page/limit externally (e.g. via usePagination) and passes
 *    `pageCount`. No client-side pagination row model is attached.
 *  - manualPagination: false -> fully client-side (Users). tanstack table
 *    owns sorting/filtering/pagination state itself.
 */
export function useDataTable({
  columns,
  data,
  manualPagination = false,
  pageCount,
  sorting,
  onSortingChange,
  globalFilter,
  onGlobalFilterChange,
  columnFilters,
  onColumnFiltersChange,
  rowSelection,
  onRowSelectionChange,
  pagination,
  onPaginationChange,
  getRowId,
  globalFilterFn,
}) {
  return useReactTable({
    data,
    columns,
    manualPagination,
    manualFiltering: manualPagination,
    pageCount: manualPagination ? pageCount : undefined,
    ...(globalFilterFn ? { globalFilterFn } : {}),
    state: {
      sorting,
      globalFilter,
      columnFilters,
      rowSelection,
      ...(manualPagination ? {} : { pagination }),
    },
    getRowId,
    onSortingChange,
    onGlobalFilterChange,
    onColumnFiltersChange,
    onRowSelectionChange,
    ...(manualPagination ? {} : { onPaginationChange }),
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: manualPagination ? undefined : getFilteredRowModel(),
    getPaginationRowModel: manualPagination ? undefined : getPaginationRowModel(),
  });
}
