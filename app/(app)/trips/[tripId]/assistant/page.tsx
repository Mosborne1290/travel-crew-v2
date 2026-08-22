import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Trip } from "@/lib/types";
import { TripWorkspaceHeader } from "@/components/trip-workspace-header";
import { AiTripAssistant } from "@/components/ai-trip-assistant";

export default async function AssistantPage({params}:{params:Promise<{tripId:string}>}){
  const {tripId}=await params;const user=await requireUser();const supabase=await createClient();
  const {data:trip}=await supabase.from("trips").select("*").eq("id",tripId).maybeSingle();
  if(!trip)notFound();
  return <><TripWorkspaceHeader trip={trip as Trip} active="assistant"/><AiTripAssistant tripId={tripId} userId={user.id}/></>;
}
