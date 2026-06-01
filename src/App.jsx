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

// fix leaflet icon
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

        setAccuracy(pos.coords.accuracy ?? null);
        setSpeed(pos.coords.speed ?? null);
      },
      (err) => console.error("GPS error:", err),
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 1000
      }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // Compass（安全版）
  useEffect(() => {
    const handler = (e) => {
      if (typeof e.alpha === "number") {
        setHeading(e.alpha);
      }
    };

    const start = async () => {
      try {
        if (
          typeof DeviceOrientationEvent !== "undefined" &&
          typeof DeviceOrientationEvent.requestPermission === "function"
        ) {
          const res = await DeviceOrientationEvent.requestPermission();
          if (res === "granted") {
            window.addEventListener("deviceorientation", handler, true);
          }
        } else {
          window.addEventListener("deviceorientation", handler, true);
        }
      } catch (e) {
        console.log("Compass not available");
      }
    };

    start();

    return () => {
      window.removeEventListener("deviceorientation", handler, true);
    };
  }, []);

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative" }}>

      {/* 🧭 右上角 HUD */}
      <div
        style={{
          position: "fixed",
          top: 10,
          right: 10,
          zIndex: 9999,
          background: "white",
          padding: "10px 12px",
          borderRadius: "10px",
          boxShadow: "0 0 8px rgba(0,0,0,0.25)",
          fontSize: "13px",
          minWidth: "170px"
        }}
      >
        <div><b>Lat:</b> {position[0]?.toFixed(6)}</div>
        <div><b>Lng:</b> {position[1]?.toFixed(6)}</div>
        <div>
          <b>GPS:</b>{" "}
          {accuracy != null ? `${Math.round(accuracy)} m` : "loading..."}
        </div>
        <div>
          <b>Speed:</b>{" "}
          {speed != null ? `${(speed * 3.6).toFixed(1)} km/h` : "0 km/h"}
        </div>
      </div>

      {/* 🗺 地圖 */}
      <MapContainer
        center={position}
        zoom={18}
        style={{ width: "100%", height: "100%" }}
      >
        <TileLayer
          attribution="© OpenStreetMap"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <FlyToLocation position={position} />

        <Marker position={position}>
          <Popup>你在這裡</Popup>
        </Marker>
      </MapContainer>

      {/* 🎯 回到我 */}
      <button
        onClick={() => {
          window.dispatchEvent(
            new CustomEvent("recenter-map")
          );
        }}
        style={{
          position: "fixed",
          bottom: 20,
          right: 20,
          zIndex: 9999,
          padding: "10px 12px",
          borderRadius: "10px",
          border: "none",
          background: "white",
          boxShadow: "0 0 8px rgba(0,0,0,0.25)",
          cursor: "pointer"
        }}
      >
        🎯 回到我
      </button>

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
