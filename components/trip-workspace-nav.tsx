import Link from "next/link";

export function TripWorkspaceNav({
  tripId,
  active,
}: {
  tripId: string;
  active: "overview" | "plan" | "bookings" | "travellers" | "places";
}) {
  const tabs = [
    { id: "overview", label: "Overview", href: `/trips/${tripId}` },
    { id: "plan", label: "Plan My Trip", href: `/trips/${tripId}/plan` },
    { id: "bookings", label: "Bookings", href: `/trips/${tripId}/bookings` },
    { id: "travellers", label: "Travellers", href: `/trips/${tripId}/travellers` },
    { id: "places", label: "Saved Places", href: `/trips/${tripId}/places` },
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
      <span className="workspace-tab disabled" title="Stage 3">Chat</span>
      <span className="workspace-tab disabled" title="Stage 3">Photos</span>
      <span className="workspace-tab disabled" title="Stage 3">Documents</span>
    </nav>
  );
}
