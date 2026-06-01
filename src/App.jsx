import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  useMapEvents
} from "react-leaflet";

import "leaflet/dist/leaflet.css";
import L from "leaflet";

import { db } from "./firebase";
import { collection, onSnapshot, addDoc, serverTimestamp } from "firebase/firestore";

// ---------------- icon ----------------
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
  iconSize: [30, 30],
  iconAnchor: [15, 15]
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

export default function App() {
  const mapRef = useRef(null);

  const [position, setPosition] = useState([25.033964, 121.564468]);
  const [mushrooms, setMushrooms] = useState([]);
  const [addMode, setAddMode] = useState(false);

  // ⭐ GPS ONLY updates marker
  useEffect(() => {
    const id = navigator.geolocation.watchPosition((pos) => {
      setPosition([pos.coords.latitude, pos.coords.longitude]);
    });

    return () => navigator.geolocation.clearWatch(id);
  }, []);

  // firestore
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "mushrooms"), (snap) => {
      setMushrooms(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    return () => unsub();
  }, []);

  // map control ONLY here
  const moveMap = (latlng, zoom = 18) => {
    if (!mapRef.current) return;
    mapRef.current.flyTo(latlng, zoom, { duration: 0.8 });
  };

  function AddMushroom() {
    useMapEvents({
      async contextmenu(e) {
        if (!addMode) return;

        const name = window.prompt("菇點名稱", "新菇點");
        if (!name) return;

        await addDoc(collection(db, "mushrooms"), {
          name,
          lat: e.latlng.lat,
          lng: e.latlng.lng,
          power: 50,
          createdAt: serverTimestamp()
        });
      }
    });

    return null;
  }

  const sorted = useMemo(() => {
    return [...mushrooms].sort((a, b) => {
      const da = getDistance(position[0], position[1], a.lat, a.lng);
      const dbv = getDistance(position[0], position[1], b.lat, b.lng);
      return da - dbv;
    });
  }, [mushrooms, position]);

  return (
    <div style={{ width: "100vw", height: "100vh" }}>

      {/* UI */}
      <div style={{ position: "absolute", zIndex: 9999, top: 10, right: 10, background: "white", padding: 10 }}>
        <div>🍄 {mushrooms.length}</div>

        <button onClick={() => moveMap(position, 18)}>
          🎯 回到我
        </button>

        <br />

        <button onClick={() => setAddMode(v => !v)}>
          新增菇 {addMode ? "ON" : "OFF"}
        </button>
      </div>

      {/* list */}
      <div style={{ position: "absolute", top: 140, right: 10, zIndex: 9999, background: "white", padding: 10, width: 180 }}>
        <b>附近菇點</b>

        {sorted.map((m) => (
          <div
            key={m.id}
            onClick={() => moveMap([m.lat, m.lng], 19)}
            style={{ cursor: "pointer", marginTop: 6 }}
          >
            {m.name}
          </div>
        ))}
      </div>

      {/* IMPORTANT: FIXED CENTER */}
      <MapContainer
        center={[25.033964, 121.564468]}
        zoom={18}
        style={{ height: "100%", width: "100%" }}
        whenCreated={(map) => (mapRef.current = map)}
      >

        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        <AddMushroom />

        {/* player marker moves ONLY */}
        <Marker position={position}>
          <Popup>你在這裡</Popup>
        </Marker>

        {/* mushrooms */}
        {sorted.map((m) => {
          const d = getDistance(position[0], position[1], m.lat, m.lng);

          return (
            <Fragment key={m.id}>
              <Circle center={[m.lat, m.lng]} radius={40} />

              <Marker position={[m.lat, m.lng]} icon={mushroomIcon}>
                <Popup>
                  <b>{m.name}</b>
                  <br />
                  {Math.round(d)}m

                  <hr />

                  <button
                    onClick={() =>
                      navigator.clipboard.writeText(`${m.lat},${m.lng}`)
                    }
                  >
                    📋 複製座標
                  </button>

                  <br />

                  <button onClick={() => moveMap([m.lat, m.lng], 19)}>
                    🎯 前往
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
