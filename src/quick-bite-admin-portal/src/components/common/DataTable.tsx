import React, { useState } from 'react';
import { Search, Filter, Plus, Loader2, Inbox } from 'lucide-react';
import Pagination from './Pagination';

export interface Column<T> {
  header: string;
  accessorKey?: keyof T;
  cell?: (row: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  searchPlaceholder?: string;
  onSearchChange?: (term: string) => void;
  filterOptions?: { label: string; value: string }[];
  onFilterChange?: (value: string) => void;
  onAddNew?: () => void;
  addNewLabel?: string;
  isLoading?: boolean;
  emptyText?: string;
  pageSize?: number;
}

export function DataTable<T extends { id?: string | number }>({
  data,
  columns,
  searchPlaceholder = 'Tìm kiếm...',
  filterOptions,
  onFilterChange,
  onAddNew,
  addNewLabel = 'Thêm mới',
  isLoading = false,
  emptyText = 'Không tìm thấy dữ liệu phù hợp',
  pageSize = 8,
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Client-side search & filter fallback if callbacks not provided
  const filteredData = data.filter((row) => {
    // Check filter
    if (selectedFilter) {
      const isFilterMatch = Object.values(row).some(
        (val) => String(val).toLowerCase() === selectedFilter.toLowerCase()
      );
      if (!isFilterMatch) return false;
    }
    // Check search term
    if (!searchTerm.trim()) return true;
    return Object.values(row).some((val) =>
      String(val).toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  // Pagination
  const totalPages = Math.ceil(filteredData.length / pageSize) || 1;
  const currentData = filteredData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleFilterSelect = (val: string) => {
    setSelectedFilter(val);
    setCurrentPage(1);
    if (onFilterChange) onFilterChange(val);
  };

  return (
    <div className="space-y-4">
      {/* Controls Bar: Search, Filter & Add Button */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder={searchPlaceholder}
              className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/30 transition-all"
            />
          </div>

          {/* Filter Dropdown */}
          {filterOptions && filterOptions.length > 0 && (
            <div className="relative">
              <select
                value={selectedFilter}
                onChange={(e) => handleFilterSelect(e.target.value)}
                className="appearance-none bg-slate-900 border border-slate-800 text-slate-300 text-xs rounded-xl pl-8 pr-8 py-2 focus:outline-none focus:border-amber-500/60 cursor-pointer"
              >
                <option value="">Tất cả trạng thái</option>
                {filterOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <Filter className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          )}
        </div>

        {/* Add New Button */}
        {onAddNew && (
          <button
            onClick={onAddNew}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-400 via-orange-500 to-pink-500 hover:from-amber-300 hover:to-pink-400 text-slate-950 font-black rounded-xl text-xs shadow-lg shadow-amber-500/20 transition-all active:scale-95 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>{addNewLabel}</span>
          </button>
        )}
      </div>

      {/* Table Container */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950/70 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                {columns.map((col, idx) => (
                  <th key={idx} className={`px-4 py-3.5 ${col.className || ''}`}>
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={columns.length} className="text-center py-12 text-slate-400 space-y-2">
                    <Loader2 className="w-6 h-6 animate-spin text-amber-400 mx-auto" />
                    <p className="font-semibold text-xs">Đang tải dữ liệu từ API Gateway...</p>
                  </td>
                </tr>
              ) : currentData.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="text-center py-12 text-slate-500 space-y-2">
                    <Inbox className="w-8 h-8 text-slate-600 mx-auto" />
                    <p className="font-semibold text-xs">{emptyText}</p>
                  </td>
                </tr>
              ) : (
                currentData.map((row, rowIdx) => (
                  <tr
                    key={row.id || rowIdx}
                    className="hover:bg-slate-800/40 transition-colors group"
                  >
                    {columns.map((col, colIdx) => (
                      <td key={colIdx} className={`px-4 py-3.5 ${col.className || ''}`}>
                        {col.cell
                          ? col.cell(row)
                          : col.accessorKey
                          ? String(row[col.accessorKey] ?? '')
                          : null}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredData.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          itemLabel="kết quả"
          accentColor="amber"
          className="border-t border-slate-800 rounded-t-none bg-slate-950/60"
        />
      </div>
    </div>
  );
}
