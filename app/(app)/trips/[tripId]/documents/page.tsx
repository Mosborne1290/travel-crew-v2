import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Trip } from "@/lib/types";
import { TripWorkspaceHeader } from "@/components/trip-workspace-header";
import { TripDocuments } from "@/components/trip-documents";
import { DocumentHealth } from "@/components/document-health";

export default async function TripDocumentsPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;
  const user = await requireUser();
  const supabase = await createClient();

  const [{ data: tripData }, { data: documents }, { data: memberRows }] = await Promise.all([
    supabase.from("trips").select("*").eq("id", tripId).maybeSingle(),
    supabase
      .from("documents")
      .select("id,document_type,name,storage_path,file_type,file_size,booking_reference,expiry_date,notes,created_at,uploaded_by,traveller_user_id,needed_date,alert_days,document_status")
      .eq("trip_id", tripId)
      .order("created_at", { ascending: false }),
    supabase.from("trip_members").select("user_id").eq("trip_id", tripId),
  ]);

  if (!tripData) notFound();
  const ids=(memberRows??[]).map(m=>m.user_id);
  const {data:profiles}=ids.length?await supabase.from("profiles").select("id,display_name,first_name,last_name").in("id",ids):{data:[] as any[]};
  const travellers=ids.map(id=>{const p=(profiles??[]).find(x=>x.id===id);return{user_id:id,display_name:p?.display_name||[p?.first_name,p?.last_name].filter(Boolean).join(" ")||"Traveller"}});

  return (
    <>
      <TripWorkspaceHeader trip={tripData as Trip} active="documents" />
      <DocumentHealth tripId={tripId} documents={documents ?? []} travellers={travellers} />
      <TripDocuments
        tripId={tripId}
        userId={user.id}
        initialDocuments={documents ?? []}
        travellers={travellers}
      />
    </>
  );
}
