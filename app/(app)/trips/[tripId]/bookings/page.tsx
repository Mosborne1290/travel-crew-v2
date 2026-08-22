import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Trip } from "@/lib/types";
import { TripWorkspaceHeader } from "@/components/trip-workspace-header";
import { AdvancedBookings } from "@/components/advanced-bookings";

export default async function BookingsPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  const user = await requireUser();
  const supabase = await createClient();

  const [{ data: tripData }, { data: bookings }] = await Promise.all([
    supabase.from("trips").select("*").eq("id", tripId).maybeSingle(),
    supabase.from("bookings").select("id,booking_type,provider,booking_reference,confirmation_number,start_datetime,end_datetime,total_amount,currency,payment_status,booking_status,notes").eq("trip_id", tripId).order("start_datetime",{ascending:true,nullsFirst:false}),
  ]);
  if (!tripData) notFound();

  const detailMap: Record<string, any> = {};
  const rows = bookings ?? [];
  const flights = rows.filter(b => b.booking_type === "flight").map(b => b.id);
  const hotels = rows.filter(b => b.booking_type === "hotel").map(b => b.id);
  const cruises = rows.filter(b => b.booking_type === "cruise").map(b => b.id);

  if (flights.length) {
    const { data } = await supabase.from("flights").select("*").in("booking_id", flights);
    for (const d of data ?? []) detailMap[d.booking_id] = d;
  }
  if (hotels.length) {
    const { data } = await supabase.from("accommodation").select("*").in("booking_id", hotels);
    for (const d of data ?? []) detailMap[d.booking_id] = d;
  }
  if (cruises.length) {
    const { data } = await supabase.from("cruises").select("*").in("booking_id", cruises);
    for (const d of data ?? []) detailMap[d.booking_id] = d;
  }

  return (
    <>
      <TripWorkspaceHeader trip={tripData as Trip} active="bookings" />
      <AdvancedBookings tripId={tripId} userId={user.id} initialBookings={rows} initialDetails={detailMap} />
    </>
  );
}
