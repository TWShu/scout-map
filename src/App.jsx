import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polygon,
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

function Fly({ position }) {
  const map = useMap();

  useEffect(() => {
    if (position) {
      map.setView(position, map.getZoom(), { animate: false });
    }
  }, [position, map]);

  return null;
}

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
        borderRadius: "10px",
        background: "white",
        border: "none",
        boxShadow: "0 0 8px rgba(0,0,0,0.25)"
      }}
    >
      🎯 回到我
    </button>
  );
}

// 🌐 把 lat/lng 轉成 grid cell（簡化版）
function gridKey(lat, lng, precision) {
  const factor = Math.pow(2, precision);
  return [
    Math.floor(lat * factor),
    Math.floor(lng * factor)
  ];
}

// 🟨 產生 grid polygon
function createCell(lat, lng, size) {
  return [
    [lat, lng],
    [lat + size, lng],
    [lat + size, lng + size],
    [lat, lng + size]
  ];
}

export default function App() {
  const [position, setPosition] = useState([
    25.033964,
    121.564468
  ]);

  const [accuracy, setAccuracy] = useState(null);
  const [speed, setSpeed] = useState(null);

  // 📍 POI（示範資料）
  const pois = [
    { name: "台北101", pos: [25.03397, 121.5645] },
    { name: "信義商圈", pos: [25.035, 121.566] },
    { name: "捷運站", pos: [25.0328, 121.5654] }
  ];

  // GPS
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

  const lat = position[0];
  const lng = position[1];

  // 🟨 L17 / L14 grid size（approx lat/lng degree）
  const L17 = 0.0005; // very small grid
  const L14 = 0.002;  // larger grid

  const grid17 = createCell(lat, lng, L17);
  const grid14 = createCell(lat, lng, L14);

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      {/* HUD */}
      <div
        style={{
          position: "fixed",
          top: 10,
          right: 10,
          zIndex: 9999,
          background: "white",
          padding: 10,
          borderRadius: 10,
          fontSize: 13
        }}
      >
        <div>Lat: {lat.toFixed(6)}</div>
        <div>Lng: {lng.toFixed(6)}</div>
        <div>
          GPS:{" "}
          {accuracy ? `${Math.round(accuracy)}m` : "loading"}
        </div>
        <div>
          Speed:{" "}
          {speed ? `${(speed * 3.6).toFixed(1)} km/h` : "0"}
        </div>
      </div>

      <MapContainer
        center={position}
        zoom={18}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <Fly position={position} />

        {/* 📍 POI layer */}
        {pois.map((p, i) => (
          <Marker key={i} position={p.pos}>
            <Popup>{p.name}</Popup>
          </Marker>
        ))}

        {/* 🟨 L17 grid */}
        <Polygon
          positions={grid17}
          pathOptions={{
            color: "yellow",
            weight: 1,
            fillOpacity: 0.1
          }}
        />

        {/* 🟨 L14 grid */}
        <Polygon
          positions={grid14}
          pathOptions={{
            color: "orange",
            weight: 2,
            fillOpacity: 0.08
          }}
        />

        <Recenter position={position} />
      </MapContainer>
    </div>
  );
}
