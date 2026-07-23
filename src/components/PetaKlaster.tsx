// src/components/PetaKlaster.tsx
// Peta Leaflet dengan GeoJSON kecamatan + color-coding klaster.

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface Props {
  /** map key kecamatan (lowercase tanpa spasi) -> warna hex */
  colors: Record<string, string>;
  height?: number;
}

export default function PetaKlaster({ colors, height = 420 }: Props) {
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.GeoJSON | null>(null);

  useEffect(() => {
    if (!elRef.current || mapRef.current) return;
    const map = L.map(elRef.current, { scrollWheelZoom: false, zoomControl: true }).setView(
      [-7.39, 109.7],
      10
    );
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
      maxZoom: 18,
    }).addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (layerRef.current) {
      map.removeLayer(layerRef.current);
      layerRef.current = null;
    }
    fetch("/geo/peta_kecamatan.geojson")
      .then((r) => r.json())
      .then((geo) => {
        const layer = L.geoJSON(geo, {
          style: (feature) => {
            const key = String(feature?.properties?.Kecamatan ?? "").toLowerCase().replace(/\s+/g, "");
            const color = colors[key] ?? "#e5e7eb";
            return {
              color: "#141414",
              weight: 0.8,
              fillColor: color,
              fillOpacity: 0.55,
            };
          },
          onEachFeature: (feature, lyr) => {
            const key = String(feature?.properties?.Kecamatan ?? "").toLowerCase().replace(/\s+/g, "");
            lyr.bindPopup(
              `<b style="font-family:'JetBrains Mono',monospace;text-transform:uppercase">${key}</b>`
            );
          },
        }).addTo(map);
        layerRef.current = layer;
        try {
          map.fitBounds(layer.getBounds(), { padding: [10, 10] });
        } catch {
          /* ignore */
        }
      })
      .catch(() => {
        /* ignore */
      });
  }, [colors]);

  return (
    <div
      ref={elRef}
      style={{ height }}
      className="border-hd shadow-hd z-0"
    />
  );
}
