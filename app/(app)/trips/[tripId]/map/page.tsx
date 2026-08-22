import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Trip } from "@/lib/types";
import { TripWorkspaceHeader } from "@/components/trip-workspace-header";
import { TripMap } from "@/components/trip-map";

export default async function TripMapPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;
  const supabase = await createClient();

  const [
    { data: tripData },
    { data: destinations },
    { data: places },
    { data: activities },
  ] = await Promise.all([
    supabase.from("trips").select("*").eq("id", tripId).maybeSingle(),
    supabase
      .from("destinations")
      .select("id,name,city,country,latitude,longitude")
      .eq("trip_id", tripId),
    supabase
      .from("saved_places")
      .select("id,name,category,address,latitude,longitude")
      .eq("trip_id", tripId),
    supabase
      .from("activities")
      .select("id,title,venue_name,address,latitude,longitude")
      .eq("trip_id", tripId),
  ]);

  if (!tripData) notFound();

  const points = [
    ...(destinations ?? [])
      .filter((p) => p.latitude != null && p.longitude != null)
      .map((p) => ({
        id: `destination-${p.id}`,
        kind: "destination" as const,
        name: p.name,
        latitude: Number(p.latitude),
        longitude: Number(p.longitude),
        detail: [p.city, p.country].filter(Boolean).join(", ") || null,
      })),
    ...(places ?? [])
      .filter((p) => p.latitude != null && p.longitude != null)
      .map((p) => ({
        id: `place-${p.id}`,
        kind: "place" as const,
        name: p.name,
        latitude: Number(p.latitude),
        longitude: Number(p.longitude),
        detail: p.address || p.category || null,
      })),
    ...(activities ?? [])
      .filter((p) => p.latitude != null && p.longitude != null)
      .map((p) => ({
        id: `activity-${p.id}`,
        kind: "activity" as const,
        name: p.title,
        latitude: Number(p.latitude),
        longitude: Number(p.longitude),
        detail: p.venue_name || p.address || null,
      })),
  ];

  return (
    <>
      <TripWorkspaceHeader trip={tripData as Trip} active="map" />
      <TripMap points={points} />
    </>
  );
}
