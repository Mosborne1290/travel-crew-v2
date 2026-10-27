import Link from "next/link";
import type { Trip } from "@/lib/types";
import { TripWorkspaceNav } from "@/components/trip-workspace-nav";
import { TripBackupButton } from "@/components/trip-backup-button";
import styles from "./trip-workspace.module.css";

type ActiveTab =
  | "overview" | "itinerary" | "today" | "plan" | "bookings" | "travellers"
  | "explore" | "places" | "map" | "weather" | "chat"
  | "polls" | "photos" | "journal" | "checklists"
  | "documents" | "important" | "activity" | "budget" | "settlements"
  | "money" | "search" | "near-me" | "offline" | "assistant";

function niceDate(value: string | null) {
  if (!value) return "TBC";
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

export function TripWorkspaceHeader({
  trip,
  active,
}: {
  trip: Trip;
  active: ActiveTab;
}) {
  return (
    <>
      <header className={styles.tripHeader}>
        <div className={styles.tripHeading}>
          <Link className={styles.backLink} href="/trips">← My Trips</Link>
          <div className={styles.titleRow}>
            <div>
              <h1>{trip.name}</h1>
              <p>
                {trip.primary_destination || "Destination not set"} ·{" "}
                {niceDate(trip.start_date)} – {niceDate(trip.end_date)}
              </p>
            </div>
            <span className={styles.statusBadge}>{trip.status}</span>
          </div>
        </div>

        <div className={styles.headerControls}>
          <Link className={styles.itineraryButton} href={`/trips/${trip.id}/itinerary`}>
            ✨ Itinerary
          </Link>

          <details className={styles.tripActions}>
            <summary>Trip Actions</summary>
            <div className={styles.tripActionsPanel}>
              <Link href={`/trips/${trip.id}/assistant`}>✨ Ask Travel Crew</Link>
              <Link href={`/trips/${trip.id}/print`} target="_blank">🖨️ Export Trip</Link>
              <div className={styles.backupWrap}><TripBackupButton tripId={trip.id} /></div>
            </div>
          </details>
        </div>
      </header>

      <TripWorkspaceNav tripId={trip.id} active={active} />
    </>
  );
}
