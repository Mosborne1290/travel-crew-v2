import type { Metadata } from "next";
import "./globals.css";
import "maplibre-gl/dist/maplibre-gl.css";
import { PwaRegister } from "@/components/pwa-register";

export const metadata: Metadata = {
  title: "Travel Crew V2",
  description: "Private travel planning for friends and family.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body><PwaRegister />{children}</body>
    </html>
  );
}
