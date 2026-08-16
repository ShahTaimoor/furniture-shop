import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ROW_OPTIONS = [10, 20, 30, 50];

/**
 * Two modes:
 *  - server: driven by an existing `usePagination` instance (Products,
 *    Orders) — pass `pager` (the object returned by usePagination) plus
 *    `limitOptions`/`onLimitChange` if rows-per-page should be adjustable.
 *  - client: driven directly by the tanstack `table` instance (Users).
 */
export function DataTablePagination({ mode = "client", table, pager, rowsPerPageOptions = ROW_OPTIONS, selectedCount }) {
  if (mode === "server" && pager) {
    const { currentPage, totalPages, hasNextPage, hasPreviousPage, goToNextPage, goToPreviousPage, goToFirstPage, goToLastPage, startItem, endItem, totalItems } = pager;

    return (
      <div className="flex flex-wrap items-center justify-between gap-4 px-1 py-2">
        <div className="text-sm text-muted-foreground">
          {selectedCount > 0 ? (
            <span>{selectedCount} row(s) selected</span>
          ) : totalItems > 0 ? (
            <span>Showing {startItem}-{endItem} of {totalItems}</span>
          ) : (
            <span>No results</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            Page {totalPages === 0 ? 0 : currentPage} of {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={goToFirstPage} disabled={!hasPreviousPage}>
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={goToPreviousPage} disabled={!hasPreviousPage}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={goToNextPage} disabled={!hasNextPage}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={goToLastPage} disabled={!hasNextPage}>
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // client mode
  const pageIndex = table.getState().pagination.pageIndex;
  const pageSize = table.getState().pagination.pageSize;
  const pageCount = table.getPageCount();
  const selected = table.getFilteredSelectedRowModel().rows.length;

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 px-1 py-2">
      <div className="text-sm text-muted-foreground">
        {selected > 0 ? (
          <span>{selected} row(s) selected</span>
        ) : (
          <span>{table.getFilteredRowModel().rows.length} row(s)</span>
        )}
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Rows per page</span>
          <Select value={`${pageSize}`} onValueChange={(value) => table.setPageSize(Number(value))}>
            <SelectTrigger size="sm" className="w-[70px]">
              <SelectValue placeholder={pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              {rowsPerPageOptions.map((size) => (
                <SelectItem key={size} value={`${size}`}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <span className="text-sm text-muted-foreground">
          Page {pageCount === 0 ? 0 : pageIndex + 1} of {pageCount}
        </span>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage()}>
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => table.setPageIndex(pageCount - 1)} disabled={!table.getCanNextPage()}>
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
