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

delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function FlyToLocation({ position }) {
  const map = useMap();

  useEffect(() => {
    if (position) {
      map.flyTo(position, map.getZoom());
    }
  }, [position, map]);

  return null;
}

function RecenterButton({ position }) {
  const map = useMap();

  return (
    <button
      onClick={() => map.flyTo(position, map.getZoom())}
      style={{
        position: "absolute",
        bottom: 20,
        right: 20,
        zIndex: 1000,
        padding: "10px 12px",
        borderRadius: "10px",
        border: "none",
        background: "#fff",
        boxShadow: "0 0 6px rgba(0,0,0,0.3)",
        cursor: "pointer",
        fontSize: "14px"
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

  // GPS
  useEffect(() => {
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setPosition([
          pos.coords.latitude,
          pos.coords.longitude
        ]);

        setAccuracy(pos.coords.accuracy);
        setSpeed(pos.coords.speed);
      },
      (err) => console.error(err),
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 1000
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  // 羅盤（手機方向）
  useEffect(() => {
    const handler = (e) => {
      if (e.alpha !== null) {
        setHeading(e.alpha);
      }
    };

    window.addEventListener("deviceorientation", handler);

    return () => {
      window.removeEventListener("deviceorientation", handler);
    };
  }, []);

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        position: "relative"
      }}
    >
      {/* 右上角資訊 */}
      <div
        style={{
          position: "absolute",
          top: 10,
          right: 10,
          zIndex: 1000,
          background: "white",
          padding: "10px",
          borderRadius: "8px",
          boxShadow: "0 0 5px rgba(0,0,0,0.3)",
          fontSize: "13px",
          minWidth: "160px"
        }}
      >
        <div><strong>Lat:</strong> {position[0].toFixed(6)}</div>
        <div><strong>Lng:</strong> {position[1].toFixed(6)}</div>
        <div>
          <strong>GPS 精度:</strong>{" "}
          {accuracy ? `${Math.round(accuracy)} m` : "取得中..."}
        </div>
        <div>
          <strong>速度:</strong>{" "}
          {speed ? `${(speed * 3.6).toFixed(1)} km/h` : "0 km/h"}
        </div>
      </div>

      <MapContainer
        center={position}
        zoom={18}
        style={{ width: "100%", height: "100%" }}
      >
        <TileLayer
          attribution="© OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <FlyToLocation position={position} />

        <Marker position={position}>
          <Popup>目前位置</Popup>
        </Marker>

        {/* 🎯 回到我 */}
        <RecenterButton position={position} />
      </MapContainer>

      {/* 🧭 羅盤 */}
      <div
        style={{
          position: "absolute",
          bottom: 20,
          right: 140,
          zIndex: 1000,
          width: "60px",
          height: "60px",
          borderRadius: "50%",
          background: "white",
          boxShadow: "0 0 6px rgba(0,0,0,0.3)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "24px",
          transform: `rotate(${heading}deg)`
        }}
      >
        🧭
      </div>
    </div>
  );
          }
