import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// leaflet fix
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

  const [position, setPosition] = useState([
    25.033964,
    121.564468
  ]);

  const mushrooms = [
    { id: 1, name: "菇A", lat: 25.035, lng: 121.56 },
    { id: 2, name: "菇B", lat: 25.032, lng: 121.565 }
  ];

  // GPS
  useEffect(() => {
    const id = navigator.geolocation.watchPosition((pos) => {
      setPosition([
        pos.coords.latitude,
        pos.coords.longitude
      ]);
    });

    return () => navigator.geolocation.clearWatch(id);
  }, []);

  // 👉 唯一地圖控制
  const moveMap = (lat, lng, zoom = 18) => {
    if (!mapRef.current) return;

    mapRef.current.flyTo([lat, lng], zoom, {
      duration: 0.8
    });
  };

  return (
    <div style={{ width: "100vw", height: "100vh" }}>

      {/* 控制 */}
      <div style={{ position: "absolute", zIndex: 9999, top: 10, right: 10, background: "#fff", padding: 10 }}>
        
        <button onClick={() => moveMap(position[0], position[1], 18)}>
          🎯 回到我
        </button>

      </div>

      {/* list */}
      <div style={{ position: "absolute", zIndex: 9999, top: 120, right: 10, background: "#fff", padding: 10 }}>
        <b>菇點</b>

        {mushrooms.map((m) => (
          <div
            key={m.id}
            style={{ cursor: "pointer", marginTop: 8 }}
            onClick={() => moveMap(m.lat, m.lng, 19)}
          >
            {m.name}
          </div>
        ))}
      </div>

      <MapContainer
        center={[25.033964, 121.564468]}
        zoom={18}
        style={{ width: "100%", height: "100%" }}
        whenCreated={(map) => (mapRef.current = map)}
      >

        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        {/* 玩家 */}
        <Marker position={position}>
          <Popup>你在這裡</Popup>
        </Marker>

        {/* 菇 */}
        {mushrooms.map((m) => (
          <Marker key={m.id} position={[m.lat, m.lng]}>
            <Popup>{m.name}</Popup>
          </Marker>
        ))}

      </MapContainer>
    </div>
  );
}
