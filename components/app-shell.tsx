import Link from "next/link";
import { LogoutButton } from "@/components/logout-button";
import { NotificationBell } from "@/components/notification-bell";
import { MobileNav } from "@/components/mobile-nav";

type Notification = {
  id: string;
  title: string;
  message: string | null;
  target_url: string | null;
  read_at: string | null;
  created_at: string;
};

export function AppShell({
  children,
  displayName,
  role,
  userId,
  notifications,
}: {
  children: React.ReactNode;
  displayName: string;
  role: string;
  userId: string;
  notifications: Notification[];
}) {
  return (
    <div className="app-layout">
      <aside className="sidebar">
        <Link href="/dashboard" className="brand-lockup">
          <div className="brand-mark">✈</div>
          <div>
            <div className="brand-name">Travel Crew</div>
            <small className="brand-sub">Plan • Explore • Share</small>
          </div>
        </Link>

        <nav className="nav-list" aria-label="Main navigation">
          <Link className="nav-link" href="/dashboard">
            <span>⌂</span> <span className="nav-text">Dashboard</span>
          </Link>
          <Link className="nav-link" href="/trips">
            <span>🧳</span> <span className="nav-text">My Trips</span>
          </Link>
          <Link className="nav-link" href="/trips/new">
            <span>＋</span> <span className="nav-text">New Trip</span>
          </Link>
          <Link className="nav-link" href="/weather">
            <span>☀</span> <span className="nav-text">Weather</span>
          </Link>
          <Link className="nav-link" href="/money">
            <span>💱</span> <span className="nav-text">Travel Money</span>
          </Link>
          <Link className="nav-link" href="/settings">
            <span>⚙</span> <span className="nav-text">Settings</span>
          </Link>
        </nav>

        <div className="owner-card">
          <div className="owner-text">
            <strong>{displayName}</strong>
            <small>{role}</small>
          </div>
          <div style={{ marginTop: 10 }}>
            <LogoutButton />
          </div>
        </div>
      </aside>

      <main className="content-shell">
        <div className="app-top-tools">
          <NotificationBell userId={userId} initialNotifications={notifications} />
        </div>
        {children}
      </main>
          <MobileNav />
    </div>
  );
}
