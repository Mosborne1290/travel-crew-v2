import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Trip } from "@/lib/types";
import { TripWorkspaceHeader } from "@/components/trip-workspace-header";
import { TripBookings } from "@/components/trip-bookings";

export default async function BookingsPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;
  const user = await requireUser();
  const supabase = await createClient();

  const [{ data: tripData }, { data: bookings }] = await Promise.all([
    supabase.from("trips").select("*").eq("id", tripId).maybeSingle(),
    supabase
      .from("bookings")
      .select("id,booking_type,provider,booking_reference,confirmation_number,start_datetime,end_datetime,total_amount,currency,payment_status,booking_status,notes")
      .eq("trip_id", tripId)
      .order("start_datetime", { ascending: true, nullsFirst: false }),
  ]);

  if (!tripData) notFound();

  return (
    <>
      <TripWorkspaceHeader trip={tripData as Trip} active="bookings" />
      <TripBookings tripId={tripId} userId={user.id} initialBookings={bookings ?? []} />
    </>
  );
}
