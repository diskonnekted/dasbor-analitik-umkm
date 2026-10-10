// src/components/PetaSpasial.tsx
// Peta Leaflet choropleth: isi warna per kecamatan berdasarkan metrik (koperasi/home industri).
// Data per kecamatan dari DB; GeoJSON peta_kecamatan.geojson.

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface Props {
  /** kecamatan (nama, case-insensitive) -> nilai metrik */
  data: Record<string, number>;
  /** label metrik untuk popup */
  label: string;
  height?: number;
}

export default function PetaSpasial({ data, label, height = 420 }: Props) {
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.GeoJSON | null>(null);

  // inisialisasi peta sekali
  useEffect(() => {
    if (!elRef.current || mapRef.current) return;
    const map = L.map(elRef.current, { scrollWheelZoom: false }).setView([-7.39, 109.7], 10);
    L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
      { attribution: "Tiles © Esri", maxZoom: 19 }
    ).addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // render choropleth saat data berubah
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const lower = Object.fromEntries(Object.entries(data).map(([k, v]) => [k.toLowerCase(), v]));
    const vals = Object.values(data);
    const min = Math.min(...vals);
    const max = Math.max(...vals);

    const norm = (v: number) => (max === min ? 0.5 : (v - min) / (max - min));
    // skala: putih (rendah) -> amber (tinggi)
    const color = (v: number) => {
      const t = norm(v);
      const r = Math.round(255);
      const g = Math.round(255 - t * 130);
      const b = Math.round(255 - t * 210);
      return `rgb(${r},${g},${b})`;
    };

    fetch("/geo/peta_kecamatan.geojson")
      .then((r) => r.json())
      .then((geo: GeoJSON.FeatureCollection) => {
        if (layerRef.current) {
          map.removeLayer(layerRef.current);
          layerRef.current = null;
        }
        const layer = L.geoJSON(geo, {
          style: (f) => {
            const name = (f?.properties?.Kecamatan || f?.properties?.Name || "").toLowerCase();
            const v = lower[name];
            return {
              color: "#141414",
              weight: 0.8,
              fillColor: v === undefined ? "#e5e5e5" : color(v),
              fillOpacity: v === undefined ? 0.15 : 0.5 + norm(v) * 0.45,
            };
          },
          onEachFeature: (f, lyr) => {
            const name = f.properties?.Kecamatan || f.properties?.Name || "";
            const v = lower[name.toLowerCase()];
            lyr.bindPopup(
              `<b style="font-family:'JetBrains Mono',monospace">${name}</b><br/>${label}: ${
                v === undefined ? "—" : v.toLocaleString("id-ID")
              }`
            );
          },
        }).addTo(map);
        try {
          map.fitBounds(layer.getBounds(), { padding: [10, 10] });
        } catch {
          /* ignore */
        }
        layerRef.current = layer;
      })
      .catch(() => {
        /* ignore */
      });
  }, [data, label]);

  return <div ref={elRef} style={{ height }} className="border-hd shadow-hd z-0" />;
}
