import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Trip } from "@/lib/types";
import { TripWorkspaceHeader } from "@/components/trip-workspace-header";
import { TripPolls } from "@/components/trip-polls";

export default async function PollsPage({params}:{params:Promise<{tripId:string}>}){
 const {tripId}=await params;const user=await requireUser();const supabase=await createClient();
 const [{data:trip},{data:polls}]=await Promise.all([supabase.from("trips").select("*").eq("id",tripId).maybeSingle(),supabase.from("polls").select("id,question,status,created_by,closes_at").eq("trip_id",tripId).order("created_at",{ascending:false})]);
 if(!trip)notFound();const ids=(polls??[]).map(p=>p.id);
 const [{data:options},{data:votes}]=ids.length?await Promise.all([supabase.from("poll_options").select("id,poll_id,label,sort_order").in("poll_id",ids).order("sort_order"),supabase.from("poll_votes").select("id,poll_id,option_id,user_id").in("poll_id",ids)]):[{data:[]},{data:[]}];
 return <><TripWorkspaceHeader trip={trip as Trip} active="polls"/><TripPolls tripId={tripId} userId={user.id} initialPolls={polls??[]} initialOptions={options??[]} initialVotes={votes??[]}/></>;
}
