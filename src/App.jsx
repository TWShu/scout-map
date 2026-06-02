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
  deleteDoc,
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

// ---------------- MAIN ----------------
export default function App() {

  const mapRef = useRef(null);

  const [gps, setGps] = useState(null);
  const [ready, setReady] = useState(false);

  const [mushrooms, setMushrooms] = useState([]);

  const [addMode, setAddMode] = useState(false);

  // ================= INPUT =================
  const [coordInput, setCoordInput] = useState("");

  const [batchInput, setBatchInput] = useState("");
  const [batchList, setBatchList] = useState([]);
  const [batchOpen, setBatchOpen] = useState(true);

  const [batchHeight, setBatchHeight] = useState(90);

  // ---------------- parse ----------------
  const parseCoord = (text) => {
    const m = text.trim().match(/(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)/);
    if (!m) return null;
    return { lat: +m[1], lng: +m[2] };
  };

  const parseBatch = (text) => {
    return text
      .split("\n")
      .map(parseCoord)
      .filter(Boolean);
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

      map.setView(next);
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

  // ---------------- MAP BIND ----------------
  function MapBinder() {
    const map = useMap();
    useEffect(() => {
      mapRef.current = map;
    }, [map]);
    return null;
  }

  // ---------------- INPUT ACTION ----------------
  const moveTo = (lat, lng) => {
    const map = mapRef.current;
    if (!map) return;
    map.setView([lat, lng], 19);
  };

  const goInput = () => {
    const r = parseCoord(coordInput);
    if (!r) return alert("格式錯誤");
    moveTo(r.lat, r.lng);
  };

  const createInput = async () => {
    const r = parseCoord(coordInput);
    if (!r) return alert("格式錯誤");

    const name = prompt("名稱");
    if (!name) return;

    await addDoc(collection(db, "mushrooms"), {
      name,
      lat: r.lat,
      lng: r.lng
    });
  };

  // ---------------- BATCH ----------------
  const previewBatch = () => {
    setBatchList(parseBatch(batchInput));
  };

  const saveBatch = async () => {
    if (!batchList.length) return alert("沒有資料");

    const prefix = prompt("名稱前綴");
    if (!prefix) return;

    for (let i = 0; i < batchList.length; i++) {
      await addDoc(collection(db, "mushrooms"), {
        name: `${prefix}-${i + 1}`,
        lat: batchList[i].lat,
        lng: batchList[i].lng
      });
    }

    alert("完成");
    setBatchInput("");
    setBatchList([]);
  };

  // ---------------- LOADING ----------------
  if (!ready || !gps) {
    return (
      <div style={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}>
        📡 GPS loading...
      </div>
    );
  }

  return (
    <div style={{ width: "100vw", height: "100vh" }}>

      {/* CONTROL */}
      <div style={{
        position: "fixed",
        top: 10,
        right: 10,
        zIndex: 999999,
        display: "flex",
        flexDirection: "column",
        gap: 6,
        width: 240
      }}>

        {/* SINGLE */}
        <div style={{ background: "#eee", padding: 6 }}>
          <input
            placeholder="lat,lng"
            value={coordInput}
            onChange={(e) => setCoordInput(e.target.value)}
            style={{ width: "100%" }}
          />

          <button onClick={goInput}>🧭 移動</button>
          <button onClick={createInput}>🍄 建立</button>
        </div>

        {/* BATCH */}
        <div style={{
          background: "#ddd",
          padding: 6
        }}>

          <div style={{
            display: "flex",
            justifyContent: "space-between"
          }}>
            <b>📦 批量</b>

            <button onClick={() => setBatchOpen(v => !v)}>
              {batchOpen ? "收合" : "展開"}
            </button>
          </div>

          {batchOpen && (
            <>
              <textarea
                value={batchInput}
                onChange={(e) => setBatchInput(e.target.value)}
                style={{
                  width: "100%",
                  height: batchHeight,
                  resize: "vertical"
                }}
                placeholder={"25.03,121.56\n25.04,121.57"}
              />

              {/* resize bar */}
              <div
                onMouseDown={(e) => {
                  const startY = e.clientY;
                  const startH = batchHeight;

                  const move = (ev) => {
                    setBatchHeight(
                      Math.max(60, startH + ev.clientY - startY)
                    );
                  };

                  const up = () => {
                    window.removeEventListener("mousemove", move);
                    window.removeEventListener("mouseup", up);
                  };

                  window.addEventListener("mousemove", move);
                  window.addEventListener("mouseup", up);
                }}
                style={{
                  height: 6,
                  cursor: "row-resize",
                  background: "#aaa",
                  marginTop: 4
                }}
              />

              <button onClick={previewBatch}>👀 預覽</button>
              <button onClick={saveBatch}>💾 儲存</button>

              <div style={{ fontSize: 12 }}>
                {batchList.map((p, i) => (
                  <div key={i}>
                    {i + 1}. {p.lat}, {p.lng}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

      </div>

      {/* MAP */}
      <MapContainer
        center={[gps.lat, gps.lng]}
        zoom={18}
        style={{ width: "100%", height: "100%" }}
      >

        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        <MapBinder />

        <Marker position={[gps.lat, gps.lng]}>
          <Popup>你在這裡</Popup>
        </Marker>

        {mushrooms.map(m => (
          <Fragment key={m.id}>
            <Circle center={[m.lat, m.lng]} radius={40} />

            <Marker
              position={[m.lat, m.lng]}
              icon={mushroomIcon}
            >
              <Popup>
                {m.name}
                <br />
                📍 {m.lat}, {m.lng}
              </Popup>
            </Marker>
          </Fragment>
        ))}

      </MapContainer>
    </div>
  );
}
