"use client";

import React, { useState, useRef } from "react";
import dynamic from "next/dynamic";
import {
  MapPin,
  Navigation,
  Loader2,
  AlertCircle,
  Wand2,
  Compass,
} from "lucide-react";
import { fetchAddressFromCoordinates } from "@/src/lib/utils/geocoding";

export interface AddressInfo {
  line1: string;
  ward: string;
  district: string;
  city: string;
  fullAddress: string;
}

interface CheckoutMapPickerProps {
  initialPosition?: [number, number]; // [lat, lng]
  onLocationSelect: (lat: number, lng: number, addressInfo: AddressInfo) => void;
  className?: string;
}

/**
 * Dynamically import Leaflet map with SSR disabled to prevent `window is not defined`
 */
const CheckoutMapInner = dynamic(() => import("./CheckoutMapInner"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-64 sm:h-72 rounded-2xl bg-orange-50/50 border border-dashed border-orange-200 flex flex-col items-center justify-center text-slate-400 gap-2">
      <Loader2 className="w-7 h-7 text-orange-500 animate-spin" />
      <span className="text-xs font-semibold text-slate-600">
        Đang tải bản đồ giao hàng OpenStreetMap...
      </span>
    </div>
  ),
});

export default function CheckoutMapPicker({
  initialPosition = [10.776192, 106.702444],
  onLocationSelect,
  className = "",
}: CheckoutMapPickerProps) {
  const [position, setPosition] = useState<[number, number]>(initialPosition);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [isGeocoding, setIsGeocoding] = useState<boolean>(false);
  const [notice, setNotice] = useState<{ type: "success" | "warn"; text: string } | null>(null);

  const reqIdRef = useRef<number>(0);

  const handlePositionSelect = async (pos: [number, number]) => {
    const lat = parseFloat(pos[0].toFixed(6));
    const lng = parseFloat(pos[1].toFixed(6));
    setPosition([lat, lng]);

    const currentReqId = ++reqIdRef.current;
    setIsGeocoding(true);
    setNotice(null);

    try {
      const geoResult = await fetchAddressFromCoordinates(lat, lng);

      if (currentReqId !== reqIdRef.current) return;

      const line1 = geoResult?.line1 || "";
      const ward = geoResult?.ward || "";
      const district = geoResult?.district || "";
      const city = geoResult?.city || "";

      const parts = [line1, ward, district, city].filter(Boolean);
      const fullAddress = parts.join(", ");

      if (geoResult && parts.length > 0) {
        setNotice({
          type: "success",
          text: "Đã nhận diện địa chỉ từ bản đồ!",
        });
      } else {
        setNotice({
          type: "warn",
          text: "Không nhận diện được tên đường tại tọa độ này. Vui lòng tự nhập chi tiết.",
        });
      }

      onLocationSelect(lat, lng, {
        line1,
        ward,
        district,
        city,
        fullAddress,
      });
    } catch (err) {
      console.warn("[CheckoutMapPicker] Geocoding error:", err);
      if (currentReqId === reqIdRef.current) {
        setNotice({
          type: "warn",
          text: "Không thể tự động chuyển đổi tọa độ thành địa chỉ.",
        });
        onLocationSelect(lat, lng, {
          line1: "",
          ward: "",
          district: "",
          city: "",
          fullAddress: "",
        });
      }
    } finally {
      if (currentReqId === reqIdRef.current) {
        setIsGeocoding(false);
      }
    }
  };

  const handleUseCurrentLocation = () => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      alert("Trình duyệt không hỗ trợ định vị GPS.");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        handlePositionSelect(coords);
        setIsLocating(false);
      },
      (err) => {
        console.warn("[Geolocation] Error:", err.message);
        setIsLocating(false);
        setNotice({
          type: "warn",
          text: "Không thể lấy vị trí hiện tại của thiết bị. Vui lòng chọn trực tiếp trên bản đồ.",
        });
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Header Bar with Geolocation Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wider">
          <Compass className="w-4 h-4 text-orange-500" />
          <span>Ghim Tọa Độ Giao Hàng (Bản đồ)</span>
        </div>

        <button
          type="button"
          onClick={handleUseCurrentLocation}
          disabled={isLocating || isGeocoding}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-orange-700 bg-orange-50 hover:bg-orange-100/90 rounded-xl border border-orange-200 transition-all cursor-pointer disabled:opacity-50 shadow-2xs"
        >
          {isLocating ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-orange-600" />
          ) : (
            <Navigation className="w-3.5 h-3.5 text-orange-600" />
          )}
          <span>Vị trí hiện tại của tôi</span>
        </button>
      </div>

      {/* Interactive Map */}
      <CheckoutMapInner position={position} onPositionChange={handlePositionSelect} />

      {/* Geocoding / Reverse Status Feedback */}
      {isGeocoding && (
        <div className="p-2.5 bg-orange-50 border border-orange-200/80 rounded-xl flex items-center gap-2 text-xs text-orange-800 animate-in fade-in duration-150">
          <Loader2 className="w-4 h-4 animate-spin text-orange-600 shrink-0" />
          <span className="font-medium">Đang tự động nhận diện địa chỉ giao hàng từ bản đồ...</span>
        </div>
      )}

      {notice && !isGeocoding && (
        <div
          className={`p-2.5 rounded-xl border flex items-center gap-2 text-xs animate-in fade-in duration-150 ${
            notice.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-amber-50 border-amber-200 text-amber-800"
          }`}
        >
          {notice.type === "success" ? (
            <Wand2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          )}
          <span className="font-medium">{notice.text}</span>
        </div>
      )}
    </div>
  );
}
