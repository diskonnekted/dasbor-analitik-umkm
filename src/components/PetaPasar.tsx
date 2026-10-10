// src/components/PetaPasar.tsx
// Peta Leaflet: GeoJSON kecamatan (fill putih) + titik pasar NYATA dari koordinat (MScrape).

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface Props {
  height?: number;
}

interface TitikProps {
  nama: string;
  kategori: string;
}

function warnaKategori(k: string): string {
  if (k === "Pasar Ikan") return "#2563eb";
  if (k === "Pasar Hewan") return "#7c3aed";
  if (k === "Pasar Buah") return "#16a34a";
  if (k === "Pasar Unggas") return "#db2777";
  return "#ff7d2d"; // pasar tradisional / lainnya
}

export default function PetaPasar({ height = 420 }: Props) {
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const titikRef = useRef<L.LayerGroup | null>(null);
  const geoRef = useRef<GeoJSON.FeatureCollection | null>(null);

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

  // Muat GeoJSON kecamatan (latar) + titik pasar nyata
  useEffect(() => {
    fetch("/geo/peta_kecamatan.geojson")
      .then((r) => r.json())
      .then((geo: GeoJSON.FeatureCollection) => {
        geoRef.current = geo;
        const layer = L.geoJSON(geo, {
          style: { color: "#141414", weight: 0.8, fillColor: "#ffffff", fillOpacity: 0.35 },
        }).addTo(mapRef.current!);
        try {
          mapRef.current!.fitBounds(layer.getBounds(), { padding: [10, 10] });
        } catch {
          /* ignore */
        }
      })
      .catch(() => {
        /* ignore */
      });

    fetch("/geo/pasar_titik.geojson")
      .then((r) => r.json())
      .then((geo: GeoJSON.FeatureCollection) => {
        const map = mapRef.current;
        if (!map) return;
        const group = L.layerGroup();
        const bounds: [number, number][] = [];
        for (const f of geo.features) {
          const pt = f.geometry as GeoJSON.Point;
          const [lng, lat] = pt.coordinates as [number, number];
          const p = f.properties as TitikProps;
          const warna = warnaKategori(p.kategori);
          L.circleMarker([lat, lng], {
            radius: 7,
            color: "#ffffff",
            weight: 2,
            fillColor: warna,
            fillOpacity: 0.9,
          })
            .bindPopup(
              `<div style="font-family:'JetBrains Mono',monospace;font-size:12px;line-height:1.5">` +
                `<b style="text-transform:uppercase">${p.nama}</b><br/>` +
                `<span style="color:#6b7280">${p.kategori}</span><br/>` +
                `<span style="color:#6b7280">${lat.toFixed(5)}, ${lng.toFixed(5)}</span></div>`
            )
            .addTo(group);
          bounds.push([lat, lng]);
        }
        group.addTo(map);
        titikRef.current = group;
        if (bounds.length >= 2) map.fitBounds(L.latLngBounds(bounds).pad(0.1));
        else if (bounds.length === 1) map.setView(bounds[0], 11);
      })
      .catch(() => {
        /* titik tidak tersedia */
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={elRef} style={{ height }} className="border-hd shadow-hd z-0" />;
}
