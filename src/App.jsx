import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

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

export default function App() {

  const mapRef = useRef(null);

  // 🔥 只用 primitive state（避免 object rerender map）
  const [gps, setGps] = useState({
    lat: 25.033964,
    lng: 121.564468
  });

  const [mapReady, setMapReady] = useState(false);

  // ---------------- GPS ONLY DATA ----------------
  useEffect(() => {
    const id = navigator.geolocation.watchPosition((pos) => {
      setGps({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude
      });
    });

    return () => navigator.geolocation.clearWatch(id);
  }, []);

  // ---------------- SAFE MOVE ENGINE ----------------
  const moveTo = (lat, lng, zoom = 18) => {
    const map = mapRef.current;
    if (!map) return;

    // 🔥 等 DOM stable 再動
    requestAnimationFrame(() => {
      map.invalidateSize(true);

      map.flyTo([lat, lng], zoom, {
        duration: 0.8
      });

      // 🔥 second fix（避免灰畫面）
      setTimeout(() => {
        map.invalidateSize(true);
      }, 300);
    });
  };

  const returnToMe = () => {
    moveTo(gps.lat, gps.lng, 18);
  };

  // ---------------- FAKE DATA ----------------
  const mushrooms = [
    { id: 1, name: "菇A", lat: 25.035, lng: 121.56 },
    { id: 2, name: "菇B", lat: 25.032, lng: 121.565 }
  ];

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
        width: 160
      }}>
        <b>菇點</b>

        {mushrooms.map(m => (
          <div
            key={m.id}
            style={{ cursor: "pointer", marginTop: 8 }}
            onClick={() => moveTo(m.lat, m.lng, 19)}
          >
            {m.name}
          </div>
        ))}
      </div>

      {/* 🔥 KEY FIX: force stable map instance */}
      <MapContainer
        key="stable-map-instance"
        center={[25.033964, 121.564468]}
        zoom={18}
        style={{
          width: "100%",
          height: "100%",
          position: "absolute"
        }}
        whenCreated={(map) => {
          mapRef.current = map;

          // 🔥 防白畫面核心
          setTimeout(() => {
            map.invalidateSize(true);
          }, 300);

          setMapReady(true);
        }}
      >

        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          keepBuffer={6}
          updateWhenZooming={false}
          updateWhenIdle={true}
        />

        <Marker position={[gps.lat, gps.lng]}>
          <Popup>你在這裡</Popup>
        </Marker>

        {mushrooms.map(m => (
          <Marker key={m.id} position={[m.lat, m.lng]}>
            <Popup>{m.name}</Popup>
          </Marker>
        ))}

      </MapContainer>
    </div>
  );
}
