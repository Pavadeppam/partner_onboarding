import React from 'react';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
  SortingState,
  getPaginationRowModel,
  getFilteredRowModel,
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DynamicTableProps {
  columns: any[];
  data: any[];
  searchPlaceholder?: string;
  searchKey?: string;
  renderExpandedRow?: (row: any) => React.ReactNode;
  groupBy?: string;
  infiniteScroll?: boolean;
  onRowClick?: (row: any) => void;
  defaultCollapsed?: boolean;
}

export function DynamicTable({
  columns,
  data,
  searchPlaceholder = "Search...",
  searchKey,
  renderExpandedRow,
  groupBy,
  infiniteScroll = false,
  onRowClick,
  defaultCollapsed = false,
}: DynamicTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = React.useState('');
  const [collapsedGroups, setCollapsedGroups] = React.useState<Set<string>>(new Set());

  // Handle sorting: if groupBy is active, always sort by group first
  const tableSorting = React.useMemo(() => {
    if (!groupBy) return sorting;
    
    // Ensure groupBy is always the first sort criteria
    const groupSort = { id: groupBy, desc: false };
    const otherSorts = sorting.filter(s => s.id !== groupBy);
    return [groupSort, ...otherSorts];
  }, [sorting, groupBy]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: infiniteScroll ? undefined : getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting: tableSorting,
      globalFilter,
    },
    onGlobalFilterChange: setGlobalFilter,
  });

  const toggleGroup = (group: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  };

  let lastGroupValue: string | null = null;

  return (
    <div className="space-y-4 flex flex-col h-full">
      {searchKey && (
        <div className="flex items-center shrink-0">
          <Input
            placeholder={searchPlaceholder}
            value={globalFilter ?? ""}
            onChange={(event) => setGlobalFilter(event.target.value)}
            className="max-w-sm"
          />
        </div>
      )}
      <div className="rounded-md border border-slate-200 bg-white overflow-hidden flex flex-col flex-1">
        <div className="overflow-auto flex-1">
          <Table className="relative">
            <TableHeader className="bg-slate-50 sticky top-0 z-10 shadow-sm">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} className="text-slate-600 font-semibold bg-slate-50">
                      {header.isPlaceholder ? null : (
                        <div
                          className={cn(
                            "flex items-center gap-2",
                            header.column.getCanSort() ? "cursor-pointer select-none" : ""
                          )}
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                          {header.column.getCanSort() && (
                            <div className="shrink-0">
                              {header.column.getIsSorted() === "asc" ? (
                                <ChevronUp className="h-3.5 w-3.5" />
                              ) : header.column.getIsSorted() === "desc" ? (
                                <ChevronDown className="h-3.5 w-3.5" />
                              ) : (
                                <ChevronsUpDown className="h-3.5 w-3.5 text-slate-400" />
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => {
                  const currentGroupValue = groupBy ? row.original[groupBy] : null;
                  const isNewGroup = groupBy && currentGroupValue !== lastGroupValue;
                  if (isNewGroup) {
                    lastGroupValue = currentGroupValue;
                  }

                  const isCollapsed = currentGroupValue && collapsedGroups.has(currentGroupValue);
                  const groupRows = groupBy ? data.filter(d => d[groupBy] === currentGroupValue).length : 0;

                  return (
                    <React.Fragment key={row.id}>
                      {isNewGroup && (
                        <TableRow 
                          className="bg-slate-50/80 hover:bg-slate-100 sticky top-[40px] z-[5] shadow-sm cursor-pointer transition-colors border-y border-slate-200"
                          onClick={() => toggleGroup(currentGroupValue!)}
                        >
                          <TableCell colSpan={columns.length} className="py-2 px-4 bg-slate-50/90 backdrop-blur-sm">
                            <div className="flex items-center justify-between w-full">
                              <div className="flex items-center gap-2">
                                {isCollapsed ? (
                                  <ChevronRight className="h-4 w-4 text-slate-400" />
                                ) : (
                                  <ChevronDown className="h-4 w-4 text-slate-400" />
                                )}
                                <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-slate-600">
                                  {currentGroupValue}
                                </span>
                              </div>
                              <Badge variant="outline" className="text-[9px] h-4 bg-white/50 border-slate-200 text-slate-400 font-bold px-1.5">
                                {groupRows} ATTRIBUTES
                              </Badge>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                      {!isCollapsed && (
                        <TableRow
                          data-state={row.getIsSelected() && "selected"}
                          className={cn(
                            "hover:bg-slate-50 transition-colors",
                            onRowClick ? "cursor-pointer" : ""
                          )}
                          onClick={() => onRowClick?.(row.original)}
                        >
                          {row.getVisibleCells().map((cell) => (
                            <TableCell key={cell.id}>
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </TableCell>
                          ))}
                        </TableRow>
                      )}
                      {!isCollapsed && row.getIsExpanded() && renderExpandedRow && (
                        <TableRow>
                          <TableCell colSpan={columns.length} className="bg-slate-50 p-4">
                            {renderExpandedRow(row.original)}
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    No results.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      {!infiniteScroll && (
        <div className="flex items-center justify-end space-x-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
