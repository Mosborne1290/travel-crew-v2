import Link from "next/link";
import type { Trip } from "@/lib/types";
import { TripWorkspaceNav } from "@/components/trip-workspace-nav";

function niceDate(value: string | null) {
  if (!value) return "TBC";
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric", month: "short", year: "numeric", timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

export function TripWorkspaceHeader({
  trip,
  active,
}: {
  trip: Trip;
  active:
    | "overview" | "plan" | "bookings" | "travellers" | "places"
    | "chat" | "photos" | "documents" | "weather" | "map" | "money"
    | "budget" | "assistant" | "explore";
}) {
  return (
    <>
      <header className="page-header trip-stage5-header">
        <div>
          <Link className="muted" href="/trips">← My Trips</Link>
          <h1 style={{ marginTop: 8 }}>{trip.name}</h1>
          <div className="muted">
            {trip.primary_destination || "Destination not set"} ·{" "}
            {niceDate(trip.start_date)} – {niceDate(trip.end_date)}
          </div>
        </div>
        <div className="header-actions">
          <Link className="assistant-button" href={`/trips/${trip.id}/assistant`}>✨ Ask Travel Crew</Link>
          <Link className="ghost" href={`/trips/${trip.id}/print`} target="_blank">Export Trip</Link>
          <span className="badge">{trip.status}</span>
        </div>
      </header>
      <TripWorkspaceNav tripId={trip.id} active={active} />
    </>
  );
}
