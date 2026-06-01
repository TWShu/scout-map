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

// ---------------- helper: map fly ----------------
function FlyToMe({ position }) {
  const map = useMap();

  useEffect(() => {
    if (position) {
      map.setView(position, 18);
    }
  }, [position]);

  return null;
}

export default function App() {
  const [position, setPosition] = useState([
    25.033964,
    121.564468
  ]);

  const [mapRef, setMapRef] = useState(null);
  const [accuracy, setAccuracy] = useState(null);

  // 📍 GPS
  useEffect(() => {
    navigator.geolocation.watchPosition((pos) => {
      setPosition([
        pos.coords.latitude,
        pos.coords.longitude
      ]);
      setAccuracy(pos.coords.accuracy);
    });
  }, []);

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative" }}>

      {/* 🧭 HUD（一定看得到） */}
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
        📍 {position[0].toFixed(6)} , {position[1].toFixed(6)}
        <br />
        🎯 精度: {accuracy ? Math.round(accuracy) + "m" : "-"}
      </div>

      {/* 🎯 回到我（關鍵：放在 MapContainer 外面） */}
      <button
        onClick={() => {
          if (mapRef) {
            mapRef.setView(position, 18, {
              animate: true
            });
          }
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
          color: "white",
          fontSize: 14
        }}
      >
        🎯 回到我
      </button>

      {/* 🔍 zoom */}
      <div
        style={{
          position: "absolute",
          top: 10,
          right: 10,
          zIndex: 99999,
          display: "flex",
          flexDirection: "column",
          gap: 8
        }}
      >
        <button
          onClick={() => mapRef?.zoomIn()}
          style={{ width: 40, height: 40 }}
        >
          +
        </button>

        <button
          onClick={() => mapRef?.zoomOut()}
          style={{ width: 40, height: 40 }}
        >
          -
        </button>
      </div>

      {/* 🗺 Map */}
      <MapContainer
        center={position}
        zoom={18}
        style={{ width: "100%", height: "100%" }}
        whenCreated={(map) => setMapRef(map)}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        <Marker position={position}>
          <Popup>你在這裡</Popup>
        </Marker>

        <FlyToMe position={position} />
      </MapContainer>
    </div>
  );
}
