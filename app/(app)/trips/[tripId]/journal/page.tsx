import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Trip } from "@/lib/types";
import { TripWorkspaceHeader } from "@/components/trip-workspace-header";
import { TripJournal } from "@/components/trip-journal";
export default async function JournalPage({params}:{params:Promise<{tripId:string}>}){const {tripId}=await params;const user=await requireUser();const supabase=await createClient();const [{data:trip},{data:entries},{data:photos}]=await Promise.all([supabase.from("trips").select("*").eq("id",tripId).maybeSingle(),supabase.from("journal_entries").select("id,entry_date,title,notes,highlight,favourite_moment,user_id").eq("trip_id",tripId).order("entry_date"),supabase.from("photos").select("id,caption,uploaded_at,itinerary_day_id,is_favourite").eq("trip_id",tripId)]);if(!trip)notFound();return <><TripWorkspaceHeader trip={trip as Trip} active="journal"/><TripJournal tripId={tripId} userId={user.id} initialEntries={entries??[]} photos={photos??[]}/></>}
