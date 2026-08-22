import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Trip } from "@/lib/types";
import { TripWorkspaceHeader } from "@/components/trip-workspace-header";
import { TripPhotos } from "@/components/trip-photos";

export default async function TripPhotosPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;
  const user = await requireUser();
  const supabase = await createClient();

  const [{ data: tripData }, { data: photos }, { data: days }] = await Promise.all([
    supabase.from("trips").select("*").eq("id", tripId).maybeSingle(),
    supabase
      .from("photos")
      .select("id,storage_path,caption,taken_at,uploaded_at,uploaded_by,itinerary_day_id,is_favourite")
      .eq("trip_id", tripId)
      .order("uploaded_at", { ascending: false }),
    supabase.from("itinerary_days").select("id,date,day_number").eq("trip_id", tripId).order("date"),
  ]);

  if (!tripData) notFound();

  const signedUrls: Record<string, string> = {};

  for (const photo of photos ?? []) {
    const result = await supabase.storage
      .from("trip-photos")
      .createSignedUrl(photo.storage_path, 60 * 60);

    if (result.data?.signedUrl) signedUrls[photo.id] = result.data.signedUrl;
  }

  return (
    <>
      <TripWorkspaceHeader trip={tripData as Trip} active="photos" />
      <TripPhotos
        tripId={tripId}
        userId={user.id}
        initialPhotos={photos ?? []}
        signedUrls={signedUrls}
        days={days ?? []}
      />
    </>
  );
}
