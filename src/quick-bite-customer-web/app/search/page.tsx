import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import SearchContent from './SearchContent';

export const metadata: Metadata = {
  title: 'Tìm Kiếm Món Ăn & Quán Ăn | QuickBite',
  description: 'Tìm kiếm món ăn ngon, đồ uống yêu thích với bộ lọc giá, đánh giá và khoảng cách thông minh trên QuickBite.',
};

export default function SearchPage() {
  return (
    <div className="min-h-screen bg-[#fdfbf7] pb-20">
      <Suspense
        fallback={
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
            <div className="h-12 w-64 bg-orange-100/60 rounded-2xl animate-pulse mb-6" />
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="aspect-4/5 bg-slate-100 rounded-3xl animate-pulse" />
              ))}
            </div>
          </div>
        }
      >
        <SearchContent />
      </Suspense>
    </div>
  );
}
