import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
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

// ---------------- Mushroom Icon ----------------
const mushroomIcon = L.divIcon({
  html: "🍄",
  className: "",
  iconSize: [32, 32],
  iconAnchor: [16, 16]
});

// ---------------- Distance ----------------
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

// ---------------- Map Controller ----------------
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

  const [accuracy, setAccuracy] = useState(0);

  const [speed, setSpeed] = useState(0);

  const [mushrooms, setMushrooms] = useState([]);

  // ---------------- GPS ----------------
  useEffect(() => {
    if (!navigator.geolocation) return;

    const id = navigator.geolocation.watchPosition(
      (pos) => {
        setPosition([
          pos.coords.latitude,
          pos.coords.longitude
        ]);

        setAccuracy(pos.coords.accuracy || 0);

        setSpeed(
          pos.coords.speed
            ? (pos.coords.speed * 3.6).toFixed(1)
            : 0
        );
      },
      console.error,
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 1000
      }
    );

    return () => navigator.geolocation.clearWatch(id);
  }, []);

  // ---------------- Firebase ----------------
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
    <div
      style={{
        width: "100vw",
        height: "100vh",
        position: "relative"
      }}
    >
      {/* HUD */}
      <div
        style={{
          position: "absolute",
          top: 10,
          right: 10,
          zIndex: 99999,
          background: "white",
          padding: 10,
          borderRadius: 10,
          fontSize: 12,
          minWidth: 180
        }}
      >
        <div>
          Lat: {position[0].toFixed(6)}
        </div>

        <div>
          Lng: {position[1].toFixed(6)}
        </div>

        <div>
          GPS精度: {Math.round(accuracy)}m
        </div>

        <div>
          速度: {speed} km/h
        </div>

        <div>
          🍄 菇點: {mushrooms.length}
        </div>
      </div>

      {/* 菇點列表 */}
      <div
        style={{
          position: "absolute",
          top: 140,
          right: 10,
          zIndex: 99999,
          background: "white",
          padding: 10,
          borderRadius: 10,
          width: 180,
          maxHeight: 300,
          overflowY: "auto"
        }}
      >
        <b>🍄 附近菇點</b>

        {mushrooms.map((m) => {
          const d = getDistance(
            position[0],
            position[1],
            Number(m.lat),
            Number(m.lng)
          );

          return (
            <div
              key={m.id}
              style={{
                marginTop: 8,
                borderBottom:
                  "1px solid #ddd",
                paddingBottom: 6
              }}
            >
              {m.name || "未命名菇點"}
              <br />
              {Math.round(d)}m
            </div>
          );
        })}
      </div>

      {/* 回到我 */}
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

      {/* 跟隨 */}
      <button
        onClick={() =>
          setFollow((v) => !v)
        }
        style={{
          position: "absolute",
          bottom: 80,
          right: 20,
          zIndex: 99999,
          padding: 10,
          borderRadius: 12,
          border: "none",
          background: follow
            ? "green"
            : "gray",
          color: "white"
        }}
      >
        {follow
          ? "跟隨 ON"
          : "跟隨 OFF"}
      </button>

      {/* 地圖 */}
      <MapContainer
        center={position}
        zoom={18}
        style={{
          width: "100%",
          height: "100%"
        }}
      >
        <TileLayer
          attribution="© OpenStreetMap"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* 玩家 */}
        <Marker position={position}>
          <Popup>你在這裡</Popup>
        </Marker>

        {/* 菇點 */}
        {mushrooms.map((m) => {
          const distance = getDistance(
            position[0],
            position[1],
            Number(m.lat),
            Number(m.lng)
          );

          const canInteract =
            distance <= 40;

          return (
            <div key={m.id}>
              <Circle
                center={[
                  Number(m.lat),
                  Number(m.lng)
                ]}
                radius={40}
              />

              <Marker
                icon={mushroomIcon}
                position={[
                  Number(m.lat),
                  Number(m.lng)
                ]}
              >
                <Popup>
                  <b>
                    {m.name ||
                      "未命名菇點"}
                  </b>

                  <br />

                  距離：
                  {Math.round(distance)}m

                  <br />

                  {canInteract
                    ? "🟢 可互動"
                    : "🔒 距離過遠"}

                  <br />

                  力量：
                  {m.power || 0}
                </Popup>
              </Marker>
            </div>
          );
        })}

        <MapController
          position={position}
          follow={follow}
        />
      </MapContainer>
    </div>
  );
}
