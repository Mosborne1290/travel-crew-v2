import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Trip } from "@/lib/types";
import { TripWorkspaceHeader } from "@/components/trip-workspace-header";

function niceDate(value: string | null) {
  if (!value) return "TBC";
  return new Intl.DateTimeFormat("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

export default async function TripDetailPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;
  const supabase = await createClient();

  const [
    { data: tripData, error },
    { data: destinations },
    { data: members },
    { count: activityCount },
    { count: bookingCount },
    { count: placeCount },
  ] = await Promise.all([
    supabase.from("trips").select("*").eq("id", tripId).maybeSingle(),
    supabase
      .from("destinations")
      .select("id,name,city,country,arrival_date,departure_date")
      .eq("trip_id", tripId)
      .order("sort_order"),
    supabase.from("trip_members").select("id,role,user_id").eq("trip_id", tripId),
    supabase.from("activities").select("*", { count: "exact", head: true }).eq("trip_id", tripId),
    supabase.from("bookings").select("*", { count: "exact", head: true }).eq("trip_id", tripId),
    supabase.from("saved_places").select("*", { count: "exact", head: true }).eq("trip_id", tripId),
  ]);

  if (error || !tripData) notFound();
  const trip = tripData as Trip;

  return (
    <>
      <TripWorkspaceHeader trip={trip} active="overview" />

      <section
        className="hero-card detail-hero"
        style={
          trip.cover_image_url
            ? { backgroundImage: `url("${trip.cover_image_url}")` }
            : undefined
        }
      >
        <div className="hero-copy">
          <div className="eyebrow">{trip.trip_type.replace("_", " ")}</div>
          <h2>{trip.name}</h2>
          <div>{trip.primary_destination || "Destination not set"}</div>
          <div className="detail-meta">
            <span>📅 {niceDate(trip.start_date)} – {niceDate(trip.end_date)}</span>
            <span>👥 {members?.length ?? 0} traveller(s)</span>
            <span>💳 {trip.home_currency}</span>
          </div>
        </div>
      </section>

      <section className="stats-grid">
        <Link className="stat-card" href={`/trips/${tripId}/plan`}>
          <div className="stat-icon">🗓️</div>
          <div><strong>{activityCount ?? 0}</strong><span>planned activities</span></div>
        </Link>
        <Link className="stat-card" href={`/trips/${tripId}/bookings`}>
          <div className="stat-icon">🎟️</div>
          <div><strong>{bookingCount ?? 0}</strong><span>bookings</span></div>
        </Link>
        <Link className="stat-card" href={`/trips/${tripId}/travellers`}>
          <div className="stat-icon">👥</div>
          <div><strong>{members?.length ?? 0}</strong><span>travellers</span></div>
        </Link>
        <Link className="stat-card" href={`/trips/${tripId}/places`}>
          <div className="stat-icon">📍</div>
          <div><strong>{placeCount ?? 0}</strong><span>saved places</span></div>
        </Link>
      </section>

      <section className="two-col">
        <div className="panel">
          <div className="section-title-row">
            <div>
              <h2>Trip overview</h2>
              <div className="muted">Everything Stage 2 has connected to this trip.</div>
            </div>
          </div>
          <div className="list">
            <div className="list-row"><span>Primary destination</span><strong>{trip.primary_destination || "TBC"}</strong></div>
            <div className="list-row"><span>Trip dates</span><strong>{niceDate(trip.start_date)} – {niceDate(trip.end_date)}</strong></div>
            <div className="list-row"><span>Budget</span><strong>{trip.budget_amount ? `$${Number(trip.budget_amount).toLocaleString("en-AU")} AUD` : "Not set"}</strong></div>
          </div>
          {trip.description ? <p className="muted">{trip.description}</p> : null}
        </div>

        <div className="panel">
          <h2>Destinations</h2>
          {destinations?.length ? (
            <div className="list">
              {destinations.map((destination) => (
                <div className="list-row" key={destination.id}>
                  <div>
                    <strong>{destination.name}</strong>
                    <div className="muted">{[destination.city, destination.country].filter(Boolean).join(", ")}</div>
                  </div>
                  <span>📍</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted">No destinations added yet.</p>
          )}
        </div>
      </section>
    </>
  );
}
