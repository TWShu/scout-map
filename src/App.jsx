import { Fragment, useEffect, useMemo, useRef, useState } from "react";
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

// ---------------- mushroom icon ----------------
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

// ---------------- label icon（距離顯示）----------------
const labelIcon = (text, color) =>
  L.divIcon({
    className: "",
    html: `
      <div style="
        background: white;
        padding: 2px 6px;
        border-radius: 6px;
        font-size: 12px;
        font-weight: bold;
        color: ${color};
        border: 1px solid #ddd;
        white-space: nowrap;
      ">
        ${text}
      </div>
    `,
    iconSize: [60, 20],
    iconAnchor: [30, 10]
  });

// ---------------- MAIN APP ----------------
export default function App() {

  const mapRef = useRef(null);

  const [gps, setGps] = useState({
    lat: 25.033964,
    lng: 121.564468
  });

  const [mushrooms, setMushrooms] = useState([]);

  const [addMode, setAddMode] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

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
      setMushrooms(
        snap.docs.map(d => ({ id: d.id, ...d.data() }))
      );
    });

    return () => unsub();
  }, []);

  // ---------------- MOVE ----------------
  const moveTo = (lat, lng, zoom = 19) => {
    const map = mapRef.current;
    if (!map) return;

    map.stop();
    map.setView([lat, lng], zoom, { animate: true });
  };

  const returnToMe = () => {
    moveTo(gps.lat, gps.lng, 18);
  };

  // ---------------- ADD MODE ----------------
  function AddMushroom() {
    useMapEvents({
      async click(e) {
        if (!addMode) return;

        const name = window.prompt("菇點名稱", "新菇點");
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

  // ---------------- MAP BINDER ----------------
  function MapBinder() {
    const map = useMap();

    useEffect(() => {
      mapRef.current = map;
    }, [map]);

    return null;
  }

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative" }}>

      {/* ================= BUTTONS ================= */}

      <button
        onClick={returnToMe}
        style={{ position: "absolute", bottom: 20, right: 20, zIndex: 9999 }}
      >
        🎯 回到我
      </button>

      <button
        onClick={() => setAddMode(v => !v)}
        style={{ position: "absolute", bottom: 60, right: 20, zIndex: 9999 }}
      >
        {addMode ? "🍄 新增 ON" : "🍄 新增 OFF"}
      </button>

      <div style={{
        position: "absolute",
        top: 10,
        right: 10,
        zIndex: 9999,
        background: "white",
        padding: 10,
        borderRadius: 10
      }}>
        <button onClick={() => setImportOpen(v => !v)}>
          📥 匯入
        </button>

        {importOpen && (
          <div style={{ marginTop: 10 }}>
            <div>（可接 CSV / JSON 匯入）</div>
          </div>
        )}
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

          const color =
            d < 50 ? "green" :
            d < 120 ? "orange" :
            "black";

          return (
            <Fragment key={m.id}>

              {/* 範圍圈 */}
              <Circle center={[m.lat, m.lng]} radius={40} />

              {/* 🍄 菇 */}
              <Marker
                position={[m.lat, m.lng]}
                icon={mushroomIcon}
              >
                <Popup>
                  <b>{m.name}</b>
                  <hr />

                  📍 {m.lat}, {m.lng}
                  <br />
                  📏 {Math.round(d)} m

                  <hr />

                  <button
                    onClick={async () => {
                      const text = `${m.lat},${m.lng}`;
                      try {
                        await navigator.clipboard.writeText(text);
                        alert("已複製座標");
                      } catch {
                        prompt("複製座標", text);
                      }
                    }}
                  >
                    📋 複製座標
                  </button>

                  <br />

                  <button
                    onClick={async () => {
                      const url =
                        `https://www.google.com/maps?q=${m.lat},${m.lng}`;

                      try {
                        await navigator.clipboard.writeText(url);
                        alert("已複製導航");
                      } catch {
                        prompt("複製連結", url);
                      }
                    }}
                  >
                    🧭 複製 Google Maps
                  </button>
                </Popup>
              </Marker>

              {/* 📍 永久距離標籤 */}
              <Marker
                position={[m.lat, m.lng]}
                icon={labelIcon(`${Math.round(d)}m`, color)}
                interactive={false}
              />

            </Fragment>
          );
        })}

      </MapContainer>
    </div>
  );
}
