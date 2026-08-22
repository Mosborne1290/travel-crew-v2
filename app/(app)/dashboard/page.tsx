import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Trip } from "@/lib/types";

function formatDate(value: string | null) {
  if (!value) return "Date not set";
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

function daysUntil(value: string | null) {
  if (!value) return null;
  const start = new Date(`${value}T00:00:00Z`).getTime();
  const now = new Date();
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.ceil((start - today) / 86400000);
}

export default async function DashboardPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const [{ data: profile }, { data: trips }] = await Promise.all([
    supabase.from("profiles").select("display_name, first_name").eq("id", user.id).maybeSingle(),
    supabase
      .from("trips")
      .select("*")
      .order("start_date", { ascending: true, nullsFirst: false }),
  ]);

  const allTrips = (trips ?? []) as Trip[];
  const upcoming = allTrips.find(
    (trip) => !trip.end_date || new Date(`${trip.end_date}T23:59:59Z`) >= new Date(),
  );
  const name = profile?.first_name || profile?.display_name || "Traveller";
  const countdown = upcoming ? daysUntil(upcoming.start_date) : null;

  return (
    <>
      <header className="page-header">
        <div>
          <h1>Good to see you, {name}</h1>
          <div className="muted">Your next adventure is taking shape.</div>
        </div>
        <div className="header-actions">
          <Link className="primary" href="/trips/new">
            ＋ New Trip
          </Link>
        </div>
      </header>

      {upcoming ? (
        <Link
          href={`/trips/${upcoming.id}`}
          className="hero-card"
          style={
            upcoming.cover_image_url
              ? { backgroundImage: `url("${upcoming.cover_image_url}")` }
              : undefined
          }
        >
          <div className="hero-copy">
            <div className="eyebrow">Next adventure</div>
            <h2>{upcoming.name}</h2>
            <p>
              {upcoming.primary_destination || "Destination being planned"}
              {" · "}
              {formatDate(upcoming.start_date)} – {formatDate(upcoming.end_date)}
            </p>
            <div>
              {countdown !== null
                ? countdown > 0
                  ? `${countdown} days to go`
                  : countdown === 0
                    ? "Your trip starts today"
                    : "Trip underway"
                : "Dates to be confirmed"}
            </div>
          </div>
        </Link>
      ) : (
        <div className="empty-state">
          <h2>Create your first trip</h2>
          <p className="muted">
            Start with a destination and Travel Crew will build from there.
          </p>
          <Link className="primary" href="/trips/new">
            Create a trip
          </Link>
        </div>
      )}

      <section className="quick-grid">
        <Link className="quick-card" href="/trips">
          <div className="quick-icon">🧳</div>
          <strong>My Trips</strong>
          <small>Open and manage your adventures</small>
        </Link>
        <Link className="quick-card" href="/trips/new">
          <div className="quick-icon">🗓</div>
          <strong>Plan a Trip</strong>
          <small>Create a new itinerary</small>
        </Link>
        <div className="quick-card">
          <div className="quick-icon">💬</div>
          <strong>Trip Chat</strong>
          <small>Coming in the next build stage</small>
        </div>
        <div className="quick-card">
          <div className="quick-icon">📸</div>
          <strong>Photos</strong>
          <small>Coming in the next build stage</small>
        </div>
      </section>

      <section className="two-col">
        <div className="panel">
          <h2>Upcoming trips</h2>
          {allTrips.length ? (
            <div className="list">
              {allTrips.slice(0, 5).map((trip) => (
                <Link className="list-row" href={`/trips/${trip.id}`} key={trip.id}>
                  <div>
                    <strong>{trip.name}</strong>
                    <div className="muted">
                      {trip.primary_destination || "Destination not set"}
                    </div>
                  </div>
                  <span className="badge">{trip.status}</span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="muted">No trips yet.</p>
          )}
        </div>

        <div className="panel">
          <h2>Travel Crew V2</h2>
          <div className="list">
            <div className="list-row"><span>Trips</span><strong>{allTrips.length}</strong></div>
            <div className="list-row"><span>Home currency</span><strong>AUD</strong></div>
            <div className="list-row"><span>Database</span><strong>Connected</strong></div>
          </div>
        </div>
      </section>
    </>
  );
}
