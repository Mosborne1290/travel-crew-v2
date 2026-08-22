"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Notification = {
  id: string;
  title: string;
  message: string | null;
  target_url: string | null;
  read_at: string | null;
  created_at: string;
};

export function NotificationBell({
  userId,
  initialNotifications,
}: {
  userId: string;
  initialNotifications: Notification[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const [items, setItems] = useState(initialNotifications);
  const [open, setOpen] = useState(false);

  const unread = items.filter((item) => !item.read_at).length;

  useEffect(() => {
    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          setItems((current) => [payload.new as Notification, ...current].slice(0, 20));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, userId]);

  async function markRead(id: string) {
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", id);

    setItems((current) =>
      current.map((item) =>
        item.id === id ? { ...item, read_at: new Date().toISOString() } : item,
      ),
    );
  }

  return (
    <div className="notification-wrap">
      <button
        type="button"
        className="notification-button"
        aria-label="Notifications"
        onClick={() => setOpen((v) => !v)}
      >
        🔔
        {unread ? <span className="notification-count">{unread}</span> : null}
      </button>

      {open ? (
        <div className="notification-popover">
          <div className="notification-heading">
            <strong>Notifications</strong>
            <span className="muted">{unread} unread</span>
          </div>

          {items.length ? (
            <div className="notification-list">
              {items.map((item) => (
                <div className={`notification-item ${item.read_at ? "" : "unread"}`} key={item.id}>
                  <div>
                    <strong>{item.title}</strong>
                    {item.message ? <p>{item.message}</p> : null}
                    <small>{new Intl.DateTimeFormat("en-AU", {
                      day: "numeric",
                      month: "short",
                      hour: "numeric",
                      minute: "2-digit",
                    }).format(new Date(item.created_at))}</small>
                  </div>
                  <div className="notification-actions">
                    {item.target_url ? (
                      <Link href={item.target_url} onClick={() => markRead(item.id)}>
                        Open
                      </Link>
                    ) : null}
                    {!item.read_at ? (
                      <button type="button" onClick={() => markRead(item.id)}>
                        Mark read
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-mini">No notifications yet.</div>
          )}
        </div>
      ) : null}
    </div>
  );
}
