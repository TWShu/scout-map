import React, { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, Polygon, useMap } from "react-leaflet";
import L from "leaflet";
import * as S2 from "s2-geometry";
import "leaflet.heat";

const icon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png"
});
L.Marker.prototype.options.icon = icon;

const TAIWAN = [
  { lat: 25.033, lng: 121.5654, name: "Taipei 101" },
  { lat: 25.0375, lng: 121.5637, name: "Xinyi District" },
  { lat: 25.0416, lng: 121.543, name: "Daan Park" },
  { lat: 25.0462, lng: 121.515, name: "Ximending" },
  { lat: 24.1374, lng: 120.6869, name: "Taichung Park" },
  { lat: 22.6273, lng: 120.3014, name: "Kaohsiung Pier-2" }
];

function cellId(lat, lng) {
  return S2.latLngToKey(lat, lng, 17);
}

function emptyCells(pois) {
  const occupied = new Set(pois.map(p => cellId(p.lat, p.lng)));

  const result = [];

  pois.forEach(p => {
    for (let dx = -0.01; dx <= 0.01; dx += 0.005) {
      for (let dy = -0.01; dy <= 0.01; dy += 0.005) {
        const lat = p.lat + dx;
        const lng = p.lng + dy;
        const id = cellId(lat, lng);

        if (!occupied.has(id)) {
          result.push({ lat, lng });
        }
      }
    }
  });

  return Array.from(new Map(result.map(r => [cellId(r.lat, r.lng), r])).values());
}

function GPS({ setPos }) {
  const map = useMap();

  useEffect(() => {
    if (!navigator.geolocation) return;

    const w = navigator.geolocation.watchPosition(pos => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      setPos([lat, lng]);
      map.setView([lat, lng], 16);
    });

    return () => navigator.geolocation.clearWatch(w);
  }, [map, setPos]);

  return null;
}

export default function App() {
  const [pois, setPois] = useState(TAIWAN);
  const [pos, setPos] = useState([25.033, 121.5654]);

  const empty = useMemo(() => emptyCells(pois), [pois]);

  return (
    <div style={{ height: "100vh" }}>
      <MapContainer center={pos} zoom={15} style={{ height: "100%" }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        <GPS setPos={setPos} />

        {empty.map((c, i) => (
          <Marker key={i} position={[c.lat, c.lng]}>
            <Popup>🧠 L17 Empty Cell</Popup>
          </Marker>
        ))}

        {pois.map((p, i) => (
          <Marker key={i} position={[p.lat, p.lng]}>
            <Popup>{p.name}</Popup>
          </Marker>
        ))}

        <Marker position={pos}>
          <Popup>You are here</Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}
