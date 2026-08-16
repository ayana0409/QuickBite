'use client';

import React from 'react';
import {
  Clock,
  Store,
  CreditCard,
  Sparkles,
  Truck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Info,
} from 'lucide-react';
import { OrderStatus } from '@/src/types/order.type';

interface OrderStatusStepperProps {
  currentStatus?: OrderStatus | string;
}

interface StepItem {
  id: number;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
}

const STEPS: StepItem[] = [
  {
    id: 1,
    label: 'Chờ xác nhận (nháp)',
    shortLabel: 'Chờ xác nhận',
    icon: Clock,
  },
  {
    id: 2,
    label: 'Đã xác nhận',
    shortLabel: 'Đã xác nhận',
    icon: Store,
  },
  {
    id: 3,
    label: 'Chờ thanh toán',
    shortLabel: 'Chờ TT',
    icon: CreditCard,
  },
  {
    id: 4,
    label: 'Đang chuẩn bị',
    shortLabel: 'Chuẩn bị',
    icon: Sparkles,
  },
  {
    id: 5,
    label: 'Đang giao hàng',
    shortLabel: 'Đang giao',
    icon: Truck,
  },
  {
    id: 6,
    label: 'Giao hàng thành công',
    shortLabel: 'Thành công',
    icon: CheckCircle2,
  },
];

function getStepIndex(status?: string): number {
  if (!status) return 1;
  const s = status.toLowerCase().trim();

  if (s === 'cancelled' || s === 'rejected') return -1;
  if (s === 'refunded') return -2;

  // Step 1: Chờ xác nhận (nháp)
  if (s === 'draft' || s === 'pending' || s === 'waitinginventory' || s === 'waitingstock') return 1;

  // Step 2: Đã xác nhận
  if (s === 'confirmed' || s === 'awaitingrestaurantacceptance' || s === 'submitted') return 2;

  // Step 3: Chờ thanh toán
  if (s === 'waitingpayment') return 3;

  // Step 4: Đang chuẩn bị
  if (s === 'preparing') return 4;

  // Step 5: Đang giao hàng
  if (s === 'delivering' || s === 'ontheway') return 5;

  // Step 6: Giao hàng thành công
  if (s === 'delivered' || s === 'completed') return 6;

  return 1;
}

export default function OrderStatusStepper({ currentStatus }: OrderStatusStepperProps) {
  const currentStep = getStepIndex(currentStatus);
  const isCancelled = currentStep === -1;
  const isRefunded = currentStep === -2;
  const s = (currentStatus || '').toLowerCase().trim();
  const isDraftOrStockIssue = s === 'draft' || s === 'waitinginventory' || s === 'waitingstock';

  // Render Special Refunded State
  if (isRefunded) {
    return (
      <div className="w-full bg-gradient-to-r from-purple-50 via-pink-50 to-purple-50 border border-purple-200 rounded-3xl p-5 sm:p-6 text-purple-800 animate-in fade-in">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-purple-500/30">
            <RotateCcw className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-black text-purple-950">
              Đơn hàng đã được hoàn tiền
            </h3>
            <p className="text-xs text-purple-700 mt-0.5 font-medium">
              Đơn hàng này đã được xác nhận hoàn tiền thành công theo yêu cầu của bạn.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Render Special Cancelled State
  if (isCancelled) {
    return (
      <div className="w-full bg-red-50 border border-red-200 rounded-3xl p-5 sm:p-6 text-red-700 animate-in fade-in">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-red-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-red-500/30">
            <XCircle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-black text-red-900">
              Đơn hàng đã bị hủy
            </h3>
            <p className="text-xs text-red-600 mt-0.5 font-medium">
              Đơn hàng này đã kết thúc do bị hủy từ phía khách hàng hoặc nhà hàng từ chối.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      <div className="w-full bg-white rounded-3xl p-5 sm:p-6 border border-orange-100 shadow-xs">
        <div className="relative">
          {/* Horizontal Connector Line */}
          <div className="absolute top-5 left-6 right-6 h-1 bg-slate-100 rounded-full hidden sm:block -z-0">
            <div
              className="h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${Math.min(
                  100,
                  Math.max(0, ((currentStep - 1) / (STEPS.length - 1)) * 100)
                )}%`,
              }}
            />
          </div>

          {/* Stepper Items (6 Steps) */}
          <div className="grid grid-cols-6 gap-1 sm:gap-2 relative z-10">
            {STEPS.map((step) => {
              const Icon = step.icon;
              const isPassed = currentStep > step.id;
              const isCurrent = currentStep === step.id;

              return (
                <div key={step.id} className="flex flex-col items-center text-center group">
                  {/* Step Circle Icon */}
                  <div
                    className={`w-9 h-9 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center transition-all duration-300 ${isPassed
                        ? 'bg-gradient-to-tr from-orange-500 to-red-500 text-white shadow-md shadow-orange-500/25'
                        : isCurrent
                          ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/40 ring-4 ring-orange-200 animate-pulse'
                          : 'bg-slate-100 text-slate-400'
                      }`}
                  >
                    <Icon
                      className={`w-3.5 h-3.5 sm:w-5 sm:h-5 ${isCurrent ? 'scale-110' : ''
                        } transition-transform`}
                    />
                  </div>

                  {/* Step Label */}
                  <div className="mt-2 sm:mt-3">
                    <span
                      className={`text-[10px] sm:text-xs font-bold block transition-colors leading-tight ${isCurrent
                          ? 'text-orange-600 font-black'
                          : isPassed
                            ? 'text-slate-800'
                            : 'text-slate-400'
                        }`}
                    >
                      <span className="hidden md:inline">{step.label}</span>
                      <span className="md:hidden">{step.shortLabel}</span>
                    </span>

                    {isCurrent && (
                      <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded-full text-[8px] sm:text-[9px] font-extrabold uppercase tracking-wider bg-orange-100 text-orange-700">
                        Hiện tại
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Info Note for Draft / Waiting Confirmation State */}
      {isDraftOrStockIssue && (
        <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-4 text-xs text-amber-900 flex items-start gap-2.5 animate-in fade-in">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed font-medium">
            <strong>Lưu ý:</strong> Đơn hàng đang ở trạng thái <strong>Chờ xác nhận</strong>. Đang chờ xác nhận đơn hàng từ nhà hàng.
          </p>
        </div>
      )}
    </div>
  );
}
