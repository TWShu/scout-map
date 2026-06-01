import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Leaflet icon fix
delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// 🧭 Fake S2（安全版，不會炸）
function fakeCell(lat, lng, level) {
  const scale = Math.pow(10, (level === 14 ? 4 : 5));
  return `${Math.floor(lat * scale)}_${Math.floor(lng * scale)}_L${level}`;
}

// 📍 地圖跟隨使用者（無動畫，避免飄）
function Follow({ position }) {
  const map = useMap();

  useEffect(() => {
    if (position) {
      map.setView(position, map.getZoom(), { animate: false });
    }
  }, [position, map]);

  return null;
}

// 🎯 回到我
function Recenter({ position }) {
  const map = useMap();

  return (
    <button
      onClick={() =>
        map.setView(position, map.getZoom(), { animate: false })
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
  const [heading, setHeading] = useState(0);

  // 📍 GPS
  useEffect(() => {
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        setPosition([
          pos.coords.latitude,
          pos.coords.longitude
        ]);
        setAccuracy(pos.coords.accuracy ?? null);
        setSpeed(pos.coords.speed ?? null);
      },
      (err) => console.log("GPS error:", err),
      {
        enableHighAccuracy: true,
        maximumAge: 1000
      }
    );

    return () => navigator.geolocation.clearWatch(id);
  }, []);

  // 🧭 羅盤（安全）
  useEffect(() => {
    const handler = (e) => {
      if (typeof e.alpha === "number") {
        setHeading(e.alpha);
      }
    };

    window.addEventListener("deviceorientation", handler, true);

    return () => {
      window.removeEventListener("deviceorientation", handler, true);
    };
  }, []);

  const lat = position[0];
  const lng = position[1];

  // 🟨 L14 / L17 cell
  const cell14 = fakeCell(lat, lng, 14);
  const cell17 = fakeCell(lat, lng, 17);

  // 📍 POI（示範）
  const pois = [
    { name: "台北101", pos: [25.03397, 121.5645] },
    { name: "信義商圈", pos: [25.035, 121.566] },
    { name: "捷運站", pos: [25.0328, 121.5654] }
  ];

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
          padding: 10,
          borderRadius: 10,
          fontSize: 13,
          minWidth: 180
        }}
      >
        <div>Lat: {lat.toFixed(6)}</div>
        <div>Lng: {lng.toFixed(6)}</div>
        <div>
          GPS: {accuracy ? `${Math.round(accuracy)} m` : "-"}
        </div>
        <div>
          Speed: {speed ? `${(speed * 3.6).toFixed(1)} km/h` : "0"}
        </div>

        <hr />

        <div>🟨 L14: {cell14}</div>
        <div>🟨 L17: {cell17}</div>
      </div>

      <MapContainer
        center={position}
        zoom={18}
        style={{ width: "100%", height: "100%" }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <Follow position={position} />

        {/* 📍 POI */}
        {pois.map((p, i) => (
          <Marker key={i} position={p.pos}>
            <Popup>{p.name}</Popup>
          </Marker>
        ))}

        <Recenter position={position} />
      </MapContainer>

      {/* 🧭 羅盤 */}
      <div
        style={{
          position: "fixed",
          bottom: 20,
          right: 140,
          zIndex: 9999,
          width: 60,
          height: 60,
          borderRadius: "50%",
          background: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 22,
          transform: `rotate(${heading}deg)`,
          boxShadow: "0 0 8px rgba(0,0,0,0.25)"
        }}
      >
        🧭
      </div>
    </div>
  );
}
