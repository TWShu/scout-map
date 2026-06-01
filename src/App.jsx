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

export default function App() {

  const mapRef = useRef(null);
  const containerRef = useRef(null);

  const [gps, setGps] = useState([25.033964, 121.564468]);
  const [mushrooms, setMushrooms] = useState([]);

  // ---------------- GPS (only data) ----------------
  useEffect(() => {
    const id = navigator.geolocation.watchPosition((pos) => {
      setGps([pos.coords.latitude, pos.coords.longitude]);
    });

    return () => navigator.geolocation.clearWatch(id);
  }, []);

  // ---------------- firestore ----------------
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "mushrooms"), (snap) => {
      setMushrooms(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => unsub();
  }, []);

  // ---------------- SAFE MAP ENGINE ----------------
  const moveTo = (latlng, zoom = 18) => {
    const map = mapRef.current;
    if (!map) return;

    // 1️⃣ fly animation
    map.flyTo(latlng, zoom, {
      duration: 0.8
    });

    // 2️⃣ FIX TILE RENDER (核心)
    requestAnimationFrame(() => {
      setTimeout(() => {
        map.invalidateSize(true);
      }, 50);
    });
  };

  const returnToMe = () => {
    moveTo(gps, 18);
  };

  // ---------------- map binder ----------------
  function MapBinder() {
    const map = useMap();

    useEffect(() => {
      mapRef.current = map;
    }, [map]);

    return null;
  }

  const sorted = useMemo(() => {
    return [...mushrooms].sort((a, b) => {
      const da = getDistance(gps[0], gps[1], a.lat, a.lng);
      const db = getDistance(gps[0], gps[1], b.lat, b.lng);
      return da - db;
    });
  }, [mushrooms, gps]);

  return (
    <div
      ref={containerRef}
      style={{ width: "100vw", height: "100vh" }}
    >

      {/* UI */}
      <div style={{
        position: "absolute",
        zIndex: 9999,
        top: 10,
        right: 10,
        background: "white",
        padding: 10
      }}>
        <div>🍄 {mushrooms.length}</div>

        <button onClick={returnToMe}>
          🎯 回到我
        </button>
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
        <b>菇點</b>

        {sorted.map(m => (
          <div
            key={m.id}
            style={{ cursor: "pointer", marginTop: 8 }}
            onClick={() => moveTo([m.lat, m.lng], 19)}
          >
            {m.name}
          </div>
        ))}
      </div>

      {/* MAP */}
      <MapContainer
        center={[25.033964, 121.564468]}
        zoom={18}
        style={{ width: "100%", height: "100%" }}
      >

        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          updateWhenIdle={false}
          updateWhenZooming={false}
          keepBuffer={2}
        />

        <MapBinder />

        {/* player */}
        <Marker position={gps}>
          <Popup>你在這裡</Popup>
        </Marker>

        {/* mushrooms */}
        {mushrooms.map(m => (
          <Fragment key={m.id}>
            <Circle center={[m.lat, m.lng]} radius={40} />

            <Marker position={[m.lat, m.lng]} icon={mushroomIcon}>
              <Popup>{m.name}</Popup>
            </Marker>
          </Fragment>
        ))}

      </MapContainer>
    </div>
  );
}
