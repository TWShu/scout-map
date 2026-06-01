import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Leaflet icon fix
delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

export default function App() {
  const [position, setPosition] = useState([
    25.033964,
    121.564468
  ]);

  useEffect(() => {
    try {
      const id = navigator.geolocation.watchPosition(
        (pos) => {
          setPosition([
            pos.coords.latitude,
            pos.coords.longitude
          ]);
        },
        (err) => {
          console.log("GPS error:", err);
        }
      );

      return () => navigator.geolocation.clearWatch(id);
    } catch (e) {
      console.log("GPS not supported");
    }
  }, []);

  if (!position) return <div>Loading...</div>;

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <MapContainer
        center={position}
        zoom={16}
        style={{ width: "100%", height: "100%" }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <Marker position={position}>
          <Popup>你在這裡</Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}
