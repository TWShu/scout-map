import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

import { db } from "./firebase";
import { collection, onSnapshot, addDoc, writeBatch } from "firebase/firestore";

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

// ---------------- CSV PARSER ----------------
function parseCSV(text) {
  const lines = text.trim().split("\n");
  const headers = lines[0].split(",");

  return lines.slice(1).map(line => {
    const values = line.split(",");
    const obj = {};

    headers.forEach((h, i) => {
      obj[h.trim()] = values[i]?.trim();
    });

    return obj;
  });
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

  // ---------------- MOVE ENGINE ----------------
  const moveTo = (lat, lng, zoom = 18) => {
    const map = mapRef.current;
    if (!map) return;

    map.stop();
    map.setView([lat, lng], zoom, { animate: true });
  };

  const returnToMe = () => {
    moveTo(gps.lat, gps.lng, 18);
  };

  // ---------------- IMPORT FUNCTION ----------------
  const importJSON = async (file) => {
    const text = await file.text();
    const data = JSON.parse(text);

    const batch = writeBatch(db);

    data.forEach(item => {
      const ref = doc(collection(db, "mushrooms"));
      batch.set(ref, {
        name: item.name,
        lat: Number(item.lat),
        lng: Number(item.lng),
        power: Number(item.power || 50),
        createdAt: new Date()
      });
    });

    await batch.commit();
    alert("JSON 匯入完成");
  };

  const importCSV = async (file) => {
    const text = await file.text();
    const data = parseCSV(text);

    const batch = writeBatch(db);

    data.forEach(item => {
      const ref = doc(collection(db, "mushrooms"));
      batch.set(ref, {
        name: item.name,
        lat: Number(item.lat),
        lng: Number(item.lng),
        power: Number(item.power || 50),
        createdAt: new Date()
      });
    });

    await batch.commit();
    alert("CSV 匯入完成");
  };

  const sorted = useMemo(() => {
    return [...mushrooms].sort((a, b) => {
      const da = getDistance(gps.lat, gps.lng, a.lat, a.lng);
      const db = getDistance(gps.lat, gps.lng, b.lat, b.lng);
      return da - db;
    });
  }, [mushrooms, gps]);

  function MapBinder() {
    const map = useMap();

    useEffect(() => {
      mapRef.current = map;
    }, [map]);

    return null;
  }

  return (
    <div style={{ width: "100vw", height: "100vh" }}>

      {/* UI */}
      <div style={{
        position: "absolute",
        zIndex: 9999,
        top: 10,
        right: 10,
        background: "white",
        padding: 10,
        width: 200
      }}>

        <button onClick={returnToMe}>
          🎯 回到我
        </button>

        <hr />

        {/* IMPORT */}
        <div>
          <b>📥 匯入 JSON</b>
          <input
            type="file"
            accept=".json"
            onChange={(e) => importJSON(e.target.files[0])}
          />
        </div>

        <div style={{ marginTop: 10 }}>
          <b>📥 匯入 CSV</b>
          <input
            type="file"
            accept=".csv"
            onChange={(e) => importCSV(e.target.files[0])}
          />
        </div>

      </div>

      {/* list */}
      <div style={{
        position: "absolute",
        zIndex: 9999,
        top: 160,
        right: 10,
        background: "white",
        padding: 10,
        width: 180,
        maxHeight: 300,
        overflowY: "auto"
      }}>
        <b>🍄 菇點</b>

        {sorted.map(m => (
          <div
            key={m.id}
            style={{ cursor: "pointer", marginTop: 8 }}
            onClick={() => moveTo(m.lat, m.lng, 19)}
          >
            {m.name}
          </div>
        ))}
      </div>

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
            <Circle center={[m.lat, m.lng]} radius={40} />

            <Marker position={[m.lat, m.lng]} icon={mushroomIcon}>
              <Popup>
                <b>{m.name}</b><br />
                力量：{m.power}
              </Popup>
            </Marker>
          </Fragment>
        ))}

      </MapContainer>
    </div>
  );
        }
