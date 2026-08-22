"use client";

import Link from "next/link";
import { useState } from "react";

export function MobileNav() {
  const [more, setMore] = useState(false);
  const [add, setAdd] = useState(false);

  return (
    <>
      <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
        <Link href="/dashboard"><span>⌂</span>Home</Link>
        <Link href="/trips"><span>🧳</span>Trips</Link>
        <Link href="/trips"><span>🗓️</span>Plan</Link>
        <Link href="/trips"><span>💬</span>Chat</Link>
        <button type="button" onClick={() => setMore(v => !v)}><span>•••</span>More</button>
      </nav>

      <button className="mobile-fab" type="button" aria-label="Quick add" onClick={() => setAdd(v => !v)}>＋</button>

      {more ? (
        <div className="mobile-more-sheet">
          <Link href="/weather">☀ Weather</Link>
          <Link href="/money">💱 Travel Money</Link>
          <Link href="/trips">🗺 Map</Link>
          <Link href="/trips">📸 Photos</Link>
          <Link href="/trips">📄 Documents</Link>
          <Link href="/trips">💰 Budget</Link>
          <Link href="/settings">⚙ Settings</Link>
        </div>
      ) : null}

      {add ? (
        <div className="mobile-add-sheet">
          <strong>Quick Add</strong>
          <p className="muted">Open your trip and choose:</p>
          <div className="quick-add-grid">
            <span>🗓 Activity</span><span>🎟 Booking</span><span>💳 Expense</span>
            <span>📸 Photo</span><span>📄 Document</span><span>📍 Saved Place</span>
          </div>
        </div>
      ) : null}
    </>
  );
}
