import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Travel Crew V2",
    short_name: "Travel Crew",
    description: "Private trip planning, chat, photos, bookings and travel tools.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#f4f7fc",
    theme_color: "#2458dc",
    orientation: "portrait-primary",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
