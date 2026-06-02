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
  const [followMode, setFollowMode] = useState("SMART");

  // ================= INPUT =================
  const [coordInput, setCoordInput] = useState("");

  const [batchInput, setBatchInput] = useState("");
  const [batchList, setBatchList] = useState([]);
  const [batchOpen, setBatchOpen] = useState(true);
  const [batchHeight, setBatchHeight] = useState(100);

  const lastRef = useRef(null);

  // ---------------- parse ----------------
  const parseCoord = (text) => {
    const m = text.trim().match(/(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)/);
    if (!m) return null;
    return { lat: +m[1], lng: +m[2] };
  };

  const parseBatch = (text) =>
    text.split("\n").map(parseCoord).filter(Boolean);

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

  // ---------------- FIREBASE ----------------
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "mushrooms"), (snap) => {
      setMushrooms(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => unsub();
  }, []);

  // ---------------- MAP ----------------
  function MapBinder() {
    const map = useMap();
    useEffect(() => {
      mapRef.current = map;
    }, [map]);
    return null;
  }

  // ---------------- ACTIONS ----------------
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

  // ---------------- SINGLE INPUT ----------------
  const goInput = () => {
    const r = parseCoord(coordInput);
    if (!r) return alert("格式錯誤");
    moveTo(r.lat, r.lng);
  };

  const createInput = async () => {
    const r = parseCoord(coordInput);
    if (!r) return alert("格式錯誤");

    const name = prompt("菇點名稱");
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

    alert("批量完成");
    setBatchInput("");
    setBatchList([]);
  };

  // ---------------- ADD CLICK ----------------
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

  // ---------------- CRUD ----------------
  const updateName = async (id, name) => {
    const n = prompt("修改名稱", name);
    if (!n) return;
    await updateDoc(doc(db, "mushrooms", id), { name: n });
  };

  const deleteM = async (id) => {
    if (!confirm("刪除？")) return;
    await deleteDoc(doc(db, "mushrooms", id));
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
        width: 260,
        display: "flex",
        flexDirection: "column",
        gap: 6
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

        {/* SINGLE INPUT */}
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
        <div style={{ background: "#ddd", padding: 6 }}>

          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <b>📦 批量輸入</b>
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
                  resize: "none"
                }}
              />

              {/* resize handle */}
              <div
                onMouseDown={(e) => {
                  const startY = e.clientY;
                  const startH = batchHeight;

                  const move = (ev) => {
                    setBatchHeight(Math.max(60, startH + ev.clientY - startY));
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
                  background: "#999",
                  cursor: "row-resize",
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
        <AddMushroom />

        <Marker position={[gps.lat, gps.lng]}>
          <Popup>你在這裡</Popup>
        </Marker>

        {mushrooms.map(m => (
          <Fragment key={m.id}>
            <Circle center={[m.lat, m.lng]} radius={40} />

            <Marker position={[m.lat, m.lng]} icon={L.divIcon({ html: "🍄" })}>
              <Popup>
                <b>{m.name}</b>
                <hr />

                <button onClick={() => navigator.clipboard.writeText(`${m.lat},${m.lng}`)}>
                  📋 複製
                </button>

                <button onClick={() => updateName(m.id, m.name)}>
                  ✏️ 改名
                </button>

                <button onClick={() => deleteM(m.id)}>
                  ❌ 刪除
                </button>
              </Popup>
            </Marker>
          </Fragment>
        ))}
      </MapContainer>
    </div>
  );
}
