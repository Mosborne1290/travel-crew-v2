import Link from "next/link";

export function TripWorkspaceNav({
  tripId,
  active,
}: {
  tripId: string;
  active:
    | "overview" | "itinerary" | "today" | "plan" | "bookings" | "travellers"
    | "explore" | "places" | "map" | "weather" | "chat"
    | "polls" | "photos" | "journal" | "checklists"
    | "documents" | "important" | "activity" | "budget" | "settlements" | "money" | "search" | "near-me" | "offline" | "assistant";
}) {
  const tabs = [
    { id: "overview", label: "Overview", href: `/trips/${tripId}` },
    { id: "itinerary", label: "✨ Itinerary", href: `/trips/${tripId}/itinerary` },
    { id: "today", label: "Today", href: `/trips/${tripId}/today` },
    { id: "plan", label: "Plan", href: `/trips/${tripId}/plan` },
    { id: "map", label: "Map", href: `/trips/${tripId}/map` },
    { id: "search", label: "Search", href: `/trips/${tripId}/search` },
    { id: "bookings", label: "Bookings", href: `/trips/${tripId}/bookings` },
    { id: "travellers", label: "Travellers", href: `/trips/${tripId}/travellers` },
    { id: "explore", label: "Explore", href: `/trips/${tripId}/explore` },
    { id: "near-me", label: "Near Me", href: `/trips/${tripId}/near-me` },
    { id: "places", label: "Saved Places", href: `/trips/${tripId}/places` },
    { id: "weather", label: "Weather", href: `/trips/${tripId}/weather` },
    { id: "chat", label: "Chat", href: `/trips/${tripId}/chat` },
    { id: "polls", label: "Polls", href: `/trips/${tripId}/polls` },
    { id: "photos", label: "Photos", href: `/trips/${tripId}/photos` },
    { id: "journal", label: "Journal", href: `/trips/${tripId}/journal` },
    { id: "checklists", label: "Checklists", href: `/trips/${tripId}/checklists` },
    { id: "offline", label: "Offline Tools", href: `/trips/${tripId}/offline-tools` },
    { id: "documents", label: "Documents", href: `/trips/${tripId}/documents` },
    { id: "activity", label: "Activity Feed", href: `/trips/${tripId}/activity` },
    { id: "important", label: "Important Info", href: `/trips/${tripId}/important` },
    { id: "budget", label: "Budget", href: `/trips/${tripId}/budget` },
    { id: "settlements", label: "Settle Up", href: `/trips/${tripId}/settlements` },
    { id: "money", label: "Money", href: `/trips/${tripId}/money` },
  ] as const;

  return (
    <nav className="workspace-tabs" aria-label="Trip workspace">
      {tabs.map((tab) => (
        <Link
          key={tab.id}
          className={`workspace-tab ${active === tab.id ? "active" : ""}`}
          href={tab.href}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
