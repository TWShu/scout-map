import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup
} from "react-leaflet";

import "leaflet/dist/leaflet.css";
import L from "leaflet";

import { collection, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";

// ------------------------------
// Leaflet icon fix
// ------------------------------
delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png"
});

export default function App() {
  const [position, setPosition] = useState([
    25.033964,
    121.564468
  ]);

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

  // 🌍 Firebase 即時同步（核心）
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "mushrooms"),
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data()
        }));

        setMushrooms(data);
      }
    );

    return () => unsub();
  }, []);

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <MapContainer
        center={position}
        zoom={18}
        style={{ width: "100%", height: "100%" }}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        {/* 📍 我的座標 */}
        <Marker position={position}>
          <Popup>你的位置</Popup>
        </Marker>

        {/* 🍄 Firestore 菇點 */}
        {mushrooms.map((m) => (
          <Marker
            key={m.id}
            position={[m.lat, m.lng]}
          >
            <Popup>
              <b>{m.name}</b>
              <br />
              🍄 power: {m.power}
              <br />
              📍 線上菇點
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
