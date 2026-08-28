import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { MapPin, ExternalLink } from 'lucide-react';

interface RestaurantLocationMapProps {
  latitude: number;
  longitude: number;
  restaurantName?: string;
  address?: string;
}

export const RestaurantLocationMap: React.FC<RestaurantLocationMapProps> = ({
  latitude,
  longitude,
  restaurantName,
  address,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Validate coordinates
    if (
      typeof latitude !== 'number' ||
      typeof longitude !== 'number' ||
      isNaN(latitude) ||
      isNaN(longitude)
    ) {
      return;
    }

    // Initialize Map if not already initialized
    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [latitude, longitude],
        zoom: 16,
        zoomControl: true,
        attributionControl: false,
      });

      // Tile Layer: CartoDB Voyager (CDN fast, no DNS blocking)
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        subdomains: 'abcd',
        maxZoom: 20,
      }).addTo(map);

      // Custom Pin Marker Icon
      const customIcon = L.divIcon({
        className: 'custom-leaflet-marker',
        html: `
          <div style="
            position: relative;
            width: 38px;
            height: 38px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #f59e0b, #ea580c);
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            border: 2.5px solid #ffffff;
            box-shadow: 0 4px 14px rgba(234, 88, 12, 0.45);
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

      const marker = L.marker([latitude, longitude], { icon: customIcon }).addTo(map);

      if (restaurantName || address) {
        marker
          .bindPopup(
            `
            <div style="font-family: sans-serif; font-size: 12px; color: #0f172a; max-width: 200px;">
              <strong style="font-size: 13px; color: #ea580c; display: block; margin-bottom: 2px;">${
                restaurantName || 'Nhà hàng'
              }</strong>
              <span style="color: #475569; display: block; font-size: 11px;">${address || ''}</span>
              <span style="font-family: monospace; color: #64748b; font-size: 10px; margin-top: 4px; display: block;">[${latitude.toFixed(
                6
              )}, ${longitude.toFixed(6)}]</span>
            </div>
          `,
            { closeButton: false }
          )
          .openPopup();
      }

      mapInstanceRef.current = map;

      // Invalidate size after modal rendering transition
      const timer = setTimeout(() => {
        map.invalidateSize();
      }, 250);

      return () => {
        clearTimeout(timer);
        map.remove();
        mapInstanceRef.current = null;
      };
    } else {
      mapInstanceRef.current.setView([latitude, longitude], 16);
    }
  }, [latitude, longitude, restaurantName, address]);

  const googleMapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;

  return (
    <div className="space-y-2 mt-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-amber-400 font-bold">
          <MapPin className="w-3.5 h-3.5 text-amber-400" />
          <span>Vị Trí Cửa Hàng Trên Bản Đồ (OpenStreetMap)</span>
        </div>
        <a
          href={googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 hover:underline font-semibold"
        >
          <span>Mở trên Google Maps</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      <div className="w-full h-56 sm:h-64 rounded-2xl overflow-hidden border border-slate-800 shadow-inner relative z-0">
        <div ref={mapContainerRef} className="w-full h-full" />
      </div>
    </div>
  );
};
