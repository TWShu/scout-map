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
// follow mode（可開關）
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

  const [follow, setFollow] = useState(false);
  const [hudOpen, setHudOpen] = useState(true);

  // 🌼 POI（花 / 菇狀態）
  const [pois, setPois] = useState([
    {
      id: 1,
      type: "flower",
      name: "🌼 花點 A",
      pos: [25.03397, 121.5645],
      cooldown: 0
    },
    {
      id: 2,
      type: "mushroom",
      name: "🍄 菇點 B",
      pos: [25.035, 121.566],
      cooldown: 0
    }
  ]);

  // 📍 GPS
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
  const cell14 = S2?.latLngToKey
    ? S2.latLngToKey(lat, lng, 14)
    : fakeCell(lat, lng, 14);

  const cell17 = S2?.latLngToKey
    ? S2.latLngToKey(lat, lng, 17)
    : fakeCell(lat, lng, 17);

  // 🌡 heat（附近 POI）
  const heat = useMemo(() => {
    let count = 0;

    pois.forEach((p) => {
      const dx = p.pos[0] - lat;
      const dy = p.pos[1] - lng;
      if (Math.sqrt(dx * dx + dy * dy) < 0.002) {
        count++;
      }
    });

    return count;
  }, [lat, lng, pois]);

  // 🎮 POI interaction
  function interactPOI(id) {
    setPois((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        if (p.cooldown > 0) return p;

        return {
          ...p,
          cooldown: p.type === "flower" ? 10 : 20
        };
      })
    );
  }

  // ⏳ cooldown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setPois((prev) =>
        prev.map((p) => ({
          ...p,
          cooldown: Math.max(0, p.cooldown - 1)
        }))
      );
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div style={{ width: "100vw", height: "100vh" }}>

      {/* 📊 HUD */}
      <div
        style={{
          position: "fixed",
          top: 10,
          right: 10,
          zIndex: 9999,
          background: "white",
          borderRadius: 10,
          boxShadow: "0 0 10px rgba(0,0,0,0.2)",
          width: hudOpen ? 220 : 40,
          overflow: "hidden",
          transition: "0.2s"
        }}
      >
        <div
          onClick={() => setHudOpen(!hudOpen)}
          style={{
            padding: 8,
            cursor: "pointer",
            textAlign: "center"
          }}
        >
          📍
        </div>

        {hudOpen && (
          <div style={{ padding: 10, fontSize: 13 }}>
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

            <div>🌡 Heat: {heat}</div>

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
              {follow ? "📍 跟隨模式" : "🧭 自由模式"}
            </button>
          </div>
        )}
      </div>

      {/* 🗺 MAP */}
      <MapContainer
        center={position}
        zoom={18}
        style={{ width: "100%", height: "100%" }}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        <MapInit position={position} />
        <FollowMode position={position} follow={follow} />

        {/* 🌼 POI */}
        {pois.map((p) => (
          <Marker
            key={p.id}
            position={p.pos}
            eventHandlers={{
              click: () => interactPOI(p.id)
            }}
          >
            <Popup>
              <b>{p.name}</b>
              <br />

              {p.cooldown === 0 ? (
                <span style={{ color: "green" }}>✅ 可用</span>
              ) : (
                <span style={{ color: "red" }}>
                  ⏳ 冷卻 {p.cooldown}s
                </span>
              )}
            </Popup>
          </Marker>
        ))}

        <Recenter position={position} />
      </MapContainer>
    </div>
  );
}
