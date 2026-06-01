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

// ---------------- icon fix ----------------
delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png"
});

// ---------------- map controller (核心) ----------------
function MapSync({ position, follow }) {
  const map = useMap();

  useEffect(() => {
    if (follow && position) {
      map.setView(position, map.getZoom());
    }
  }, [position, follow, map]);

  return null;
}

export default function App() {
  const [position, setPosition] = useState([
    25.033964,
    121.564468
  ]);

  const [accuracy, setAccuracy] = useState(null);

  const [follow, setFollow] = useState(true);

  // 📍 GPS
  useEffect(() => {
    if (!navigator.geolocation) return;

    const id = navigator.geolocation.watchPosition((pos) => {
      setPosition([
        pos.coords.latitude,
        pos.coords.longitude
      ]);

      setAccuracy(pos.coords.accuracy);
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
          left: 10,
          zIndex: 99999,
          background: "white",
          padding: 10,
          borderRadius: 10,
          fontSize: 12
        }}
      >
        📍 {position[0].toFixed(6)}, {position[1].toFixed(6)}
        <br />
        🎯 精度: {accuracy ? Math.round(accuracy) + "m" : "-"}
      </div>

      {/* 🎯 回到我（100%有效） */}
      <button
        onClick={() => setFollow(true)}
        style={{
          position: "absolute",
          bottom: 20,
          right: 20,
          zIndex: 99999,
          padding: "12px 16px",
          borderRadius: 12,
          border: "none",
          background: "#111",
          color: "white"
        }}
      >
        🎯 回到我
      </button>

      {/* 🔘 跟隨切換 */}
      <button
        onClick={() => setFollow((v) => !v)}
        style={{
          position: "absolute",
          bottom: 80,
          right: 20,
          zIndex: 99999,
          padding: "10px 14px",
          borderRadius: 12,
          border: "none",
          background: follow ? "green" : "gray",
          color: "white"
        }}
      >
        {follow ? "跟隨 ON" : "跟隨 OFF"}
      </button>

      {/* 🗺 Map */}
      <MapContainer
        center={position}
        zoom={18}
        style={{ width: "100%", height: "100%" }}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        <Marker position={position}>
          <Popup>你在這裡</Popup>
        </Marker>

        {/* 🧠 關鍵控制層 */}
        <MapSync position={position} follow={follow} />
      </MapContainer>
    </div>
  );
}
