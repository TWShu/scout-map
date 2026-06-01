import { Fragment, useEffect, useMemo, useState } from "react";
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

import { db } from "./firebase";
import {
  collection,
  onSnapshot,
  addDoc,
  serverTimestamp
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

// ---------------- Copy ----------------
function copyText(text) {
  navigator.clipboard.writeText(text);
  alert("已複製座標");
}

// ---------------- Map Controller ----------------
function MapController({ position, follow, focusTarget }) {
  const map = useMap();

  // GPS 跟隨
  useEffect(() => {
    if (follow && position) {
      map.panTo(position);
    }
  }, [position, follow, map]);

  // 點擊列表定位
  useEffect(() => {
    if (focusTarget) {
      map.setView(focusTarget, map.getZoom(), {
        animate: true
      });
    }
  }, [focusTarget, map]);

  return null;
}

// ---------------- Map Events ----------------
function MapEvents({ setFollow }) {
  useMapEvents({
    dragstart() {
      setFollow(false);
    }
  });

  return null;
}

// ---------------- Add Mushroom ----------------
function AddMushroom({ enabled }) {
  useMapEvents({
    async contextmenu(e) {
      if (!enabled) return;

      const name = window.prompt("菇點名稱", "新菇點");
      if (!name) return;

      try {
        await addDoc(collection(db, "mushrooms"), {
          name,
          lat: e.latlng.lat,
          lng: e.latlng.lng,
          power: 50,
          createdAt: serverTimestamp()
        });

        alert("已新增菇點");
      } catch (err) {
        console.error(err);
        alert("新增失敗");
      }
    }
  });

  return null;
}

// ---------------- MAIN APP ----------------
export default function App() {
  const [position, setPosition] = useState([
    25.033964,
    121.564468
  ]);

  const [follow, setFollow] = useState(true);
  const [accuracy, setAccuracy] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [mushrooms, setMushrooms] = useState([]);
  const [focusTarget, setFocusTarget] = useState(null);
  const [addMode, setAddMode] = useState(false);

  // ⭐ 收藏
  const [favorites, setFavorites] = useState(() => {
    const saved = localStorage.getItem("favorites");
    return saved ? JSON.parse(saved) : [];
  });

  const toggleFavorite = (id) => {
    setFavorites((prev) => {
      const next = prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id];

      localStorage.setItem("favorites", JSON.stringify(next));
      return next;
    });
  };

  const isFavorite = (id) => favorites.includes(id);

  // GPS
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

  // Firebase
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "mushrooms"),
      (snap) => {
        setMushrooms(
          snap.docs.map((doc) => ({
            id: doc.id,
            ...doc.data()
          }))
        );
      }
    );

    return () => unsub();
  }, []);

  // Sort by distance
  const sortedMushrooms = useMemo(() => {
    return [...mushrooms].sort((a, b) => {
      const da = getDistance(
        position[0],
        position[1],
        Number(a.lat),
        Number(a.lng)
      );

      const db = getDistance(
        position[0],
        position[1],
        Number(b.lat),
        Number(b.lng)
      );

      return da - db;
    });
  }, [mushrooms, position]);

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative" }}>
      {/* HUD */}
      <div style={{
        position: "absolute",
        top: 10,
        right: 10,
        zIndex: 99999,
        background: "white",
        padding: 10,
        borderRadius: 10,
        minWidth: 160
      }}>
        <div>GPS精度：{Math.round(accuracy)}m</div>
        <div>速度：{speed} km/h</div>
        <div>🍄 菇點：{mushrooms.length}</div>
      </div>

      {/* 菇點列表 */}
      <div style={{
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
      }}>
        <b>🍄 附近菇點</b>

        {sortedMushrooms.map((m) => (
          <div
            key={m.id}
            onClick={() =>
              setFocusTarget([Number(m.lat), Number(m.lng)])
            }
            style={{
              marginTop: 8,
              cursor: "pointer",
              borderBottom: "1px solid #ddd",
              paddingBottom: 6
            }}
          >
            {m.name}
            {isFavorite(m.id) && " ⭐"}
          </div>
        ))}
      </div>

      {/* 控制按鈕 */}
      <button
        onClick={() => {
          setFollow(true);
          setFocusTarget(null);
        }}
        style={{
          position: "absolute",
          bottom: 20,
          right: 20,
          zIndex: 99999
        }}
      >
        🎯 回到我
      </button>

      <button
        onClick={() => setFollow((v) => !v)}
        style={{
          position: "absolute",
          bottom: 60,
          right: 20,
          zIndex: 99999
        }}
      >
        {follow ? "跟隨 ON" : "跟隨 OFF"}
      </button>

      <button
        onClick={() => setAddMode((v) => !v)}
        style={{
          position: "absolute",
          bottom: 100,
          right: 20,
          zIndex: 99999
        }}
      >
        {addMode ? "新增菇 ON" : "新增菇 OFF"}
      </button>

      <MapContainer
        center={position}
        zoom={18}
        style={{ width: "100%", height: "100%" }}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        <MapEvents setFollow={setFollow} />
        <AddMushroom enabled={addMode} />

        {/* 玩家 */}
        <Marker position={position}>
          <Popup>你在這裡</Popup>
        </Marker>

        {/* 菇點 */}
        {sortedMushrooms.map((m) => {
          const distance = getDistance(
            position[0],
            position[1],
            Number(m.lat),
            Number(m.lng)
          );

          return (
            <Fragment key={m.id}>
              <Circle
                center={[Number(m.lat), Number(m.lng)]}
                radius={40}
                pathOptions={{
                  color: "green"
                }}
              />

              <Marker
                icon={mushroomIcon}
                position={[Number(m.lat), Number(m.lng)]}
              >
                <Popup>
                  <b>{m.name}</b>

                  <hr />

                  距離：{Math.round(distance)}m
                  <br />
                  力量：{m.power}

                  <hr />

                  <button
                    onClick={() =>
                      copyText(`${m.lat}, ${m.lng}`)
                    }
                  >
                    📋 複製座標
                  </button>

                  <br />

                  <button
                    onClick={() =>
                      toggleFavorite(m.id)
                    }
                  >
                    {isFavorite(m.id)
                      ? "⭐ 已收藏"
                      : "☆ 收藏"}
                  </button>

                  <br />

                  {distance <= 40
                    ? "🟢 可互動"
                    : "🔒 距離過遠"}
                </Popup>
              </Marker>
            </Fragment>
          );
        })}

        <MapController
          position={position}
          follow={follow}
          focusTarget={focusTarget}
        />
      </MapContainer>
    </div>
  );
}
