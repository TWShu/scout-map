import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

import { db } from "./firebase";
import { collection, onSnapshot, writeBatch } from "firebase/firestore";

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

// ---------------- CSV ----------------
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
  const [panelOpen, setPanelOpen] = useState(true);

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

  // ---------------- IMPORT ----------------
  const importJSON = async (file) => {
    const text = await file.text();
    const data = JSON.parse(text);

    const batch = writeBatch(db);

    data.forEach(item => {
      const ref = doc(collection(db, "mushrooms"));
      batch.set(ref, {
        name: item.name,
        lat: Number(item.lat),
        lng: Number(item.lng)
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
        lng: Number(item.lng)
      });
    });

    await batch.commit();
    alert("CSV 匯入完成");
  };

  // ---------------- SORT ----------------
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
    <div style={{ width: "100vw", height: "100vh", position: "relative" }}>

      {/* ===== IMPORT PANEL ===== */}
      <div style={{
        position: "absolute",
        top: 10,
        right: 10,
        zIndex: 9999,
        background: "white",
        borderRadius: 10,
        width: panelOpen ? 240 : 60,
        padding: 10,
        overflow: "hidden",
        transition: "0.2s"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <b>📥 匯入</b>
          <button onClick={() => setPanelOpen(v => !v)}>
            {panelOpen ? "−" : "+"}
          </button>
        </div>

        {panelOpen && (
          <>
            <div style={{ marginTop: 10 }}>
              JSON
              <input type="file" accept=".json" onChange={(e) => importJSON(e.target.files[0])} />
            </div>

            <div style={{ marginTop: 10 }}>
              CSV
              <input type="file" accept=".csv" onChange={(e) => importCSV(e.target.files[0])} />
            </div>

            <button style={{ marginTop: 10 }} onClick={returnToMe}>
              🎯 回到我
            </button>
          </>
        )}
      </div>

      {/* LIST */}
      <div style={{
        position: "absolute",
        top: 140,
        right: 10,
        zIndex: 9999,
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

        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        <MapBinder />

        <Marker position={[gps.lat, gps.lng]}>
          <Popup>你在這裡</Popup>
        </Marker>

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
                  距離：{Math.round(d)}m

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
                      const url = `https://www.google.com/maps?q=${m.lat},${m.lng}`;
                      try {
                        await navigator.clipboard.writeText(url);
                        alert("已複製 Google Maps");
                      } catch {
                        prompt("複製連結", url);
                      }
                    }}
                  >
                    🧭 複製導航
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
