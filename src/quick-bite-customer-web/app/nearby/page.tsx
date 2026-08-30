import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import NearbyContent from './NearbyContent';

export const metadata: Metadata = {
  title: 'Quán Ăn Gần Bạn | QuickBite PostGIS Delivery',
  description: 'Khám phá các quán ăn, nhà hàng đang mở cửa gần vị trí của bạn nhất với khoảng cách chính xác theo thời gian thực.',
};

export default function NearbyPage() {
  return (
    <div className="min-h-screen bg-[#fdfbf7] pb-20">
      <Suspense
        fallback={
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
            <div className="h-12 w-64 bg-orange-100/60 rounded-2xl animate-pulse mb-6" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="aspect-16/10 bg-slate-100 rounded-3xl animate-pulse" />
              ))}
            </div>
          </div>
        }
      >
        <NearbyContent />
      </Suspense>
    </div>
  );
}
