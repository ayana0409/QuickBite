'use client';

import React, { useState, useEffect } from 'react';
import {
  MapPin,
  X,
  User,
  Phone,
  Building,
  Navigation,
  FileText,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { DeliveryAddress } from '@/src/types/order.type';
import { updateOrderDeliveryAddress } from '@/src/lib/api/order';
import { useToast } from '@/src/components/shared/ToastProvider';

interface UpdateAddressModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  currentAddress?: DeliveryAddress;
  onSuccess: (newAddress: DeliveryAddress) => void;
}

export default function UpdateAddressModal({
  isOpen,
  onClose,
  orderId,
  currentAddress,
  onSuccess,
}: UpdateAddressModalProps) {
  const { success: toastSuccess, error: toastError } = useToast();

  const [formData, setFormData] = useState<DeliveryAddress>({
    receiverName: '',
    phoneNumber: '',
    addressLine: '',
    ward: '',
    district: '',
    province: '',
    note: '',
  });

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (currentAddress) {
      setFormData({
        receiverName: currentAddress.receiverName || '',
        phoneNumber: currentAddress.phoneNumber || '',
        addressLine: currentAddress.addressLine || '',
        ward: currentAddress.ward || '',
        district: currentAddress.district || '',
        province: currentAddress.province || '',
        note: currentAddress.note || '',
      });
    }
  }, [currentAddress, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.receiverName.trim() || !formData.phoneNumber.trim() || !formData.addressLine.trim()) {
      toastError('Vui lòng điền đầy đủ Tên, Số điện thoại và Địa chỉ chi tiết!');
      return;
    }

    setSubmitting(true);
    try {
      const res = await updateOrderDeliveryAddress(orderId, formData);
      if (res.success) {
        toastSuccess('Cập nhật địa chỉ nhận hàng thành công!');
        onSuccess(formData);
        onClose();
      } else {
        toastError(res.message || 'Không thể cập nhật địa chỉ');
      }
    } catch (err: any) {
      console.error('Update address error:', err);
      toastError('Lỗi kết nối khi cập nhật địa chỉ');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-orange-100 overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4.5 bg-gradient-to-r from-orange-50 to-amber-50 border-b border-orange-100/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-orange-500 to-red-500 text-white flex items-center justify-center shadow-md shadow-orange-500/20">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">Thay đổi Địa chỉ Nhận hàng</h3>
              <p className="text-xs text-slate-500">Cập nhật thông tin giao hàng cho đơn #{orderId.slice(0, 8)}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="w-8 h-8 rounded-full bg-white hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Row 1: Receiver Name & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Tên người nhận <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="Nguyễn Văn A"
                  value={formData.receiverName}
                  onChange={(e) => setFormData({ ...formData, receiverName: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 text-xs font-semibold bg-slate-50 focus:bg-white text-slate-900 placeholder:text-slate-400 rounded-xl border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all"
                />
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Số điện thoại <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="tel"
                  required
                  placeholder="0912345678"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 text-xs font-semibold bg-slate-50 focus:bg-white text-slate-900 placeholder:text-slate-400 rounded-xl border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all"
                />
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Row 2: Address Line */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Địa chỉ chi tiết (Số nhà, tên đường, tòa nhà) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                required
                placeholder="Số 123 Đường Cầu Giấy, Tòa nhà A"
                value={formData.addressLine}
                onChange={(e) => setFormData({ ...formData, addressLine: e.target.value })}
                className="w-full pl-9 pr-3 py-2 text-xs font-semibold bg-slate-50 focus:bg-white text-slate-900 placeholder:text-slate-400 rounded-xl border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all"
              />
              <Building className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            </div>
          </div>

          {/* Row 3: Ward, District, Province */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1 truncate">
                Phường/Xã
              </label>
              <input
                type="text"
                placeholder="Dịch Vọng"
                value={formData.ward}
                onChange={(e) => setFormData({ ...formData, ward: e.target.value })}
                className="w-full px-2.5 py-2 text-xs font-semibold bg-slate-50 focus:bg-white text-slate-900 placeholder:text-slate-400 rounded-xl border border-slate-200 focus:border-orange-500 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1 truncate">
                Quận/Huyện
              </label>
              <input
                type="text"
                placeholder="Cầu Giấy"
                value={formData.district}
                onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                className="w-full px-2.5 py-2 text-xs font-semibold bg-slate-50 focus:bg-white text-slate-900 placeholder:text-slate-400 rounded-xl border border-slate-200 focus:border-orange-500 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1 truncate">
                Tỉnh/Thành
              </label>
              <input
                type="text"
                placeholder="Hà Nội"
                value={formData.province}
                onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                className="w-full px-2.5 py-2 text-xs font-semibold bg-slate-50 focus:bg-white text-slate-900 placeholder:text-slate-400 rounded-xl border border-slate-200 focus:border-orange-500 outline-none transition-all"
              />
            </div>
          </div>

          {/* Row 4: Note */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Ghi chú cho tài xế (Tùy chọn)
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Gọi trước khi giao, gửi bảo vệ..."
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                className="w-full pl-9 pr-3 py-2 text-xs font-semibold bg-slate-50 focus:bg-white text-slate-900 placeholder:text-slate-400 rounded-xl border border-slate-200 focus:border-orange-500 outline-none transition-all"
              />
              <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Hủy bỏ
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white text-xs font-black rounded-xl shadow-md shadow-orange-500/25 active:scale-98 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Lưu địa chỉ</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
