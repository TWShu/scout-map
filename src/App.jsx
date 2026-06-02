import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

import { db } from "./firebase";
import { collection, onSnapshot } from "firebase/firestore";

// ---------------- Leaflet fix ----------------
delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png"
});

const mushroomIcon = L.divIcon({
  html: "🍄",
  className: "",
  iconSize: [28, 28],
  iconAnchor: [14, 14]
});

// ---------------- distance ----------------
function getDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000;

  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ---------------- RADAR OVERLAY ----------------
function Radar({ radius = 120 }) {
  return (
    <div style={{
      position: "absolute",
      left: "50%",
      top: "50%",
      transform: "translate(-50%, -50%)",
      width: radius * 2,
      height: radius * 2,
      pointerEvents: "none",
      zIndex: 9998
    }}>
      <div className="radar" />
    </div>
  );
}

// ---------------- MAIN APP ----------------
export default function App() {

  const mapRef = useRef(null);

  const [gps, setGps] = useState({
    lat: 25.033964,
    lng: 121.564468
  });

  const [mushrooms, setMushrooms] = useState([]);

  // ---------------- GPS ----------------
  useEffect(() => {
    const id = navigator.geolocation.watchPosition((pos) => {
      setGps({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude
      });
    });

    return () => navigator.geolocation.clearWatch(id);
  }, []);

  // ---------------- FIRESTORE ----------------
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "mushrooms"), (snap) => {
      setMushrooms(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => unsub();
  }, []);

  // ---------------- MOVE ENGINE (safe) ----------------
  const moveTo = (lat, lng, zoom = 19) => {
    const map = mapRef.current;
    if (!map) return;

    map.stop();
    map.setView([lat, lng], zoom, { animate: true });
  };

  const returnToMe = () => {
    moveTo(gps.lat, gps.lng, 18);
  };

  // ---------------- SORT ----------------
  const sorted = useMemo(() => {
    return [...mushrooms].sort((a, b) => {
      const da = getDistance(gps.lat, gps.lng, a.lat, a.lng);
      const db = getDistance(gps.lat, gps.lng, b.lat, b.lng);
      return da - db;
    });
  }, [mushrooms, gps]);

  // ---------------- MAP BINDER ----------------
  function MapBinder() {
    const map = useMap();

    useEffect(() => {
      mapRef.current = map;
    }, [map]);

    return null;
  }

  // ---------------- nearest ----------------
  const nearest = sorted[0];

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative" }}>

      {/* ===== RADAR STYLE ===== */}
      <style>{`
        .radar {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          border: 2px solid rgba(0, 255, 100, 0.5);
          position: relative;
          overflow: hidden;
        }

        .radar::after {
          content: "";
          position: absolute;
          width: 100%;
          height: 100%;
          background: conic-gradient(
            rgba(0,255,100,0.35),
            transparent 60%
          );
          animation: spin 2s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* HUD */}
      <div style={{
        position: "absolute",
        zIndex: 9999,
        top: 10,
        right: 10,
        background: "white",
        padding: 10,
        borderRadius: 8
      }}>
        <div>🍄 {mushrooms.length}</div>
        <div>📍 最近：{nearest?.name || "無"}</div>
        <button onClick={returnToMe}>🎯 回到我</button>
      </div>

      {/* list */}
      <div style={{
        position: "absolute",
        zIndex: 9999,
        top: 120,
        right: 10,
        background: "white",
        padding: 10,
        width: 180,
        maxHeight: 300,
        overflowY: "auto"
      }}>
        <b>🍄 菇點</b>

        {sorted.map(m => {
          const d = getDistance(gps.lat, gps.lng, m.lat, m.lng);

          return (
            <div
              key={m.id}
              style={{
                cursor: "pointer",
                marginTop: 8,
                color: d < 50 ? "green" : d < 120 ? "orange" : "black",
                fontWeight: d < 50 ? "bold" : "normal"
              }}
              onClick={() => moveTo(m.lat, m.lng, 19)}
            >
              {m.name} ({Math.round(d)}m)
            </div>
          );
        })}
      </div>

      {/* RADAR */}
      <Radar radius={140} />

      {/* MAP */}
      <MapContainer
        center={[gps.lat, gps.lng]}
        zoom={18}
        style={{ width: "100%", height: "100%" }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapBinder />

        {/* player */}
        <Marker position={[gps.lat, gps.lng]}>
          <Popup>你在這裡</Popup>
        </Marker>

        {/* mushrooms */}
        {mushrooms.map(m => (
          <Fragment key={m.id}>
            <Circle
              center={[m.lat, m.lng]}
              radius={40}
              pathOptions={{
                color: getDistance(gps.lat, gps.lng, m.lat, m.lng) < 50
                  ? "green"
                  : "orange"
              }}
            />

            <Marker position={[m.lat, m.lng]} icon={mushroomIcon}>
              <Popup>{m.name}</Popup>
            </Marker>
          </Fragment>
        ))}

      </MapContainer>
    </div>
  );
        }
