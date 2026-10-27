import Link from "next/link";
import styles from "./trip-workspace.module.css";

type ActiveTab =
  | "overview" | "itinerary" | "today" | "plan" | "bookings" | "travellers"
  | "explore" | "places" | "map" | "weather" | "chat"
  | "polls" | "photos" | "journal" | "checklists"
  | "documents" | "important" | "activity" | "budget" | "settlements"
  | "money" | "search" | "near-me" | "offline" | "assistant";

export function TripWorkspaceNav({ tripId, active }: { tripId: string; active: ActiveTab }) {
  const primary = [
    { id: "overview", label: "Overview", icon: "⌂", href: `/trips/${tripId}` },
    { id: "itinerary", label: "Itinerary", icon: "✨", href: `/trips/${tripId}/itinerary` },
    { id: "today", label: "Today", icon: "☀️", href: `/trips/${tripId}/today` },
    { id: "plan", label: "Plan", icon: "🗓️", href: `/trips/${tripId}/plan` },
    { id: "map", label: "Map", icon: "🗺️", href: `/trips/${tripId}/map` },
  ] as const;

  const groups = [
    { title: "Plan & People", items: [
      { id: "bookings", label: "Bookings", icon: "🎟️", href: `/trips/${tripId}/bookings` },
      { id: "travellers", label: "Travellers", icon: "👥", href: `/trips/${tripId}/travellers` },
      { id: "checklists", label: "Checklists", icon: "✅", href: `/trips/${tripId}/checklists` },
    ]},
    { title: "Explore", items: [
      { id: "explore", label: "Explore", icon: "🧭", href: `/trips/${tripId}/explore` },
      { id: "places", label: "Saved Places", icon: "⭐", href: `/trips/${tripId}/places` },
      { id: "weather", label: "Weather", icon: "🌤️", href: `/trips/${tripId}/weather` },
    ]},
    { title: "Memories & Chat", items: [
      { id: "chat", label: "Chat", icon: "💬", href: `/trips/${tripId}/chat` },
      { id: "photos", label: "Photos", icon: "📸", href: `/trips/${tripId}/photos` },
      { id: "journal", label: "Journal", icon: "📖", href: `/trips/${tripId}/journal` },
      { id: "documents", label: "Documents", icon: "📄", href: `/trips/${tripId}/documents` },
    ]},
    { title: "Money & Trip Tools", items: [
      { id: "budget", label: "Budget", icon: "💰", href: `/trips/${tripId}/budget` },
      { id: "settlements", label: "Settle Up", icon: "🤝", href: `/trips/${tripId}/settlements` },
      { id: "money", label: "Travel Money", icon: "💱", href: `/trips/${tripId}/money` },
      { id: "important", label: "Important Info", icon: "🛟", href: `/trips/${tripId}/important` },
      { id: "search", label: "Search Trip", icon: "🔎", href: `/trips/${tripId}/search` },
      { id: "activity", label: "Activity Feed", icon: "🕘", href: `/trips/${tripId}/activity` },
      { id: "offline", label: "Offline Tools", icon: "📱", href: `/trips/${tripId}/offline-tools` },
    ]},
  ] as const;

  const secondaryIds = new Set(groups.flatMap(group => group.items.map(item => item.id)));
  const secondaryActive = secondaryIds.has(active as any);

  return (
    <div className={styles.navWrap}>
      <nav className={styles.primaryNav} aria-label="Trip navigation">
        {primary.map(item => (
          <Link key={item.id} href={item.href} className={`${styles.primaryLink} ${active === item.id ? styles.active : ""}`}>
            <span className={styles.primaryIcon}>{item.icon}</span><span>{item.label}</span>
          </Link>
        ))}
        <details className={`${styles.moreMenu} ${secondaryActive ? styles.moreActive : ""}`}>
          <summary className={styles.moreSummary}><span className={styles.primaryIcon}>•••</span><span>More</span></summary>
          <div className={styles.morePanel}>
            {groups.map(group => (
              <section key={group.title} className={styles.menuGroup}>
                <h3>{group.title}</h3>
                <div className={styles.menuGrid}>
                  {group.items.map(item => (
                    <Link key={item.id} href={item.href} className={`${styles.menuItem} ${active === item.id ? styles.menuItemActive : ""}`}>
                      <span>{item.icon}</span><strong>{item.label}</strong>
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </details>
      </nav>
    </div>
  );
}
