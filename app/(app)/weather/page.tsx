import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function WeatherHomePage() {
  const supabase = await createClient();
  const { data: trips } = await supabase
    .from("trips")
    .select("id,name,primary_destination,start_date,status")
    .order("start_date", { ascending: true, nullsFirst: false });

  return (
    <>
      <header className="page-header">
        <div>
          <h1>Weather</h1>
          <div className="muted">Open a trip to view and save its destination forecast.</div>
        </div>
      </header>

      <section className="trip-grid">
        {(trips ?? []).map((trip) => (
          <Link className="trip-card weather-trip-card" href={`/trips/${trip.id}/weather`} key={trip.id}>
            <div className="weather-trip-icon">🌤️</div>
            <div className="trip-body">
              <h3>{trip.name}</h3>
              <div className="trip-meta">{trip.primary_destination || "Destination not set"}</div>
              <div className="trip-footer">
                <span className="badge">{trip.status}</span>
                <strong>Forecast →</strong>
              </div>
            </div>
          </Link>
        ))}
      </section>
    </>
  );
}
