import Link from "next/link";

export function TripWorkspaceNav({
  tripId,
  active,
}: {
  tripId: string;
  active:
    | "overview"
    | "plan"
    | "bookings"
    | "travellers"
    | "places"
    | "chat"
    | "photos"
    | "documents"
    | "weather"
    | "map"
    | "money";
}) {
  const tabs = [
    { id: "overview", label: "Overview", href: `/trips/${tripId}` },
    { id: "plan", label: "Plan My Trip", href: `/trips/${tripId}/plan` },
    { id: "bookings", label: "Bookings", href: `/trips/${tripId}/bookings` },
    { id: "travellers", label: "Travellers", href: `/trips/${tripId}/travellers` },
    { id: "places", label: "Saved Places", href: `/trips/${tripId}/places` },
    { id: "chat", label: "Chat", href: `/trips/${tripId}/chat` },
    { id: "photos", label: "Photos", href: `/trips/${tripId}/photos` },
    { id: "documents", label: "Documents", href: `/trips/${tripId}/documents` },
    { id: "weather", label: "Weather", href: `/trips/${tripId}/weather` },
    { id: "map", label: "Map", href: `/trips/${tripId}/map` },
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
