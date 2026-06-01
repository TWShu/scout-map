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

// Fix Leaflet icon
delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// 🔥 地圖跟隨使用者（無動畫版本）
function FollowUser({ position }) {
  const map = useMap();

  useEffect(() => {
    if (position) {
      map.setView(position, map.getZoom(), {
        animate: false
      });
    }
  }, [position, map]);

  return null;
}

// 🎯 回到我（瞬間定位）
function RecenterButton({ position }) {
  const map = useMap();

  return (
    <button
      onClick={() => {
        map.setView(position, map.getZoom(), {
          animate: false
        });
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

  // 📍 GPS tracking
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

  // 🧭 Compass（安全版）
  useEffect(() => {
    const handler = (e) => {
      if (typeof e.alpha === "number") {
        setHeading(e.alpha);
      }
    };

    const startCompass = async () => {
      try {
        if (
          typeof DeviceOrientationEvent !== "undefined" &&
          typeof DeviceOrientationEvent.requestPermission === "function"
        ) {
          const res =
            await DeviceOrientationEvent.requestPermission();
          if (res === "granted") {
            window.addEventListener(
              "deviceorientation",
              handler,
              true
            );
          }
        } else {
          window.addEventListener(
            "deviceorientation",
            handler,
            true
          );
        }
      } catch (e) {
        console.log("Compass not supported");
      }
    };

    startCompass();

    return () => {
      window.removeEventListener(
        "deviceorientation",
        handler,
        true
      );
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
      {/* 📊 右上角 HUD */}
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
        <div>
          <b>Lat:</b> {position[0].toFixed(6)}
        </div>
        <div>
          <b>Lng:</b> {position[1].toFixed(6)}
        </div>
        <div>
          <b>GPS:</b>{" "}
          {accuracy != null
            ? `${Math.round(accuracy)} m`
            : "loading..."}
        </div>
        <div>
          <b>Speed:</b>{" "}
          {speed != null
            ? `${(speed * 3.6).toFixed(1)} km/h`
            : "0 km/h"}
        </div>
      </div>

      {/* 🗺 Map */}
      <MapContainer
        center={position}
        zoom={18}
        style={{ width: "100%", height: "100%" }}
      >
        <TileLayer
          attribution="© OpenStreetMap"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <FollowUser position={position} />

        <Marker position={position}>
          <Popup>你在這裡</Popup>
        </Marker>

        <RecenterButton position={position} />
      </MapContainer>

      {/* 🧭 Compass */}
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
