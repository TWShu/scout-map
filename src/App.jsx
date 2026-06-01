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

// ---------------- Map Controls ----------------
function MapControls({ position }) {
  const map = useMap();

  return (
    <>
      {/* 🎯 回到我 */}
      <button
        onClick={() => map.setView(position, 18, { animate: true })}
        style={{
          position: "absolute",
          bottom: 20,
          right: 20,
          zIndex: 9999,
          padding: "10px 14px",
          borderRadius: 12,
          border: "none",
          background: "#111",
          color: "white"
        }}
      >
        🎯 回到我
      </button>

      {/* 🔍 自訂縮放控制 */}
      <div
        style={{
          position: "absolute",
          top: 10,
          right: 10,
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          gap: 6
        }}
      >
        <button
          onClick={() => map.zoomIn()}
          style={{
            width: 40,
            height: 40,
            borderRadius: 8,
            border: "none",
            fontSize: 18
          }}
        >
          +
        </button>

        <button
          onClick={() => map.zoomOut()}
          style={{
            width: 40,
            height: 40,
            borderRadius: 8,
            border: "none",
            fontSize: 18
          }}
        >
          -
        </button>
      </div>
    </>
  );
}

// ---------------- Main App ----------------
export default function App() {
  const [position, setPosition] = useState([
    25.033964,
    121.564468
  ]);

  const [accuracy, setAccuracy] = useState(null);
  const [speed, setSpeed] = useState(null);

  // 📍 GPS
  useEffect(() => {
    if (!navigator.geolocation) return;

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

      {/* 🧭 HUD（右上資訊） */}
      <div
        style={{
          position: "absolute",
          top: 10,
          left: 10,
          zIndex: 9999,
          background: "white",
          padding: 10,
          borderRadius: 10,
          fontSize: 12,
          boxShadow: "0 2px 8px rgba(0,0,0,0.2)"
        }}
      >
        <div>📍 Lat: {position[0].toFixed(6)}</div>
        <div>📍 Lng: {position[1].toFixed(6)}</div>
        <div>🎯 精度: {accuracy ? `${Math.round(accuracy)}m` : "-"}</div>
        <div>🚀 速度: {speed ? `${speed.toFixed(1)} m/s` : "-"}</div>
      </div>

      {/* 🗺 地圖 */}
      <MapContainer
        center={position}
        zoom={18}
        zoomControl={false}   // ❗ 關掉預設 zoom（避免重疊）
        style={{ width: "100%", height: "100%" }}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        <Marker position={position}>
          <Popup>你在這裡</Popup>
        </Marker>

        {/* 🧭 控制 UI */}
        <MapControls position={position} />
      </MapContainer>
    </div>
  );
}
