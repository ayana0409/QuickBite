'use client';

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Trash2, ShoppingBag, X, Check, Store } from 'lucide-react';

export type ConfirmModalType = 'warning' | 'danger' | 'info' | 'restaurant_conflict';

export interface ConfirmModalProps {
  isOpen: boolean;
  type?: ConfirmModalType;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function ConfirmModal({
  isOpen,
  type = 'warning',
  title = 'Xác nhận',
  message,
  confirmText = 'Đồng ý',
  cancelText = 'Hủy bỏ',
  onConfirm,
  onCancel,
  isLoading = false,
}: ConfirmModalProps) {
  const [mounted, setMounted] = React.useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isLoading) {
        onCancel();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, isLoading, onCancel]);

  if (!isOpen || !mounted || typeof document === 'undefined') return null;

  const getIcon = () => {
    switch (type) {
      case 'restaurant_conflict':
        return (
          <div className="w-14 h-14 rounded-3xl bg-gradient-to-tr from-amber-500/20 to-orange-500/20 text-orange-600 flex items-center justify-center shadow-inner border border-orange-200">
            <Store className="w-7 h-7" />
          </div>
        );
      case 'danger':
        return (
          <div className="w-14 h-14 rounded-3xl bg-red-50 text-red-600 flex items-center justify-center shadow-inner border border-red-200">
            <Trash2 className="w-7 h-7" />
          </div>
        );
      case 'info':
        return (
          <div className="w-14 h-14 rounded-3xl bg-sky-50 text-sky-600 flex items-center justify-center shadow-inner border border-sky-200">
            <ShoppingBag className="w-7 h-7" />
          </div>
        );
      default:
        return (
          <div className="w-14 h-14 rounded-3xl bg-amber-50 text-amber-600 flex items-center justify-center shadow-inner border border-amber-200">
            <AlertTriangle className="w-7 h-7" />
          </div>
        );
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-99999 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!isLoading) onCancel();
      }}
    >
      <div
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-orange-100 p-6 sm:p-7 flex flex-col items-center text-center overflow-hidden animate-in zoom-in-95 duration-200 text-slate-800"
      >
        {/* Background Subtle Gradient Glow */}
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-orange-400/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-red-400/10 rounded-full blur-2xl pointer-events-none" />

        {/* Close Button */}
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
          aria-label="Đóng"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Icon */}
        <div className="mb-4">{getIcon()}</div>

        {/* Title */}
        <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight mb-2">
          {title}
        </h3>

        {/* Message */}
        <p className="text-sm text-slate-600 font-normal leading-relaxed mb-6 whitespace-pre-line">
          {message}
        </p>

        {/* Action Buttons */}
        <div className="w-full grid grid-cols-2 gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="w-full py-3 px-4 rounded-2xl font-bold text-xs sm:text-sm text-slate-700 bg-slate-100 hover:bg-slate-200/80 active:scale-98 transition-all cursor-pointer disabled:opacity-50"
          >
            {cancelText}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`w-full py-3 px-4 rounded-2xl font-bold text-xs sm:text-sm text-white shadow-md active:scale-98 transition-all cursor-pointer disabled:opacity-50 ${
              type === 'danger'
                ? 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 shadow-red-500/25'
                : 'bg-gradient-to-r from-orange-500 via-orange-600 to-red-600 hover:from-orange-600 hover:to-red-700 shadow-orange-500/30'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
