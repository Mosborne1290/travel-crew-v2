import Link from "next/link";
import type { Trip } from "@/lib/types";
import { TripWorkspaceNav } from "@/components/trip-workspace-nav";
import { TripBackupButton } from "@/components/trip-backup-button";

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
    | "overview" | "itinerary" | "today" | "plan" | "bookings" | "travellers"
    | "explore" | "places" | "map" | "weather" | "chat"
    | "polls" | "photos" | "journal" | "checklists"
    | "documents" | "important" | "activity" | "budget" | "settlements" | "money" | "search" | "near-me" | "offline" | "assistant";
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
          <Link className="itinerary-header-button" href={`/trips/${trip.id}/itinerary`}>✨ View Itinerary</Link>
          <Link className="assistant-button" href={`/trips/${trip.id}/assistant`}>✨ Ask Travel Crew</Link>
          <Link className="ghost" href={`/trips/${trip.id}/print`} target="_blank">Export Trip</Link>
          <TripBackupButton tripId={trip.id} />
          <span className="badge">{trip.status}</span>
        </div>
      </header>
      <TripWorkspaceNav tripId={trip.id} active={active} />
    </>
  );
}
