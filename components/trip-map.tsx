"use client";

import { useEffect, useRef, useState } from "react";

type Point = {
  id: string;
  kind: "destination" | "place" | "activity";
  name: string;
  latitude: number;
  longitude: number;
  detail: string | null;
};

export function TripMap({ points }: { points: Point[] }) {
  const mapNode = useRef<HTMLDivElement | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let map: any;
    let cancelled = false;

    async function initialise() {
      if (!mapNode.current || !points.length) return;

      try {
        const mod = await import("maplibre-gl");
        if (cancelled || !mapNode.current) return;
        const maplibregl = mod.default;

        const primary = points[0];

        map = new maplibregl.Map({
          container: mapNode.current,
          center: [primary.longitude, primary.latitude],
          zoom: points.length > 1 ? 10 : 11,
          style: {
            version: 8,
            sources: {
              osm: {
                type: "raster",
                tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
                tileSize: 256,
                attribution: "© OpenStreetMap contributors",
              },
            },
            layers: [
              {
                id: "osm",
                type: "raster",
                source: "osm",
              },
            ],
          },
        });

        map.addControl(new maplibregl.NavigationControl(), "top-right");

        const bounds = new maplibregl.LngLatBounds();

        points.forEach((point) => {
          const el = document.createElement("div");
          el.className = `travel-map-marker ${point.kind}`;
          el.textContent =
            point.kind === "destination" ? "★" :
            point.kind === "activity" ? "•" : "♥";
          el.setAttribute("aria-label", point.name);

          const popup = new maplibregl.Popup({ offset: 18 }).setHTML(
            `<strong>${escapeHtml(point.name)}</strong>` +
              (point.detail ? `<div>${escapeHtml(point.detail)}</div>` : ""),
          );

          new maplibregl.Marker({ element: el })
            .setLngLat([point.longitude, point.latitude])
            .setPopup(popup)
            .addTo(map);

          bounds.extend([point.longitude, point.latitude]);
        });

        if (points.length > 1) {
          map.fitBounds(bounds, { padding: 70, maxZoom: 13 });
        }
      } catch {
        setMessage("The interactive map could not load.");
      }
    }

    initialise();

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [points]);

  if (!points.length) {
    return (
      <div className="empty-state">
        <h3>No mapped locations yet</h3>
        <p className="muted">
          Open the Weather tab first and confirm the trip destination. Travel Crew will save
          its coordinates and it will appear on this map.
        </p>
      </div>
    );
  }

  return (
    <section className="panel">
      <div className="section-title-row">
        <div>
          <h2>Trip Map</h2>
          <div className="muted">Destination, saved places and itinerary locations with coordinates.</div>
        </div>
        <span className="badge">{points.length} pin(s)</span>
      </div>

      <div ref={mapNode} className="travel-map" />

      <div className="map-legend">
        <span><i className="legend-dot destination" /> Destination</span>
        <span><i className="legend-dot place" /> Saved place</span>
        <span><i className="legend-dot activity" /> Activity</span>
      </div>

      {message ? <div className="error">{message}</div> : null}
    </section>
  );
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
