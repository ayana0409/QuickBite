'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import {
  MapPin,
  User,
  Phone,
  Home,
  FileText,
  X,
  Check,
  Compass,
  AlertCircle,
} from 'lucide-react';
import { DeliveryAddress } from '@/src/types/order.type';
import { useCartStore } from '@/src/store/cart.store';
import { useToast } from './ToastProvider';
import CheckoutMapPicker, { AddressInfo } from './CheckoutMapPicker';

interface DeliveryAddressModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (address: DeliveryAddress) => void;
}

export default function DeliveryAddressModal({
  isOpen,
  onClose,
  onSaved,
}: DeliveryAddressModalProps) {
  const { data: session } = useSession();
  const deliveryAddress = useCartStore((state) => state.deliveryAddress);
  const setDeliveryAddress = useCartStore((state) => state.setDeliveryAddress);
  const { success, warning } = useToast();

  const [formData, setFormData] = useState<DeliveryAddress>({
    receiverName: '',
    phoneNumber: '',
    addressLine: '',
    ward: '',
    district: '',
    province: 'Hồ Chí Minh',
    note: '',
    latitude: null,
    longitude: null,
  });

  const [errors, setErrors] = useState<Partial<Record<keyof DeliveryAddress, string>>>({});

  // Sync saved address or pre-populate from session/localStorage
  useEffect(() => {
    if (isOpen) {
      let currentAddr = deliveryAddress;
      if (!currentAddr && typeof window !== 'undefined') {
        try {
          const raw = localStorage.getItem('qb-delivery-address');
          if (raw) currentAddr = JSON.parse(raw);
        } catch {}
      }

      if (currentAddr && currentAddr.receiverName) {
        setFormData({
          receiverName: currentAddr.receiverName || '',
          phoneNumber: currentAddr.phoneNumber || '',
          addressLine: currentAddr.addressLine || '',
          ward: currentAddr.ward || '',
          district: currentAddr.district || '',
          province: currentAddr.province || 'Hồ Chí Minh',
          note: currentAddr.note || '',
          latitude: typeof currentAddr.latitude === 'number' ? currentAddr.latitude : 10.776192,
          longitude: typeof currentAddr.longitude === 'number' ? currentAddr.longitude : 106.702444,
        });
      } else {
        setFormData({
          receiverName: session?.user?.name || '',
          phoneNumber: '',
          addressLine: '',
          ward: '',
          district: '',
          province: 'Hồ Chí Minh',
          note: '',
          latitude: 10.776192,
          longitude: 106.702444,
        });
      }
      setErrors({});
    }
  }, [isOpen, deliveryAddress, session?.user?.name]);

  if (!isOpen) return null;

  const handleChange = (field: keyof DeliveryAddress, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleLocationSelect = (lat: number, lng: number, addressInfo: AddressInfo) => {
    setFormData((prev) => ({
      ...prev,
      latitude: lat,
      longitude: lng,
      addressLine: addressInfo.line1 || prev.addressLine,
      ward: addressInfo.ward || prev.ward,
      district: addressInfo.district || prev.district,
      province: addressInfo.city || prev.province,
    }));

    // Clear coordinate and address errors if any
    setErrors((prev) => ({
      ...prev,
      latitude: undefined,
      longitude: undefined,
      addressLine: undefined,
      ward: undefined,
      district: undefined,
      province: undefined,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Partial<Record<keyof DeliveryAddress, string>> = {};

    if (!formData.receiverName.trim()) newErrors.receiverName = 'Vui lòng nhập tên người nhận';
    if (!formData.phoneNumber.trim()) {
      newErrors.phoneNumber = 'Vui lòng nhập số điện thoại';
    } else if (!/^[0-9+ ]{9,15}$/.test(formData.phoneNumber.trim())) {
      newErrors.phoneNumber = 'Số điện thoại không hợp lệ';
    }

    if (
      formData.latitude === null ||
      formData.latitude === undefined ||
      formData.longitude === null ||
      formData.longitude === undefined
    ) {
      newErrors.latitude = 'Vui lòng chọn vị trí trên bản đồ để xác định tọa độ giao hàng';
      warning('Vui lòng chọn vị trí trên bản đồ để xác định tọa độ giao hàng');
      setErrors(newErrors);
      return;
    }

    if (!formData.addressLine.trim()) newErrors.addressLine = 'Vui lòng nhập số nhà, tên đường';
    if (!formData.ward.trim()) newErrors.ward = 'Vui lòng nhập phường / xã';
    if (!formData.district.trim()) newErrors.district = 'Vui lòng nhập quận / huyện';
    if (!formData.province.trim()) newErrors.province = 'Vui lòng nhập tỉnh / thành phố';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      warning('Vui lòng điền đầy đủ các thông tin địa chỉ bắt buộc');
      return;
    }

    const cleanedAddress: DeliveryAddress = {
      receiverName: formData.receiverName.trim(),
      phoneNumber: formData.phoneNumber.trim(),
      addressLine: formData.addressLine.trim(),
      ward: formData.ward.trim(),
      district: formData.district.trim(),
      province: formData.province.trim(),
      note: formData.note?.trim() || '',
      latitude: typeof formData.latitude === 'number' ? formData.latitude : null,
      longitude: typeof formData.longitude === 'number' ? formData.longitude : null,
    };

    setDeliveryAddress(cleanedAddress);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('qb-delivery-address', JSON.stringify(cleanedAddress));
      } catch {}
    }
    success('Đã lưu địa chỉ và tọa độ giao hàng thành công!');
    if (onSaved) onSaved(cleanedAddress);
    onClose();
  };

  const mapInitialPos: [number, number] =
    typeof formData.latitude === 'number' && typeof formData.longitude === 'number'
      ? [formData.latitude, formData.longitude]
      : [10.776192, 106.702444];

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-orange-100 overflow-hidden text-slate-800 animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-orange-50 to-amber-50 border-b border-orange-100 shrink-0">
          <div className="flex items-center gap-2 text-slate-800">
            <div className="w-8 h-8 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-800">Địa chỉ & Tọa độ giao hàng</h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Chọn vị trí trên bản đồ để tự động điền địa chỉ
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-200/60 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
            aria-label="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="p-6 flex-1 overflow-y-auto space-y-5">
          {/* Section 1: Map Picker */}
          <div className="p-4 bg-orange-50/40 rounded-2xl border border-orange-100 space-y-2">
            <CheckoutMapPicker
              initialPosition={mapInitialPos}
              onLocationSelect={handleLocationSelect}
            />

            {formData.latitude && formData.longitude && (
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-600 pt-1 border-t border-orange-100">
                <span className="flex items-center gap-1 text-orange-600 font-bold">
                  <Compass className="w-3.5 h-3.5" />
                  Tọa độ đã chọn:
                </span>
                <span className="bg-white px-2 py-0.5 rounded border border-orange-200 font-bold">
                  [{formData.latitude.toFixed(6)}, {formData.longitude.toFixed(6)}]
                </span>
              </div>
            )}

            {errors.latitude && (
              <p className="text-xs text-red-500 font-semibold flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {errors.latitude}
              </p>
            )}
          </div>

          {/* Section 2: Contact Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Tên người nhận <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.receiverName}
                  onChange={(e) => handleChange('receiverName', e.target.value)}
                  placeholder="Nguyễn Văn A"
                  className={`w-full pl-9 pr-3 py-2.5 text-sm font-medium bg-white text-slate-900 placeholder:text-slate-400 border rounded-xl focus:bg-white focus:ring-2 outline-none transition-all ${
                    errors.receiverName
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                      : 'border-slate-300 focus:border-orange-500 focus:ring-orange-200 shadow-2xs'
                  }`}
                />
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              </div>
              {errors.receiverName && (
                <p className="text-[11px] text-red-500 mt-1 font-medium">{errors.receiverName}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Số điện thoại <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={(e) => handleChange('phoneNumber', e.target.value)}
                  placeholder="0912345678"
                  className={`w-full pl-9 pr-3 py-2.5 text-sm font-medium bg-white text-slate-900 placeholder:text-slate-400 border rounded-xl focus:bg-white focus:ring-2 outline-none transition-all ${
                    errors.phoneNumber
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                      : 'border-slate-300 focus:border-orange-500 focus:ring-orange-200 shadow-2xs'
                  }`}
                />
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              </div>
              {errors.phoneNumber && (
                <p className="text-[11px] text-red-500 mt-1 font-medium">{errors.phoneNumber}</p>
              )}
            </div>
          </div>

          {/* Section 3: Detailed Address Info */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Số nhà, Tên đường / Tòa nhà <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={formData.addressLine}
                onChange={(e) => handleChange('addressLine', e.target.value)}
                placeholder="Ví dụ: Tầng 5, Tòa Landmark 72, Đường Phạm Hùng"
                className={`w-full pl-9 pr-3 py-2.5 text-sm font-medium bg-white text-slate-900 placeholder:text-slate-400 border rounded-xl focus:bg-white focus:ring-2 outline-none transition-all ${
                  errors.addressLine
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                    : 'border-slate-300 focus:border-orange-500 focus:ring-orange-200 shadow-2xs'
                }`}
              />
              <Home className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
            </div>
            {errors.addressLine && (
              <p className="text-[11px] text-red-500 mt-1 font-medium">{errors.addressLine}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Phường / Xã <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.ward}
                onChange={(e) => handleChange('ward', e.target.value)}
                placeholder="Mễ Trì"
                className={`w-full px-3 py-2.5 text-sm font-medium bg-white text-slate-900 placeholder:text-slate-400 border rounded-xl focus:bg-white focus:ring-2 outline-none transition-all ${
                  errors.ward
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                    : 'border-slate-300 focus:border-orange-500 focus:ring-orange-200 shadow-2xs'
                }`}
              />
              {errors.ward && (
                <p className="text-[11px] text-red-500 mt-1 font-medium">{errors.ward}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Quận / Huyện <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.district}
                onChange={(e) => handleChange('district', e.target.value)}
                placeholder="Nam Từ Liêm"
                className={`w-full px-3 py-2.5 text-sm font-medium bg-white text-slate-900 placeholder:text-slate-400 border rounded-xl focus:bg-white focus:ring-2 outline-none transition-all ${
                  errors.district
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                    : 'border-slate-300 focus:border-orange-500 focus:ring-orange-200 shadow-2xs'
                }`}
              />
              {errors.district && (
                <p className="text-[11px] text-red-500 mt-1 font-medium">{errors.district}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Tỉnh / Thành phố <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.province}
                onChange={(e) => handleChange('province', e.target.value)}
                placeholder="Hồ Chí Minh"
                className={`w-full px-3 py-2.5 text-sm font-medium bg-white text-slate-900 placeholder:text-slate-400 border rounded-xl focus:bg-white focus:ring-2 outline-none transition-all ${
                  errors.province
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                    : 'border-slate-300 focus:border-orange-500 focus:ring-orange-200 shadow-2xs'
                }`}
              />
              {errors.province && (
                <p className="text-[11px] text-red-500 mt-1 font-medium">{errors.province}</p>
              )}
            </div>
          </div>

          {/* Section 4: Note */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Ghi chú thêm cho tài xế (tuỳ chọn)
            </label>
            <div className="relative">
              <input
                type="text"
                value={formData.note || ''}
                onChange={(e) => handleChange('note', e.target.value)}
                placeholder="Ví dụ: Tòa A, gọi cửa số 3, giao trước 12h..."
                className="w-full pl-9 pr-3 py-2.5 text-sm font-medium bg-white text-slate-900 placeholder:text-slate-400 border border-slate-300 rounded-xl focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none transition-all shadow-2xs"
                maxLength={150}
              />
              <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
            </div>
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5 sticky bottom-0 bg-white py-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Huỷ
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-6 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white text-xs font-bold rounded-xl shadow-md shadow-orange-500/25 transition-all cursor-pointer hover:scale-105 active:scale-95"
            >
              <Check className="w-4 h-4" />
              <span>Xác nhận & Lưu địa chỉ</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
