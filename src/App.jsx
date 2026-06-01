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

  // ---------------- firestore ----------------
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "mushrooms"), (snap) => {
      setMushrooms(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => unsub();
  }, []);

  // ---------------- SAFE MOVE ENGINE ----------------
  const moveTo = (lat, lng, zoom = 18) => {
    const map = mapRef.current;
    if (!map) return;

    // 🔥 核心修復：不用 flyTo（會灰）
    map.stop(); // stop animation
    map.setView([lat, lng], zoom, {
      animate: false
    });

    // 強制 repaint
    requestAnimationFrame(() => {
      map.invalidateSize(true);
    });
  };

  const returnToMe = () => {
    moveTo(gps.lat, gps.lng, 18);
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

      setTimeout(() => {
        map.invalidateSize(true);
      }, 200);
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
        padding: 10
      }}>
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
        width: 180
      }}>
        <b>菇點</b>

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
          keepBuffer={6}
          updateWhenZooming={false}
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
              <Popup>{m.name}</Popup>
            </Marker>
          </Fragment>
        ))}

      </MapContainer>
    </div>
  );
}
