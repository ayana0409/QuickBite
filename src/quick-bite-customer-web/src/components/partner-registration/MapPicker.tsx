"use client";

import React, { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icon issues in Next.js bundler
const markerIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface MapPickerProps {
  position: [number, number];
  setPosition: (pos: [number, number]) => void;
  zoom?: number;
}

/**
 * Controller sub-component to handle map clicks and sync camera center with position changes
 */
function MapClickHandler({ position, setPosition }: { position: [number, number]; setPosition: (pos: [number, number]) => void }) {
  const map = useMap();

  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 200);

    if (
      position &&
      typeof position[0] === "number" &&
      typeof position[1] === "number" &&
      !isNaN(position[0]) &&
      !isNaN(position[1])
    ) {
      map.setView(position, map.getZoom(), { animate: true });
    }

    return () => clearTimeout(timer);
  }, [position, map]);

  useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng]);
    },
  });

  return null;
}

export default function MapPicker({ position, setPosition, zoom = 14 }: MapPickerProps) {
  // Validate coordinates to prevent leaflet crash
  const validPosition: [number, number] =
    Array.isArray(position) &&
    typeof position[0] === "number" &&
    typeof position[1] === "number" &&
    !isNaN(position[0]) &&
    !isNaN(position[1])
      ? position
      : [10.776192, 106.702444];

  return (
    <div className="relative w-full h-72 sm:h-80 rounded-2xl overflow-hidden border border-slate-200/90 shadow-inner z-0">
      <MapContainer
        center={validPosition}
        zoom={zoom}
        scrollWheelZoom={true}
        className="w-full h-full z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          subdomains="abcd"
          maxZoom={20}
        />

        <Marker position={validPosition} icon={markerIcon}>
          <Popup>
            <div className="text-center font-sans text-xs">
              <strong className="text-orange-600 block mb-0.5">Vị trí nhà hàng</strong>
              <span>Click vào bản đồ để đổi vị trí</span>
            </div>
          </Popup>
        </Marker>

        <MapClickHandler position={validPosition} setPosition={setPosition} />
      </MapContainer>
    </div>
  );
}
