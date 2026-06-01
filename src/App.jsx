import { useEffect, useState, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap
} from "react-leaflet";

import "leaflet/dist/leaflet.css";
import L from "leaflet";

// ------------------------------
// Leaflet icon fix
// ------------------------------
delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png"
});

// ------------------------------
// 🎯 回到我（不飛太誇張版本）
// ------------------------------
function FlyToMe({ position }) {
  const map = useMap();

  const firstLoad = useRef(true);

  useEffect(() => {
    if (!position) return;

    // 👉 只在第一次載入飛過去，避免一直跳
    if (firstLoad.current) {
      map.setView(position, 18);
      firstLoad.current = false;
    }
  }, [position, map]);

  return null;
}

export default function App() {
  const [position, setPosition] = useState([
    25.033964,
    121.564468
  ]);

  const [accuracy, setAccuracy] = useState(null);
  const [speed, setSpeed] = useState(null);

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

  // 🎯 回到我（手動）
  const mapRef = useRef(null);

  function goToMe() {
    if (mapRef.current) {
      mapRef.current.setView(position, 18, {
        animate: true
      });
    }
  }

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative" }}>

      {/* 🧭 右上 HUD */}
      <div
        style={{
          position: "absolute",
          top: 10,
          right: 10,
          zIndex: 999,
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

      {/* 🎯 回到我 */}
      <button
        onClick={goToMe}
        style={{
          position: "absolute",
          bottom: 20,
          right: 20,
          zIndex: 999,
          padding: "10px 14px",
          borderRadius: 12,
          border: "none",
          background: "#111",
          color: "white",
          fontSize: 14
        }}
      >
        🎯 回到我
      </button>

      {/* 🗺 地圖 */}
      <MapContainer
        center={position}
        zoom={18}
        style={{ width: "100%", height: "100%" }}
        whenCreated={(map) => (mapRef.current = map)}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        {/* 📍 玩家位置 */}
        <Marker position={position}>
          <Popup>你在這裡</Popup>
        </Marker>

        {/* 🧭 控制 fly only once */}
        <FlyToMe position={position} />
      </MapContainer>
    </div>
  );
}
