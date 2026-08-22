import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Trip } from "@/lib/types";

function niceDate(value: string | null) {
  if (!value) return "TBC";
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

export default async function TripsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("trips")
    .select("*")
    .order("start_date", { ascending: true, nullsFirst: false });

  const trips = (data ?? []) as Trip[];

  return (
    <>
      <header className="page-header">
        <div>
          <h1>My Trips</h1>
          <div className="muted">Every adventure in one place.</div>
        </div>
        <Link className="primary" href="/trips/new">
          ＋ New Trip
        </Link>
      </header>

      {error ? <div className="error">{error.message}</div> : null}

      {trips.length ? (
        <section className="trip-grid">
          {trips.map((trip) => (
            <Link className="trip-card" href={`/trips/${trip.id}`} key={trip.id}>
              <div
                className="trip-cover"
                style={
                  trip.cover_image_url
                    ? { backgroundImage: `url("${trip.cover_image_url}")` }
                    : undefined
                }
              />
              <div className="trip-body">
                <h3>{trip.name}</h3>
                <div className="trip-meta">
                  <div>{trip.primary_destination || "Destination not set"}</div>
                  <div>{niceDate(trip.start_date)} – {niceDate(trip.end_date)}</div>
                </div>
                <div className="trip-footer">
                  <span className="badge">{trip.status}</span>
                  <strong>Open →</strong>
                </div>
              </div>
            </Link>
          ))}
        </section>
      ) : (
        <div className="empty-state">
          <h2>No trips yet</h2>
          <p className="muted">Create your first Travel Crew adventure.</p>
          <Link className="primary" href="/trips/new">
            Create Trip
          </Link>
        </div>
      )}
    </>
  );
}
