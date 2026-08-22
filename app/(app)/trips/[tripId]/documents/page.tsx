import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Trip } from "@/lib/types";
import { TripWorkspaceHeader } from "@/components/trip-workspace-header";
import { TripDocuments } from "@/components/trip-documents";

export default async function TripDocumentsPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;
  const user = await requireUser();
  const supabase = await createClient();

  const [{ data: tripData }, { data: documents }] = await Promise.all([
    supabase.from("trips").select("*").eq("id", tripId).maybeSingle(),
    supabase
      .from("documents")
      .select("id,document_type,name,storage_path,file_type,file_size,booking_reference,expiry_date,notes,created_at,uploaded_by")
      .eq("trip_id", tripId)
      .order("created_at", { ascending: false }),
  ]);

  if (!tripData) notFound();

  return (
    <>
      <TripWorkspaceHeader trip={tripData as Trip} active="documents" />
      <TripDocuments
        tripId={tripId}
        userId={user.id}
        initialDocuments={documents ?? []}
      />
    </>
  );
}
