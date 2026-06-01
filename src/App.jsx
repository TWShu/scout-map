import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap
} from "react-leaflet";

import "leaflet/dist/leaflet.css";
import L from "leaflet";

// 🔥 Firebase
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  onSnapshot
} from "firebase/firestore";

// ---------------- Leaflet icon fix ----------------
delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png"
});

// ---------------- Firebase init ----------------
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ---------------- map controller ----------------
function MapController({ position, follow }) {
  const map = useMap();

  useEffect(() => {
    if (follow) {
      map.setView(position);
    }
  }, [position, follow, map]);

  return null;
}

export default function App() {
  const [position, setPosition] = useState([
    25.033964,
    121.564468
  ]);

  const [follow, setFollow] = useState(true);
  const [mushrooms, setMushrooms] = useState([]);

  // 📍 GPS
  useEffect(() => {
    navigator.geolocation.watchPosition((pos) => {
      setPosition([
        pos.coords.latitude,
        pos.coords.longitude
      ]);
    });
  }, []);

  // 🍄 Firebase 即時讀取
  useEffect(() => {
    const ref = collection(db, "mushrooms");

    const unsub = onSnapshot(ref, (snap) => {
      const data = snap.docs.map((d) => ({
        id: d.id,
        ...d.data()
      }));

      setMushrooms(data);
    });

    return () => unsub();
  }, []);

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative" }}>

      {/* 🎯 回到我 */}
      <button
        onClick={() => setFollow(true)}
        style={{
          position: "absolute",
          bottom: 20,
          right: 20,
          zIndex: 99999,
          padding: 12,
          background: "#111",
          color: "white",
          borderRadius: 12
        }}
      >
        🎯 回到我
      </button>

      {/* 🔘 跟隨 */}
      <button
        onClick={() => setFollow(v => !v)}
        style={{
          position: "absolute",
          bottom: 80,
          right: 20,
          zIndex: 99999,
          padding: 10,
          background: follow ? "green" : "gray",
          color: "white",
          borderRadius: 12
        }}
      >
        {follow ? "跟隨 ON" : "跟隨 OFF"}
      </button>

      {/* 🗺 Map */}
      <MapContainer
        center={position}
        zoom={18}
        style={{ width: "100%", height: "100%" }}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        {/* 📍 玩家 */}
        <Marker position={position}>
          <Popup>你在這裡</Popup>
        </Marker>

        {/* 🍄 Firebase POI */}
        {mushrooms.map((m) => (
          <Marker
            key={m.id}
            position={[m.lat, m.lng]}
          >
            <Popup>
              🍄 {m.name || "菇點"}
            </Popup>
          </Marker>
        ))}

        <MapController position={position} follow={follow} />
      </MapContainer>
    </div>
  );
}
