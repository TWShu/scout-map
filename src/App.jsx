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
  addDoc
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

  const [coordInput, setCoordInput] = useState("");

  // ⭐ 這個是重點：列表高度
  const [listHeight, setListHeight] = useState(260);

  const lastRef = useRef(null);

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

  if (!ready || !gps) {
    return (
      <div style={{ display: "flex", height: "100vh", justifyContent: "center", alignItems: "center" }}>
        📡 GPS loading...
      </div>
    );
  }

  return (
    <div style={{ width: "100vw", height: "100vh" }}>

      {/* 控制 */}
      <div style={{
        position: "fixed",
        top: 10,
        right: 10,
        zIndex: 999999,
        width: 180,
        display: "flex",
        flexDirection: "column",
        gap: 4
      }}>

        <button style={{ fontSize: 11, padding: "4px" }} onClick={returnToMe}>
          🎯 回到我
        </button>

        <button style={{ fontSize: 11, padding: "4px" }} onClick={() => setAddMode(v => !v)}>
          {addMode ? "🍄 ON" : "🍄 OFF"}
        </button>

        <button style={{ fontSize: 11, padding: "4px" }} onClick={() =>
          setFollowMode(m => m === "OFF" ? "GPS" : m === "GPS" ? "SMART" : "OFF")
        }>
          跟隨：{followMode}
        </button>

        <div style={{ background: "#eee", padding: 4 }}>
          <input
            value={coordInput}
            onChange={(e) => setCoordInput(e.target.value)}
            placeholder="lat,lng"
            style={{ width: "100%", fontSize: 11 }}
          />
          <button style={{ fontSize: 11, padding: "4px" }} onClick={goInput}>移動</button>
          <button style={{ fontSize: 11, padding: "4px" }} onClick={createInput}>新增</button>
        </div>
      </div>

      {/* 菇點列表（可拖曳） */}
      <div style={{
        position: "fixed",
        top: 240,
        right: 10,
        zIndex: 999999,
        width: 200,
        background: "white",
        borderRadius: 8,
        padding: 8,
        boxShadow: "0 2px 8px rgba(0,0,0,0.2)"
      }}>

        <b style={{ fontSize: 12 }}>🍄 菇點 ({mushrooms.length})</b>

        <div style={{
          height: listHeight,
          overflowY: "auto",
          marginTop: 6
        }}>
          {mushrooms.map(m => (
            <div
              key={m.id}
              onClick={() => moveTo(m.lat, m.lng)}
              style={{
                cursor: "pointer",
                fontSize: 12,
                padding: "4px 0",
                borderBottom: "1px solid #eee"
              }}
            >
              🍄 {m.name}
            </div>
          ))}
        </div>

        {/* 🔥 真正可拖曳 resize bar */}
        <div
          onMouseDown={(e) => {
            e.preventDefault();

            const startY = e.clientY;
            const startH = listHeight;

            const move = (ev) => {
              setListHeight(
                Math.max(120, Math.min(600, startH + (ev.clientY - startY)))
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
            height: 10,
            marginTop: 6,
            background: "#666",
            borderRadius: 4,
            cursor: "row-resize"
          }}
        />
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
            <Marker position={[m.lat, m.lng]} icon={mushroomIcon} />
          </Fragment>
        ))}
      </MapContainer>
    </div>
  );
      }
