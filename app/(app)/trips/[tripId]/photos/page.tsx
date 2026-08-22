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

  const [{ data: tripData }, { data: photos }] = await Promise.all([
    supabase.from("trips").select("*").eq("id", tripId).maybeSingle(),
    supabase
      .from("photos")
      .select("id,storage_path,thumbnail_path,caption,taken_at,uploaded_at,uploaded_by")
      .eq("trip_id", tripId)
      .order("uploaded_at", { ascending: false }),
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
      />
    </>
  );
}
