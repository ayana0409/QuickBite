'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  X,
  Flame,
  Clock,
  Images,
} from 'lucide-react';

interface FoodImageGalleryProps {
  images?: string[];
  foodName: string;
  totalSold?: number;
  preparationTime?: number;
}

const DEFAULT_IMAGE =
  'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1200&q=80';

export default function FoodImageGallery({
  images = [],
  foodName,
  totalSold = 0,
  preparationTime,
}: FoodImageGalleryProps) {
  // Ensure we have a valid array of image URLs
  const validImages = Array.isArray(images) && images.length > 0 ? images : [DEFAULT_IMAGE];
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState<boolean>(false);

  const totalImages = validImages.length;
  const currentImage = validImages[selectedIndex] || validImages[0];

  // Navigation handlers
  const handlePrev = useCallback(
    (e?: React.MouseEvent) => {
      e?.stopPropagation();
      setSelectedIndex((prev) => (prev === 0 ? totalImages - 1 : prev - 1));
    },
    [totalImages]
  );

  const handleNext = useCallback(
    (e?: React.MouseEvent) => {
      e?.stopPropagation();
      setSelectedIndex((prev) => (prev === totalImages - 1 ? 0 : prev + 1));
    },
    [totalImages]
  );

  // Keyboard navigation for Lightbox
  useEffect(() => {
    if (!isLightboxOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsLightboxOpen(false);
      } else if (e.key === 'ArrowLeft') {
        setSelectedIndex((prev) => (prev === 0 ? totalImages - 1 : prev - 1));
      } else if (e.key === 'ArrowRight') {
        setSelectedIndex((prev) => (prev === totalImages - 1 ? 0 : prev + 1));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLightboxOpen, totalImages]);

  return (
    <div className="flex flex-col gap-3.5 select-none">
      {/* ─── 1. Main Hero Image Display ─── */}
      <div
        onClick={() => setIsLightboxOpen(true)}
        className="group relative w-full aspect-4/3 sm:aspect-16/11 rounded-3xl overflow-hidden bg-slate-100 border border-orange-100 shadow-sm cursor-zoom-in"
      >
        <img
          src={currentImage}
          alt={`${foodName} - Ảnh ${selectedIndex + 1}`}
          className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-103"
          loading="eager"
        />

        {/* Gradient Overlay on bottom */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

        {/* Badges Overlays (Top Left) */}
        <div className="absolute top-4 left-4 flex flex-wrap gap-2 pointer-events-none z-10">
          {totalSold > 300 && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-red-600 to-orange-500 text-white text-xs font-bold shadow-md shadow-red-500/25">
              <Flame className="w-3.5 h-3.5 fill-white" />
              <span>Đã bán {totalSold.toLocaleString('vi-VN')}</span>
            </span>
          )}
          {preparationTime && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-xs font-semibold">
              <Clock className="w-3.5 h-3.5 text-amber-300" />
              <span>{preparationTime} phút</span>
            </span>
          )}
        </div>

        {/* Counter Badge & Zoom Hint (Top Right) */}
        <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
          {totalImages > 1 && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-xs font-mono font-bold tracking-wider shadow">
              <Images className="w-3 h-3 text-orange-400" />
              {selectedIndex + 1}/{totalImages}
            </span>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsLightboxOpen(true);
            }}
            title="Phóng to ảnh"
            className="w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md text-white flex items-center justify-center transition-all opacity-80 group-hover:opacity-100 cursor-pointer shadow"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Prev / Next Arrows (Visible on Hover if multiple images) */}
        {totalImages > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrev}
              aria-label="Ảnh trước"
              className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 hover:bg-white text-slate-800 backdrop-blur-md shadow-lg flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 hover:scale-105 active:scale-95 cursor-pointer z-10"
            >
              <ChevronLeft className="w-5 h-5 -ml-0.5" />
            </button>

            <button
              type="button"
              onClick={handleNext}
              aria-label="Ảnh tiếp theo"
              className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 hover:bg-white text-slate-800 backdrop-blur-md shadow-lg flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 hover:scale-105 active:scale-95 cursor-pointer z-10"
            >
              <ChevronRight className="w-5 h-5 -mr-0.5" />
            </button>
          </>
        )}
      </div>

      {/* ─── 2. Thumbnail Selector Row (Only if > 1 image) ─── */}
      {totalImages > 1 && (
        <div className="flex items-center gap-2.5 overflow-x-auto pb-1 custom-scrollbar">
          {validImages.map((imgUrl, idx) => {
            const isSelected = idx === selectedIndex;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => setSelectedIndex(idx)}
                className={`relative w-18 h-18 sm:w-20 sm:h-20 rounded-2xl overflow-hidden shrink-0 border-2 transition-all cursor-pointer ${
                  isSelected
                    ? 'border-orange-500 ring-2 ring-orange-500/30 scale-102 shadow-md'
                    : 'border-slate-200/80 hover:border-orange-300 opacity-70 hover:opacity-100 bg-slate-100'
                }`}
              >
                <img
                  src={imgUrl}
                  alt={`${foodName} thumbnail ${idx + 1}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />

                {/* Selected Indicator Bar */}
                {isSelected && (
                  <div className="absolute inset-x-0 bottom-0 h-1 bg-orange-500" />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* ─── 3. Fullscreen Lightbox Modal ─── */}
      {isLightboxOpen && (
        <div
          onClick={() => setIsLightboxOpen(false)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-between p-4 sm:p-6 animate-in fade-in duration-200"
        >
          {/* Lightbox Header */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-5xl flex items-center justify-between text-white"
          >
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-100 line-clamp-1">
                {foodName}
              </h3>
              <span className="text-xs text-slate-400 font-mono">
                Ảnh {selectedIndex + 1} / {totalImages}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setIsLightboxOpen(false)}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Lightbox Main Image & Navigation */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-5xl max-h-[75vh] flex items-center justify-center my-auto"
          >
            <img
              src={currentImage}
              alt={`${foodName} Fullscreen`}
              className="max-w-full max-h-[75vh] object-contain rounded-2xl shadow-2xl"
            />

            {totalImages > 1 && (
              <>
                <button
                  type="button"
                  onClick={handlePrev}
                  className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/60 hover:bg-black/90 text-white backdrop-blur-md flex items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-xl border border-white/10"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>

                <button
                  type="button"
                  onClick={handleNext}
                  className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/60 hover:bg-black/90 text-white backdrop-blur-md flex items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-xl border border-white/10"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}
          </div>

          {/* Lightbox Thumbnails Strip */}
          {totalImages > 1 && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-2 overflow-x-auto max-w-full py-2 px-4 bg-black/40 backdrop-blur-sm rounded-2xl border border-white/10"
            >
              {validImages.map((imgUrl, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedIndex(idx)}
                  className={`relative w-14 h-14 rounded-xl overflow-hidden shrink-0 border-2 transition-all cursor-pointer ${
                    idx === selectedIndex
                      ? 'border-orange-500 scale-105 shadow-md'
                      : 'border-transparent opacity-50 hover:opacity-90'
                  }`}
                >
                  <img
                    src={imgUrl}
                    alt={`Thumb ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
