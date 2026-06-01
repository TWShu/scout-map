import { useEffect, useMemo, useState } from "react";
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
// S2 fallback（避免 crash）
// ------------------------------
let S2 = null;
try {
  S2 = require("s2-geometry");
} catch (e) {
  console.log("S2 fallback mode");
}

function fakeCell(lat, lng, level) {
  const scale = level === 14 ? 10000 : 100000;
  return `${Math.floor(lat * scale)}_${Math.floor(lng * scale)}_L${level}`;
}

// ------------------------------
// 地圖初始化（避免跳動）
// ------------------------------
function MapInit({ position }) {
  const map = useMap();

  useEffect(() => {
    map.setView(position, map.getZoom(), {
      animate: false
    });
  }, []);

  return null;
}

// ------------------------------
// 跟隨模式（可開關）
// ------------------------------
function FollowMode({ position, follow }) {
  const map = useMap();

  useEffect(() => {
    if (follow) {
      map.setView(position, map.getZoom(), {
        animate: false
      });
    }
  }, [position, follow]);

  return null;
}

// ------------------------------
// 回到我
// ------------------------------
function Recenter({ position }) {
  const map = useMap();

  return (
    <button
      onClick={() =>
        map.setView(position, map.getZoom(), {
          animate: false
        })
      }
      style={{
        position: "fixed",
        bottom: 20,
        right: 20,
        zIndex: 9999,
        padding: "10px 12px",
        borderRadius: 10,
        background: "white",
        border: "none",
        boxShadow: "0 0 8px rgba(0,0,0,0.25)",
        cursor: "pointer"
      }}
    >
      🎯 回到我
    </button>
  );
}

export default function App() {
  const [position, setPosition] = useState([
    25.033964,
    121.564468
  ]);

  const [accuracy, setAccuracy] = useState(null);
  const [speed, setSpeed] = useState(null);

  // 🎮 follow toggle
  const [follow, setFollow] = useState(false);

  // 📊 HUD 折疊
  const [hudOpen, setHudOpen] = useState(true);

  // 🌼 POI
  const pois = [
    { name: "🌼 花點", pos: [25.03397, 121.5645] },
    { name: "🍄 菇點", pos: [25.035, 121.566] },
    { name: "🌳 公園", pos: [25.0328, 121.5654] }
  ];

  // GPS
  useEffect(() => {
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        setPosition([
          pos.coords.latitude,
          pos.coords.longitude
        ]);

        setAccuracy(pos.coords.accuracy);
        setSpeed(pos.coords.speed);
      },
      (err) => console.log(err),
      {
        enableHighAccuracy: true,
        maximumAge: 1000
      }
    );

    return () => navigator.geolocation.clearWatch(id);
  }, []);

  const lat = position[0];
  const lng = position[1];

  // 🟨 S2
  const cell14 =
    S2?.latLngToKey
      ? S2.latLngToKey(lat, lng, 14)
      : fakeCell(lat, lng, 14);

  const cell17 =
    S2?.latLngToKey
      ? S2.latLngToKey(lat, lng, 17)
      : fakeCell(lat, lng, 17);

  return (
    <div style={{ width: "100vw", height: "100vh" }}>

      {/* 📊 HUD（可縮放） */}
      <div
        style={{
          position: "fixed",
          top: 10,
          right: 10,
          zIndex: 9999,
          background: "white",
          borderRadius: 10,
          boxShadow: "0 0 10px rgba(0,0,0,0.2)",
          width: hudOpen ? 200 : 40,
          transition: "0.2s",
          overflow: "hidden",
          fontSize: 13
        }}
      >
        {/* header */}
        <div
          onClick={() => setHudOpen(!hudOpen)}
          style={{
            padding: 8,
            cursor: "pointer",
            fontWeight: "bold",
            textAlign: "center",
            borderBottom: hudOpen ? "1px solid #eee" : "none"
          }}
        >
          📍
        </div>

        {/* content */}
        {hudOpen && (
          <div style={{ padding: 10 }}>
            <div>Lat: {lat.toFixed(6)}</div>
            <div>Lng: {lng.toFixed(6)}</div>
            <div>
              GPS: {accuracy ? `${Math.round(accuracy)}m` : "-"}
            </div>
            <div>
              Speed: {speed ? `${(speed * 3.6).toFixed(1)} km/h` : "0"}
            </div>

            <hr />

            <div>🟨 L14: {cell14}</div>
            <div>🟨 L17: {cell17}</div>

            <hr />

            <button
              onClick={() => setFollow(!follow)}
              style={{
                width: "100%",
                padding: 6,
                borderRadius: 8,
                border: "none",
                background: follow ? "#4ade80" : "#e5e7eb",
                cursor: "pointer"
              }}
            >
              {follow ? "📍 跟隨" : "🧭 自由"}
            </button>
          </div>
        )}
      </div>

      {/* 🗺 地圖 */}
      <MapContainer
        center={position}
        zoom={18}
        style={{ width: "100%", height: "100%" }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapInit position={position} />
        <FollowMode position={position} follow={follow} />

        {/* 📍 POI */}
        {pois.map((p, i) => (
          <Marker key={i} position={p.pos}>
            <Popup>{p.name}</Popup>
          </Marker>
        ))}

        <Recenter position={position} />
      </MapContainer>
    </div>
  );
}
