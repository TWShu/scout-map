import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap
} from "react-leaflet";

import "leaflet/dist/leaflet.css";
import L from "leaflet";

// ---------------- Leaflet icon fix ----------------
delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png"
});

// ---------------- Map Controller ----------------
function MapController({ position }) {
  const map = useMap();

  useEffect(() => {
    if (position) {
      map.setView(position);
    }
  }, [position, map]);

  return null;
}

// ---------------- Main App ----------------
export default function App() {
  const [position, setPosition] = useState([
    25.033964,
    121.564468
  ]);

  const [accuracy, setAccuracy] = useState(null);
  const [speed, setSpeed] = useState(null);

  const map = useMapSafe();

  // 📍 GPS
  useEffect(() => {
    const id = navigator.geolocation.watchPosition((pos) => {
      setPosition([
        pos.coords.latitude,
        pos.coords.longitude
      ]);

      setAccuracy(pos.coords.accuracy);
      setSpeed(pos.coords.speed);
    });

    return () => navigator.geolocation.clearWatch(id);
  }, []);

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative" }}>

      {/* 🧭 HUD */}
      <div
        style={{
          position: "absolute",
          top: 10,
          right: 10,
          zIndex: 999,
          background: "white",
          padding: 10,
          borderRadius: 10,
          fontSize: 12
        }}
      >
        <div>📍 Lat: {position[0].toFixed(6)}</div>
        <div>📍 Lng: {position[1].toFixed(6)}</div>
        <div>🎯 精度: {accuracy ? `${Math.round(accuracy)}m` : "-"}</div>
        <div>🚀 速度: {speed ? `${speed.toFixed(1)} m/s` : "-"}</div>
      </div>

      {/* 🎯 回到我（關鍵修復） */}
      <button
        onClick={() => {
          map?.setView(position, 18, {
            animate: true
          });
        }}
        style={{
          position: "absolute",
          bottom: 20,
          right: 20,
          zIndex: 999,
          padding: "10px 14px",
          borderRadius: 12,
          border: "none",
          background: "#111",
          color: "white"
        }}
      >
        🎯 回到我
      </button>

      {/* 🗺 地圖 */}
      <MapContainer
        center={position}
        zoom={18}
        style={{ width: "100%", height: "100%" }}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        <Marker position={position}>
          <Popup>你在這裡</Popup>
        </Marker>

        <MapController position={position} />
      </MapContainer>
    </div>
  );
}

// ---------------- safe hook ----------------
function useMapSafe() {
  try {
    return useMap();
  } catch {
    return null;
  }
}
