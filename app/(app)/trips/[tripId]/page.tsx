import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Trip } from "@/lib/types";

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

  const { data, error } = await supabase
    .from("trips")
    .select("*")
    .eq("id", tripId)
    .maybeSingle();

  if (error || !data) notFound();

  const trip = data as Trip;

  const [{ data: destinations }, { data: members }] = await Promise.all([
    supabase
      .from("destinations")
      .select("id,name,city,country,arrival_date,departure_date")
      .eq("trip_id", tripId)
      .order("sort_order"),
    supabase
      .from("trip_members")
      .select("id,role,user_id")
      .eq("trip_id", tripId),
  ]);

  return (
    <>
      <header className="page-header">
        <div>
          <Link className="muted" href="/trips">← My Trips</Link>
        </div>
        <div className="header-actions">
          <span className="badge">{trip.status}</span>
        </div>
      </header>

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

      <section className="quick-grid">
        <div className="quick-card"><div className="quick-icon">🗓</div><strong>Plan</strong><small>Itinerary coming next</small></div>
        <div className="quick-card"><div className="quick-icon">🎟</div><strong>Bookings</strong><small>Flights, hotels & cruises</small></div>
        <div className="quick-card"><div className="quick-icon">💬</div><strong>Chat</strong><small>Realtime crew chat</small></div>
        <div className="quick-card"><div className="quick-icon">📸</div><strong>Photos</strong><small>Trip albums & uploads</small></div>
      </section>

      <section className="two-col">
        <div className="panel">
          <h2>Trip overview</h2>
          <div className="list">
            <div className="list-row"><span>Primary destination</span><strong>{trip.primary_destination || "TBC"}</strong></div>
            <div className="list-row"><span>Budget</span><strong>{trip.budget_amount ? `$${Number(trip.budget_amount).toLocaleString("en-AU")} AUD` : "Not set"}</strong></div>
            <div className="list-row"><span>Status</span><span className="badge">{trip.status}</span></div>
          </div>
          {trip.description ? <p className="muted">{trip.description}</p> : null}
        </div>

        <div className="panel">
          <h2>Destinations</h2>
          {destinations?.length ? (
            <div className="list">
              {destinations.map((destination) => (
                <div className="list-row" key={destination.id}>
                  <strong>{destination.name}</strong>
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
