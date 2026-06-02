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

import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  doc
} from "firebase/firestore";

import { db } from "./firebase";

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

// ---------------- MAP CLICK ADD ----------------
function MapAddHandler({ addMode }) {
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

export default function App() {

  const mapRef = useRef(null);

  const [gps, setGps] = useState(null);
  const [ready, setReady] = useState(false);

  const [mushrooms, setMushrooms] = useState([]);

  const [addMode, setAddMode] = useState(false);
  const [followMode, setFollowMode] = useState("SMART");

  const [input, setInput] = useState("");

  // ⭐ sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const lastRef = useRef(null);

  // ---------------- parse ----------------
  const parseCoord = (t) => {
    const m = t.trim().match(/(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)/);
    if (!m) return null;
    return { lat: +m[1], lng: +m[2] };
  };

  // ---------------- GPS ----------------
  useEffect(() => {
    if (!navigator.geolocation) return;

    const id = navigator.geolocation.watchPosition((pos) => {
      const next = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude
      };

      setGps(next);
      setReady(true);

      const map = mapRef.current;
      if (!map) return;

      if (followMode === "GPS") {
        map.setView(next);
      }

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

  function MapBinder() {
    const map = useMap();
    useEffect(() => {
      mapRef.current = map;
    }, [map]);
    return null;
  }

  const moveTo = (lat, lng) => {
    const map = mapRef.current;
    if (!map) return;
    map.setView([lat, lng], 19);
  };

  const returnToMe = () => {
    if (!gps) return;
    moveTo(gps.lat, gps.lng);
    setFollowMode("GPS");
  };

  const goInput = () => {
    const r = parseCoord(input);
    if (!r) return alert("格式錯誤");
    moveTo(r.lat, r.lng);
  };

  const create = async () => {
    const r = parseCoord(input);
    if (!r) return alert("格式錯誤");

    const name = prompt("名稱");
    if (!name) return;

    await addDoc(collection(db, "mushrooms"), {
      name,
      lat: r.lat,
      lng: r.lng
    });
  };

  if (!ready || !gps) {
    return (
      <div style={{
        display: "flex",
        height: "100vh",
        justifyContent: "center",
        alignItems: "center"
      }}>
        📡 GPS loading...
      </div>
    );
  }

  return (
    <div style={{ width: "100vw", height: "100vh" }}>

      {/* ================= SIDEBAR ================= */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          height: "100vh",
          width: sidebarOpen ? 260 : 0,   // 🔥 正確收合
          overflow: "hidden",
          background: "#1e1e1e",
          color: "white",
          zIndex: 999999,
          transition: "0.2s"
        }}
      >

        {/* CONTENT（只在開啟時顯示） */}
        {sidebarOpen && (
          <div style={{ padding: 10 }}>

            <b>📍 GPS</b>
            <div style={{ fontSize: 12 }}>
              {gps.lat.toFixed(5)}, {gps.lng.toFixed(5)}
            </div>

            <button onClick={returnToMe} style={{ width: "100%", marginTop: 5 }}>
              🎯 回到我
            </button>

            <button
              onClick={() =>
                setFollowMode(m =>
                  m === "OFF" ? "GPS" :
                  m === "GPS" ? "SMART" :
                  "OFF"
                )
              }
              style={{ width: "100%", marginTop: 5 }}
            >
              跟隨：{followMode}
            </button>

            <div style={{ marginTop: 10 }}>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="lat,lng"
                style={{ width: "100%" }}
              />

              <button onClick={goInput} style={{ width: "100%", marginTop: 5 }}>
                🧭 移動
              </button>

              <button onClick={create} style={{ width: "100%", marginTop: 5 }}>
                🍄 新增
              </button>

              <button
                onClick={() => setAddMode(v => !v)}
                style={{ width: "100%", marginTop: 5 }}
              >
                {addMode ? "新增ON" : "新增OFF"}
              </button>
            </div>

          </div>
        )}
      </div>

      {/* ================= TOGGLE BUTTON（永遠存在） ================= */}
      <div
        onClick={() => setSidebarOpen(v => !v)}
        style={{
          position: "fixed",
          top: 10,
          left: sidebarOpen ? 260 : 0,
          zIndex: 1000000,
          background: "#333",
          color: "white",
          padding: "8px 10px",
          cursor: "pointer",
          borderRadius: 4
        }}
      >
        {sidebarOpen ? "⮜" : "⮞"}
      </div>

      {/* ================= MAP ================= */}
      <MapContainer
        center={[gps.lat, gps.lng]}
        zoom={18}
        style={{ width: "100%", height: "100%" }}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        <MapBinder />
        <MapAddHandler addMode={addMode} />

        <Marker position={[gps.lat, gps.lng]}>
          <Popup>你在這裡</Popup>
        </Marker>

        {mushrooms.map(m => (
          <Fragment key={m.id}>
            <Circle center={[m.lat, m.lng]} radius={40} />

            <Marker position={[m.lat, m.lng]} icon={mushroomIcon}>
              <Popup>
                <b>🍄 {m.name}</b>
                <hr />
                📍 {m.lat.toFixed(5)}, {m.lng.toFixed(5)}

                <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                  <button onClick={() => moveTo(m.lat, m.lng)}>🧭</button>

                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`${m.lat},${m.lng}`);
                      alert("已複製");
                    }}
                  >
                    📋
                  </button>

                  <button
                    onClick={async () => {
                      const newName = prompt("修改名稱", m.name);
                      if (!newName) return;

                      await updateDoc(doc(db, "mushrooms", m.id), {
                        name: newName
                      });
                    }}
                  >
                    ✏️
                  </button>
                </div>
              </Popup>
            </Marker>
          </Fragment>
        ))}

      </MapContainer>
    </div>
  );
        }
