import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
} from '@tanstack/react-table';

export type { ColumnDef };

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  isLoading?: boolean;
  emptyMessage?: string;
  pageSize?: number;
  serverPagination?: {
    pageIndex: number;
    pageSize: number;
    pageCount: number;
    total: number;
    setPagination: (updater: any) => void;
  };
  onRowClick?: (row: TData) => void;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  isLoading = false,
  emptyMessage = 'No data available',
  pageSize = 30,
  serverPagination,
  onRowClick,
}: DataTableProps<TData, TValue>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: serverPagination ? undefined : getPaginationRowModel(),
    manualPagination: !!serverPagination,
    pageCount: serverPagination?.pageCount ?? -1,
    onPaginationChange: serverPagination?.setPagination,
    state: serverPagination ? {
      pagination: {
        pageIndex: serverPagination.pageIndex,
        pageSize: serverPagination.pageSize,
      }
    } : undefined,
    initialState: !serverPagination ? {
      pagination: {
        pageSize,
      },
    } : undefined,
  });

  return (
    <div className="glass-panel" style={{ padding: '0', display: 'flex', flexDirection: 'column' }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-tertiary)' }}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    style={{
                      padding: '12px 16px',
                      fontWeight: 600,
                      color: 'var(--text-secondary)',
                      fontSize: '13px',
                      letterSpacing: '0.02em',
                    }}
                  >
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={columns.length} style={{ padding: 'var(--spacing-6)', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  Loading...
                </td>
              </tr>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                  style={{
                    borderBottom: '1px solid var(--border-color)',
                    transition: 'background 0.2s',
                    cursor: onRowClick ? 'pointer' : 'default',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} style={{ padding: '12px 16px', verticalAlign: 'middle', fontSize: '13px', color: 'var(--text-primary)' }}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} style={{ padding: 'var(--spacing-6)', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {table.getPageCount() > 1 && (
        <div style={{ 
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
          padding: '16px', borderTop: '1px solid var(--border-color)',
          flexWrap: 'wrap', gap: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{' '}
              {Math.min((table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize, serverPagination ? serverPagination.total : (data?.length || 0))} of{' '}
              {serverPagination ? serverPagination.total : (data?.length || 0)} entries
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
              <span>Rows per page:</span>
              <select 
                value={table.getState().pagination.pageSize}
                onChange={e => table.setPageSize(Number(e.target.value))}
                style={{ 
                  background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', 
                  color: 'var(--text-primary)', borderRadius: '4px', padding: '4px' 
                }}
              >
                {[10, 30, 50, 100].map(pageSize => (
                  <option key={pageSize} value={pageSize}>
                    {pageSize}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              style={{
                padding: '6px 12px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)',
                borderRadius: '4px', color: 'var(--text-primary)', cursor: table.getCanPreviousPage() ? 'pointer' : 'not-allowed',
                opacity: table.getCanPreviousPage() ? 1 : 0.5
              }}
            >
              Previous
            </button>
            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              style={{
                padding: '6px 12px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)',
                borderRadius: '4px', color: 'var(--text-primary)', cursor: table.getCanNextPage() ? 'pointer' : 'not-allowed',
                opacity: table.getCanNextPage() ? 1 : 0.5
              }}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
