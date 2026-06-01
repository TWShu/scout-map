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

// ---------------- main app ----------------
export default function App() {
  const [position, setPosition] = useState([
    25.033964,
    121.564468
  ]);

  const [accuracy, setAccuracy] = useState(null);

  const mapRef = useRef(null);

  // 🧠 關鍵：是否跟隨玩家
  const followRef = useRef(true);

  // 📍 GPS
  useEffect(() => {
    if (!navigator.geolocation) return;

    const id = navigator.geolocation.watchPosition((pos) => {
      const newPos = [
        pos.coords.latitude,
        pos.coords.longitude
      ];

      setPosition(newPos);
      setAccuracy(pos.coords.accuracy);

      // 🟢 只有「跟隨模式」才會移動地圖
      if (followRef.current && mapRef.current) {
        mapRef.current.setView(newPos, mapRef.current.getZoom());
      }
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

      {/* 🎯 回到我 */}
      <button
        onClick={() => {
          if (mapRef.current) {
            mapRef.current.setView(position, 18, {
              animate: true
            });
          }

          followRef.current = true; // 回到我 = 開啟跟隨
        }}
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
        onClick={() => {
          followRef.current = !followRef.current;
        }}
        style={{
          position: "absolute",
          bottom: 80,
          right: 20,
          zIndex: 99999,
          padding: "10px 14px",
          borderRadius: 12,
          border: "none",
          background: followRef.current ? "green" : "gray",
          color: "white"
        }}
      >
        {followRef.current ? "跟隨 ON" : "跟隨 OFF"}
      </button>

      {/* 🗺 Map */}
      <MapContainer
        center={position}
        zoom={18}
        style={{ width: "100%", height: "100%" }}
        whenCreated={(map) => (mapRef.current = map)}
        onDragStart={() => {
          // 🟡 一拖動 → 自動關掉跟隨
          followRef.current = false;
        }}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        <Marker position={position}>
          <Popup>你在這裡</Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}
