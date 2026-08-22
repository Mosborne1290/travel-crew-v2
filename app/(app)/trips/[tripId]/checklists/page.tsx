import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Trip } from "@/lib/types";
import { TripWorkspaceHeader } from "@/components/trip-workspace-header";
import { TripPrep } from "@/components/trip-prep";
import { AutoReminders } from "@/components/auto-reminders";

export default async function PrepPage({params}:{params:Promise<{tripId:string}>}){
 const {tripId}=await params;const user=await requireUser();const supabase=await createClient();
 const [{data:trip},{data:checklists},{data:items},{data:packing},{data:reminders},{data:memberRows}]=await Promise.all([
  supabase.from("trips").select("*").eq("id",tripId).maybeSingle(),
  supabase.from("checklists").select("id,title,category").eq("trip_id",tripId).order("created_at"),
  supabase.from("checklist_items").select("id,checklist_id,title,assigned_to,due_date,completed,notes").eq("trip_id",tripId).order("sort_order"),
  supabase.from("packing_items").select("id,traveller_user_id,title,category,quantity,packed,shared").eq("trip_id",tripId).order("category"),
  supabase.from("trip_reminders").select("id,user_id,title,message,remind_at,target_url,completed").eq("trip_id",tripId).order("remind_at"),
  supabase.from("trip_members").select("user_id").eq("trip_id",tripId),
 ]);
 if(!trip)notFound();
 const ids=(memberRows??[]).map(m=>m.user_id);const {data:profiles}=ids.length?await supabase.from("profiles").select("id,display_name,first_name,last_name").in("id",ids):{data:[] as any[]};
 const members=ids.map(id=>{const p=(profiles??[]).find(x=>x.id===id);return{user_id:id,display_name:p?.display_name||[p?.first_name,p?.last_name].filter(Boolean).join(" ")||"Traveller"}});
 return <><TripWorkspaceHeader trip={trip as Trip} active="checklists"/><AutoReminders tripId={tripId}/><TripPrep tripId={tripId} userId={user.id} tripEnd={trip.end_date} members={members} initialChecklists={checklists??[]} initialItems={items??[]} initialPacking={packing??[]} initialReminders={reminders??[]}/></>;
}
