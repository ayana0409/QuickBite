import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  itemLabel?: string;
  accentColor?: 'emerald' | 'cyan' | 'purple' | 'amber' | 'blue';
  className?: string;
  showPageNumbers?: boolean;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  itemLabel = 'mục',
  accentColor = 'emerald',
  className = '',
  showPageNumbers = true,
}) => {
  if (totalItems <= 0 && totalPages <= 1) {
    return null;
  }

  const safeTotalPages = Math.max(1, totalPages);
  const safeCurrentPage = Math.min(Math.max(1, currentPage), safeTotalPages);

  // Dynamic accent color classes
  const colorMap = {
    emerald: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
    cyan: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10',
    purple: 'text-purple-400 border-purple-500/30 bg-purple-500/10',
    amber: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
    blue: 'text-blue-400 border-blue-500/30 bg-blue-500/10',
  };

  const activeBadgeColorMap = {
    emerald: 'bg-emerald-500 text-slate-950 font-black',
    cyan: 'bg-cyan-500 text-slate-950 font-black',
    purple: 'bg-purple-500 text-white font-black',
    amber: 'bg-amber-500 text-slate-950 font-black',
    blue: 'bg-blue-500 text-white font-black',
  };

  const activeTextColor = colorMap[accentColor] || colorMap.emerald;
  const activeBadgeColor = activeBadgeColorMap[accentColor] || activeBadgeColorMap.emerald;

  // Generate page numbers range for page numbers display
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (safeTotalPages <= maxVisible + 2) {
      for (let i = 1; i <= safeTotalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (safeCurrentPage > 3) pages.push('...');

      const start = Math.max(2, safeCurrentPage - 1);
      const end = Math.min(safeTotalPages - 1, safeCurrentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (safeCurrentPage < safeTotalPages - 2) pages.push('...');
      pages.push(safeTotalPages);
    }
    return pages;
  };

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800 text-xs text-slate-300 font-sans ${className}`}
    >
      {/* Items count & page info */}
      <div className="flex items-center gap-3 font-mono">
        <span className="text-slate-400">
          Tổng số: <strong className={activeTextColor.split(' ')[0]}>{totalItems.toLocaleString('vi-VN')}</strong> {itemLabel}
          {' | '}
          Trang <strong className="text-slate-100">{safeCurrentPage}</strong> / {safeTotalPages}
        </span>

        {/* Optional Page Size Selector */}
        {pageSize && onPageSizeChange && (
          <div className="flex items-center gap-1.5 ml-2 border-l border-slate-800 pl-3">
            <span className="text-[11px] text-slate-500 font-sans">Hiển thị:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-[11px] text-slate-300 focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center gap-1.5">
        {/* Previous Button */}
        <button
          type="button"
          disabled={safeCurrentPage <= 1}
          onClick={() => onPageChange(Math.max(1, safeCurrentPage - 1))}
          className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 font-bold rounded-xl border border-slate-700 transition-all cursor-pointer"
          title="Trang trước"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden xs:inline">Trang Trước</span>
        </button>

        {/* Page Number Buttons */}
        {showPageNumbers && safeTotalPages > 1 && (
          <div className="flex items-center gap-1">
            {getPageNumbers().map((p, idx) => {
              if (p === '...') {
                return (
                  <span key={`ellipsis-${idx}`} className="px-2 py-1 text-slate-500 font-mono text-[11px]">
                    ...
                  </span>
                );
              }

              const pageNum = p as number;
              const isActive = pageNum === safeCurrentPage;

              return (
                <button
                  key={`page-${pageNum}`}
                  type="button"
                  onClick={() => onPageChange(pageNum)}
                  className={`w-8 h-8 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer flex items-center justify-center border ${
                    isActive
                      ? `${activeBadgeColor} border-transparent shadow-md`
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>
        )}

        {/* Next Button */}
        <button
          type="button"
          disabled={safeCurrentPage >= safeTotalPages}
          onClick={() => onPageChange(Math.min(safeTotalPages, safeCurrentPage + 1))}
          className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 font-bold rounded-xl border border-slate-700 transition-all cursor-pointer"
          title="Trang sau"
        >
          <span className="hidden xs:inline">Trang Sau</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default Pagination;
