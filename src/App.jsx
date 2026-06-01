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

import { db } from "./firebase";
import { collection, onSnapshot } from "firebase/firestore";

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

// ---------------- map controller ----------------
function MapController({ position, follow }) {
  const map = useMap();

  useEffect(() => {
    if (follow) {
      map.setView(position, map.getZoom());
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
    if (!navigator.geolocation) return;

    const id = navigator.geolocation.watchPosition((pos) => {
      setPosition([
        pos.coords.latitude,
        pos.coords.longitude
      ]);
    });

    return () => navigator.geolocation.clearWatch(id);
  }, []);

  // 🍄 Firebase 即時資料
  useEffect(() => {
    const ref = collection(db, "mushrooms");

    const unsub = onSnapshot(ref, (snap) => {
      const data = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));

      setMushrooms(data);
    });

    return () => unsub();
  }, []);

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative" }}>

      {/* 🧭 HUD */}
      <div
        style={{
          position: "absolute",
          top: 10,
          left: 10,
          zIndex: 99999,
          background: "white",
          padding: 10,
          borderRadius: 10,
          fontSize: 12
        }}
      >
        🍄 mushrooms: {mushrooms.length}
        <br />
        📍 {position[0].toFixed(6)}, {position[1].toFixed(6)}
      </div>

      {/* 🎯 回到我 */}
      <button
        onClick={() => setFollow(true)}
        style={{
          position: "absolute",
          bottom: 20,
          right: 20,
          zIndex: 99999,
          padding: 12,
          borderRadius: 12,
          border: "none",
          background: "#111",
          color: "white"
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
          borderRadius: 12,
          border: "none",
          background: follow ? "green" : "gray",
          color: "white"
        }}
      >
        {follow ? "跟隨 ON" : "跟隨 OFF"}
      </button>

      {/* 🗺 地圖 */}
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

        {/* 🍄 菇點 */}
        {mushrooms.map((m) => (
          <Marker
            key={m.id}
            position={[Number(m.lat), Number(m.lng)]}
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
