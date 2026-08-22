import Link from "next/link";
import { LogoutButton } from "@/components/logout-button";

export function AppShell({
  children,
  displayName,
  role,
}: {
  children: React.ReactNode;
  displayName: string;
  role: string;
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
          <Link className="nav-link" href="/settings">
            <span>⚙</span> <span className="nav-text">Settings</span>
          </Link>
        </nav>

        <div className="owner-card">
          <div className="owner-text">
            <strong>{displayName}</strong>
            <small>{role}</small>
          </div>
        </div>
      </aside>

      <main className="content-shell">{children}</main>
    </div>
  );
}
