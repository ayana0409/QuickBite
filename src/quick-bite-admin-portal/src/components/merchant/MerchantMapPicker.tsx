import { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import {
  Navigation,
  Loader2,
  ExternalLink,
  Wand2,
  AlertCircle,
  Compass,
} from 'lucide-react';
import { fetchAddressFromCoordinates, type ReverseGeocodeResult } from '../../utils/geocoding';

export interface AddressInfo {
  line1: string;
  ward: string;
  district: string;
  city: string;
  fullAddress: string;
}

interface MerchantMapPickerProps {
  position?: [number, number]; // [lat, lng]
  onLocationSelect: (lat: number, lng: number, addressInfo: AddressInfo) => void;
  className?: string;
}

// Custom Marker Icon for Leaflet
const storeMarkerIcon = L.divIcon({
  className: 'custom-leaflet-marker',
  html: `
    <div style="
      position: relative;
      width: 38px;
      height: 38px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #10b981, #059669);
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      border: 2.5px solid #ffffff;
      box-shadow: 0 4px 14px rgba(16, 185, 129, 0.45);
    ">
      <svg style="transform: rotate(45deg); width: 18px; height: 18px; color: #ffffff;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M3 3h18v18H3zM3 9h18M9 21V9"></path>
      </svg>
    </div>
  `,
  iconSize: [38, 38],
  iconAnchor: [19, 38],
  popupAnchor: [0, -36],
});

export default function MerchantMapPicker({
  position = [10.776192, 106.702444],
  onLocationSelect,
  className = '',
}: MerchantMapPickerProps) {
  const [currentPos, setCurrentPos] = useState<[number, number]>(position);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [isGeocoding, setIsGeocoding] = useState<boolean>(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'warn'; text: string } | null>(null);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const reqIdRef = useRef<number>(0);

  const handlePositionChange = async (lat: number, lng: number) => {
    const roundedLat = parseFloat(lat.toFixed(6));
    const roundedLng = parseFloat(lng.toFixed(6));
    setCurrentPos([roundedLat, roundedLng]);

    if (markerRef.current) {
      markerRef.current.setLatLng([roundedLat, roundedLng]);
    }
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([roundedLat, roundedLng], mapInstanceRef.current.getZoom(), {
        animate: true,
      });
    }

    const currentReqId = ++reqIdRef.current;
    setIsGeocoding(true);
    setNotice(null);

    try {
      const geoResult: ReverseGeocodeResult | null = await fetchAddressFromCoordinates(
        roundedLat,
        roundedLng
      );

      if (currentReqId !== reqIdRef.current) return;

      const line1 = geoResult?.line1 || '';
      const ward = geoResult?.ward || '';
      const district = geoResult?.district || '';
      const city = geoResult?.city || '';

      const parts = [line1, ward, district, city].filter(Boolean);
      const fullAddress = parts.join(', ');

      if (geoResult && parts.length > 0) {
        setNotice({
          type: 'success',
          text: `Đã nhận diện: ${fullAddress}`,
        });
      } else {
        setNotice({
          type: 'warn',
          text: 'Không nhận diện được tên đường cụ thể tại tọa độ này. Tọa độ vẫn được lưu.',
        });
      }

      onLocationSelect(roundedLat, roundedLng, {
        line1,
        ward,
        district,
        city,
        fullAddress,
      });
    } catch (err) {
      console.warn('[MerchantMapPicker] Geocoding error:', err);
      if (currentReqId === reqIdRef.current) {
        setNotice({
          type: 'warn',
          text: 'Không thể tự động chuyển đổi tọa độ thành địa chỉ text.',
        });
        onLocationSelect(roundedLat, roundedLng, {
          line1: '',
          ward: '',
          district: '',
          city: '',
          fullAddress: '',
        });
      }
    } finally {
      if (currentReqId === reqIdRef.current) {
        setIsGeocoding(false);
      }
    }
  };

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const initialLat =
      typeof position[0] === 'number' && !isNaN(position[0]) ? position[0] : 10.776192;
    const initialLng =
      typeof position[1] === 'number' && !isNaN(position[1]) ? position[1] : 106.702444;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [initialLat, initialLng],
        zoom: 15,
        zoomControl: true,
        attributionControl: false,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(map);

      const marker = L.marker([initialLat, initialLng], { icon: storeMarkerIcon }).addTo(map);
      marker.bindPopup(
        `
        <div style="font-family: sans-serif; font-size: 12px; color: #0f172a; text-align: center;">
          <strong style="color: #059669; display: block; margin-bottom: 2px;">Vị Trí Nhà Hàng</strong>
          <span>Nhấp lên bản đồ để di chuyển vị trí quán</span>
        </div>
      `,
        { closeButton: false }
      );

      map.on('click', (e: L.LeafletMouseEvent) => {
        handlePositionChange(e.latlng.lat, e.latlng.lng);
      });

      mapInstanceRef.current = map;
      markerRef.current = marker;

      const timer = setTimeout(() => {
        map.invalidateSize();
      }, 250);

      return () => {
        clearTimeout(timer);
        map.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
      };
    } else {
      mapInstanceRef.current.setView([initialLat, initialLng], mapInstanceRef.current.getZoom());
      if (markerRef.current) {
        markerRef.current.setLatLng([initialLat, initialLng]);
      }
    }
  }, []);

  // Sync when prop position changes from outside
  useEffect(() => {
    if (
      position &&
      typeof position[0] === 'number' &&
      typeof position[1] === 'number' &&
      !isNaN(position[0]) &&
      !isNaN(position[1]) &&
      (position[0] !== currentPos[0] || position[1] !== currentPos[1])
    ) {
      setCurrentPos(position);
      if (markerRef.current) {
        markerRef.current.setLatLng(position);
      }
      if (mapInstanceRef.current) {
        mapInstanceRef.current.setView(position, mapInstanceRef.current.getZoom(), {
          animate: true,
        });
      }
    }
  }, [position]);

  const handleUseCurrentLocation = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      alert('Trình duyệt không hỗ trợ định vị GPS.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        handlePositionChange(pos.coords.latitude, pos.coords.longitude);
        setIsLocating(false);
      },
      (err) => {
        console.warn('[Geolocation] Error:', err.message);
        setIsLocating(false);
        setNotice({
          type: 'warn',
          text: 'Không thể lấy vị trí GPS hiện tại của thiết bị. Vui lòng nhấp chọn trực tiếp trên bản đồ.',
        });
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const validPos: [number, number] =
    Array.isArray(currentPos) &&
    typeof currentPos[0] === 'number' &&
    typeof currentPos[1] === 'number' &&
    !isNaN(currentPos[0]) &&
    !isNaN(currentPos[1])
      ? currentPos
      : [10.776192, 106.702444];

  const googleMapsUrl = `https://www.google.com/maps?q=${validPos[0]},${validPos[1]}`;

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Header with Coordinates Info and Quick Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
        <div className="flex items-center gap-2 text-xs">
          <Compass className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-slate-400 font-medium">Tọa độ GPS nhà hàng:</span>
          <span className="font-mono text-emerald-400 font-bold bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
            [{validPos[0].toFixed(6)}, {validPos[1].toFixed(6)}]
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleUseCurrentLocation}
            disabled={isLocating || isGeocoding}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-300 bg-emerald-950/40 hover:bg-emerald-900/50 rounded-lg border border-emerald-500/30 transition-all cursor-pointer disabled:opacity-50"
          >
            {isLocating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
            ) : (
              <Navigation className="w-3.5 h-3.5 text-emerald-400" />
            )}
            <span>Vị trí hiện tại</span>
          </button>

          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-all cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
            <span>Google Maps</span>
          </a>
        </div>
      </div>

      {/* Interactive Map Container */}
      <div className="relative w-full h-64 sm:h-80 rounded-2xl overflow-hidden border border-slate-800 shadow-inner z-0">
        <div ref={mapContainerRef} className="w-full h-full z-0" />
      </div>

      {/* Dynamic Geocoding Feedback */}
      {isGeocoding && (
        <div className="p-2.5 bg-emerald-950/30 border border-emerald-500/30 rounded-xl flex items-center gap-2 text-xs text-emerald-300 animate-in fade-in duration-150">
          <Loader2 className="w-4 h-4 animate-spin text-emerald-400 shrink-0" />
          <span className="font-medium">Đang tự động nhận diện địa chỉ từ tọa độ mới...</span>
        </div>
      )}

      {notice && !isGeocoding && (
        <div
          className={`p-2.5 rounded-xl border flex items-center gap-2 text-xs animate-in fade-in duration-150 ${
            notice.type === 'success'
              ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
              : 'bg-amber-950/30 border-amber-500/40 text-amber-300'
          }`}
        >
          {notice.type === 'success' ? (
            <Wand2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
          )}
          <span className="font-medium">{notice.text}</span>
        </div>
      )}
    </div>
  );
}
