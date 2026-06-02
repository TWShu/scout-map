import { Fragment, useEffect, useRef, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  useMap,
  useMapEvents
} from "react-leaflet";

import "leaflet/dist/leaflet.css";
import L from "leaflet";

import { db } from "./firebase";
import { collection, onSnapshot, addDoc } from "firebase/firestore";

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

// ---------------- icon ----------------
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

// ---------------- direction ----------------
function getDirectionArrow(lat1, lng1, lat2, lng2) {
  const dx = lng2 - lng1;
  const dy = lat2 - lat1;

  const angle = Math.atan2(dy, dx) * 180 / Math.PI;

  if (angle >= -22.5 && angle < 22.5) return "➡️";
  if (angle >= 22.5 && angle < 67.5) return "↗️";
  if (angle >= 67.5 && angle < 112.5) return "⬆️";
  if (angle >= 112.5 && angle < 157.5) return "↖️";
  if (angle >= -67.5 && angle < -22.5) return "↘️";
  if (angle >= -112.5 && angle < -67.5) return "⬇️";
  if (angle >= -157.5 && angle < -112.5) return "↙️";
  return "⬅️";
}

// ---------------- MAIN APP ----------------
export default function App() {

  const mapRef = useRef(null);

  const [gps, setGps] = useState({
    lat: 25.033964,
    lng: 121.564468
  });

  const [mushrooms, setMushrooms] = useState([]);

  const [addMode, setAddMode] = useState(false);

  // OFF / GPS / SMART
  const [followMode, setFollowMode] = useState("SMART");

  const lastRef = useRef(null);

  // ---------------- GPS ----------------
  useEffect(() => {
    const id = navigator.geolocation.watchPosition((pos) => {
      const next = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude
      };

      setGps(next);

      const map = mapRef.current;
      if (!map) return;

      // GPS 跟隨
      if (followMode === "GPS") {
        map.setView(next);
      }

      // SMART 跟隨（避免亂跳）
      if (followMode === "SMART") {
        const last = lastRef.current;

        if (!last) {
          lastRef.current = next;
          return;
        }

        const d = getDistance(last.lat, last.lng, next.lat, next.lng);

        if (d > 30) {
          map.setView(next);
          lastRef.current = next;
        }
      }
    });

    return () => navigator.geolocation.clearWatch(id);
  }, [followMode]);

  // ---------------- FIRESTORE ----------------
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "mushrooms"), (snap) => {
      setMushrooms(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => unsub();
  }, []);

  // ---------------- MOVE ----------------
  const moveTo = (lat, lng) => {
    const map = mapRef.current;
    if (!map) return;
    map.setView([lat, lng], 19, { animate: true });
  };

  const returnToMe = () => {
    moveTo(gps.lat, gps.lng);
    setFollowMode("GPS");
  };

  // ---------------- ADD ----------------
  function AddMushroom() {
    useMapEvents({
      async click(e) {
        if (!addMode) return;

        const name = prompt("菇點名稱");
        if (!name) return;

        await addDoc(collection(db, "mushrooms"), {
          name,
          lat: e.latlng.lat,
          lng: e.latlng.lng
        });
      }
    });

    return null;
  }

  function MapBinder() {
    const map = useMap();
    useEffect(() => {
      mapRef.current = map;
    }, [map]);
    return null;
  }

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative" }}>

      {/* ================= CONTROL ================= */}
      <div style={{
        position: "fixed",
        top: 10,
        right: 10,
        zIndex: 999999,
        display: "flex",
        flexDirection: "column",
        gap: 8
      }}>

        <button onClick={returnToMe}>🎯 回到我</button>

        <button onClick={() => setAddMode(v => !v)}>
          {addMode ? "🍄 新增 ON" : "🍄 新增 OFF"}
        </button>

        <button onClick={() =>
          setFollowMode(m =>
            m === "OFF" ? "GPS" :
            m === "GPS" ? "SMART" :
            "OFF"
          )
        }>
          跟隨：{followMode}
        </button>

      </div>

      {/* ================= LIST ================= */}
      <div style={{
        position: "fixed",
        top: 120,
        right: 10,
        zIndex: 999999,
        background: "white",
        padding: 10,
        width: 220,
        maxHeight: 320,
        overflowY: "auto"
      }}>
        <b>🍄 菇點導航</b>

        {mushrooms.map(m => {
          const d = getDistance(gps.lat, gps.lng, m.lat, m.lng);
          const arrow = getDirectionArrow(gps.lat, gps.lng, m.lat, m.lng);

          return (
            <div
              key={m.id}
              onClick={() => moveTo(m.lat, m.lng)}
              style={{
                cursor: "pointer",
                marginTop: 10,
                paddingBottom: 6,
                borderBottom: "1px solid #eee"
              }}
            >
              {arrow} {m.name}
              <div style={{ fontSize: 12, opacity: 0.6 }}>
                {Math.round(d)} m
              </div>
            </div>
          );
        })}
      </div>

      {/* ================= MAP ================= */}
      <MapContainer
        center={[gps.lat, gps.lng]}
        zoom={18}
        style={{ width: "100%", height: "100%" }}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        <MapBinder />
        <AddMushroom />

        {/* 玩家 */}
        <Marker position={[gps.lat, gps.lng]}>
          <Popup>你在這裡</Popup>
        </Marker>

        {/* 菇點 */}
        {mushrooms.map(m => {
          const d = getDistance(gps.lat, gps.lng, m.lat, m.lng);

          return (
            <Fragment key={m.id}>

              <Circle center={[m.lat, m.lng]} radius={40} />

              <Marker position={[m.lat, m.lng]} icon={mushroomIcon}>
                <Popup>

                  <b>{m.name}</b>
                  <hr />

                  📍 {m.lat}, {m.lng}
                  <br />
                  📏 {Math.round(d)} m

                  <hr />

                  {/* 📋 複製 */}
                  <button
                    onClick={async () => {
                      await navigator.clipboard.writeText(`${m.lat},${m.lng}`);
                      alert("已複製座標");
                    }}
                  >
                    📋 複製座標
                  </button>

                  <br />

                  {/* 🧭 Google Maps */}
                  <button
                    onClick={async () => {
                      const url = `https://www.google.com/maps?q=${m.lat},${m.lng}`;
                      await navigator.clipboard.writeText(url);
                      alert("已複製導航連結");
                    }}
                  >
                    🧭 Google Maps
                  </button>

                  <br />

                  {/* 🎯 移動 */}
                  <button onClick={() => moveTo(m.lat, m.lng)}>
                    🎯 移動到這裡
                  </button>

                </Popup>
              </Marker>

            </Fragment>
          );
        })}

      </MapContainer>
    </div>
  );
      }
