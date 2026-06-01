import { useEffect, useState, useMemo } from "react";
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
import S2 from "s2-geometry";

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
        borderRadius: 10,
        background: "white",
        border: "none",
        boxShadow: "0 0 8px rgba(0,0,0,0.25)"
      }}
    >
      🎯 回到我
    </button>
  );
}

// 🧭 S2 cell → polygon
function getCellPolygon(lat, lng, level) {
  const key = S2.latLngToCellId(lat, lng, level);
  const cell = S2.S2Cell.FromHilbertQuadKey(key);

  const vertices = cell.getCornerLatLngs();
  return vertices.map(v => [v.lat, v.lng]);
}

export default function App() {
  const [position, setPosition] = useState([
    25.033964,
    121.564468
  ]);

  const [accuracy, setAccuracy] = useState(null);
  const [speed, setSpeed] = useState(null);

  // 📍 POI（可擴展）
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

  // 🧭 S2 Levels（正式定義）
  const level14 = 14;
  const level17 = 17;

  // 🟨 S2 cells
  const cell14 = useMemo(
    () => getCellPolygon(lat, lng, level14),
    [lat, lng]
  );

  const cell17 = useMemo(
    () => getCellPolygon(lat, lng, level17),
    [lat, lng]
  );

  const cellId14 = S2.latLngToCellId(lat, lng, level14);
  const cellId17 = S2.latLngToCellId(lat, lng, level17);

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
          fontSize: 13,
          minWidth: 180
        }}
      >
        <div>Lat: {lat.toFixed(6)}</div>
        <div>Lng: {lng.toFixed(6)}</div>
        <div>GPS: {accuracy ? `${Math.round(accuracy)}m` : "-"}</div>
        <div>Speed: {speed ? `${(speed * 3.6).toFixed(1)} km/h` : "0"}</div>
        <hr />
        <div>🟨 L14: {cellId14}</div>
        <div>🟨 L17: {cellId17}</div>
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

        {/* 📍 POI */}
        {pois.map((p, i) => (
          <Marker key={i} position={p.pos}>
            <Popup>{p.name}</Popup>
          </Marker>
        ))}

        {/* 🟨 S2 L14 */}
        <Polygon
          positions={cell14}
          pathOptions={{
            color: "orange",
            weight: 2,
            fillOpacity: 0.08
          }}
        />

        {/* 🟨 S2 L17 */}
        <Polygon
          positions={cell17}
          pathOptions={{
            color: "yellow",
            weight: 1,
            fillOpacity: 0.12
          }}
        />

        <Recenter position={position} />
      </MapContainer>
    </div>
  );
}
