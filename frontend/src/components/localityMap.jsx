import React, { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

// Custom glowing marker (blue pulse)
const glowIcon = L.divIcon({
  className: "aura-map-marker",
  html: `
    <div class="aura-marker-wrap">
      <span class="aura-marker-pulse"></span>
      <span class="aura-marker-core"></span>
    </div>
  `,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
  popupAnchor: [0, -14],
});

const DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconAnchor: [12, 41],
  iconSize: [25, 41],
  popupAnchor: [1, -34],
});
L.Marker.prototype.options.icon = DefaultIcon;

function MapUpdater({ center }) {
  const map = useMap();

  useEffect(() => {
    if (!center) return;
    map.setView(center, 13);
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 150);
    return () => clearTimeout(timer);
  }, [center, map]);

  return null;
}

export default function LocalityMap({ coords, locationName, configuration }) {
  const center = coords && coords.length === 2 ? coords : [19.076, 72.8777];

  return (
    <div style={{ height: "100%", width: "100%", position: "relative" }}>
      <style>{`
        .aura-map-marker {
          background: transparent !important;
          border: none !important;
        }
        .aura-marker-wrap {
          position: relative;
          width: 28px;
          height: 28px;
        }
        .aura-marker-core {
          position: absolute;
          left: 50%;
          top: 50%;
          width: 14px;
          height: 14px;
          margin: -7px 0 0 -7px;
          border-radius: 50%;
          background: #3b82f6;
          border: 2px solid #93c5fd;
          box-shadow: 0 0 12px 4px rgba(59, 130, 246, 0.85),
                      0 0 24px 8px rgba(37, 99, 235, 0.45);
          z-index: 2;
        }
        .aura-marker-pulse {
          position: absolute;
          left: 50%;
          top: 50%;
          width: 28px;
          height: 28px;
          margin: -14px 0 0 -14px;
          border-radius: 50%;
          background: rgba(59, 130, 246, 0.35);
          animation: aura-pulse 1.8s ease-out infinite;
          z-index: 1;
        }
        @keyframes aura-pulse {
          0%   { transform: scale(0.55); opacity: 0.9; }
          70%  { transform: scale(1.35); opacity: 0.15; }
          100% { transform: scale(1.5);  opacity: 0; }
        }
      `}</style>

      <MapContainer
        center={center}
        zoom={13}
        scrollWheelZoom={false}
        style={{
          height: "100%",
          width: "100%",
          position: "absolute",
          top: 0,
          left: 0,
          borderRadius: "12px",
          background: "#0a0a0a",
        }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        <MapUpdater center={center} />

        <Marker position={center} icon={glowIcon}>
          <Popup>
            <strong>{locationName || "Location"}</strong>
            <br />
            {configuration || ""}
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}
