'use client';

import React from 'react';
import {
  FileCheck,
  Store,
  Sparkles,
  Truck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
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
    label: 'Đã gửi đơn',
    shortLabel: 'Gửi đơn',
    icon: FileCheck,
  },
  {
    id: 2,
    label: 'Quán tiếp nhận',
    shortLabel: 'Tiếp nhận',
    icon: Store,
  },
  {
    id: 3,
    label: 'Đang chuẩn bị',
    shortLabel: 'Chuẩn bị',
    icon: Sparkles,
  },
  {
    id: 4,
    label: 'Đang giao hàng',
    shortLabel: 'Đang giao',
    icon: Truck,
  },
  {
    id: 5,
    label: 'Hoàn tất',
    shortLabel: 'Hoàn tất',
    icon: CheckCircle2,
  },
];

function getStepIndex(status?: string): number {
  if (!status) return 1;
  const s = status.toLowerCase().trim();

  if (s === 'cancelled' || s === 'rejected' || s === 'refunded') return -1;
  if (s === 'draft') return 0;
  if (s === 'submitted' || s === 'pending' || s === 'waitingpayment') return 1;
  if (s === 'confirmed' || s === 'awaitingrestaurantacceptance') return 2;
  if (s === 'preparing') return 3;
  if (s === 'delivering' || s === 'ontheway') return 4;
  if (s === 'delivered' || s === 'completed') return 5;

  return 1;
}

export default function OrderStatusStepper({ currentStatus }: OrderStatusStepperProps) {
  const currentStep = getStepIndex(currentStatus);
  const isCancelled = currentStep === -1;

  // Render Special Cancelled State
  if (isCancelled) {
    return (
      <div className="w-full bg-red-50 border border-red-200 rounded-3xl p-5 sm:p-6 text-red-700">
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
    <div className="w-full bg-white rounded-3xl p-6 border border-orange-100 shadow-xs">
      <div className="relative">
        {/* Horizontal Connector Line */}
        <div className="absolute top-5 left-8 right-8 h-1 bg-slate-100 rounded-full hidden sm:block -z-0">
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

        {/* Stepper Items */}
        <div className="grid grid-cols-5 gap-1 sm:gap-2 relative z-10">
          {STEPS.map((step) => {
            const Icon = step.icon;
            const isPassed = currentStep > step.id;
            const isCurrent = currentStep === step.id;
            const isFuture = currentStep < step.id;

            return (
              <div key={step.id} className="flex flex-col items-center text-center group">
                {/* Step Circle Icon */}
                <div
                  className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                    isPassed
                      ? 'bg-gradient-to-tr from-orange-500 to-red-500 text-white shadow-md shadow-orange-500/25'
                      : isCurrent
                      ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/40 ring-4 ring-orange-200 animate-pulse'
                      : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 sm:w-5 sm:h-5 ${
                      isCurrent ? 'scale-110' : ''
                    } transition-transform`}
                  />
                </div>

                {/* Step Label */}
                <div className="mt-3">
                  <span
                    className={`text-[11px] sm:text-xs font-bold block transition-colors ${
                      isCurrent
                        ? 'text-orange-600 font-black'
                        : isPassed
                        ? 'text-slate-800'
                        : 'text-slate-400'
                    }`}
                  >
                    <span className="hidden sm:inline">{step.label}</span>
                    <span className="sm:hidden">{step.shortLabel}</span>
                  </span>

                  {isCurrent && (
                    <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider bg-orange-100 text-orange-700">
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
  );
}
