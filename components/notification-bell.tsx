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
  notification_type?: string | null;
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
  const [popup, setPopup] = useState<Notification | null>(null);

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
          const next = payload.new as Notification;

          setItems((current) => [
            next,
            ...current.filter((item) => item.id !== next.id),
          ].slice(0, 30));

          // Chat notifications appear immediately as a popup.
          if (next.notification_type === "chat") {
            setPopup(next);

            window.setTimeout(() => {
              setPopup((current) =>
                current?.id === next.id ? null : current
              );
            }, 8000);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, userId]);

  async function markRead(id: string) {
    const readAt = new Date().toISOString();

    await supabase
      .from("notifications")
      .update({ read_at: readAt })
      .eq("id", id);

    setItems((current) =>
      current.map((item) =>
        item.id === id ? { ...item, read_at: readAt } : item,
      ),
    );

    setPopup((current) => current?.id === id ? null : current);
  }

  async function openNotification(item: Notification) {
    await markRead(item.id);
    if (item.target_url) {
      window.location.href = item.target_url;
    }
  }

  return (
    <>
      <div className="notification-wrap">
        <button
          type="button"
          className="notification-button"
          aria-label="Notifications"
          onClick={() => setOpen((v) => !v)}
        >
          🔔
          {unread ? (
            <span className="notification-count">{unread}</span>
          ) : null}
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
                  <div
                    className={`notification-item ${item.read_at ? "" : "unread"}`}
                    key={item.id}
                  >
                    <div>
                      <strong>{item.title}</strong>
                      {item.message ? <p>{item.message}</p> : null}
                      <small>
                        {new Intl.DateTimeFormat("en-AU", {
                          day: "numeric",
                          month: "short",
                          hour: "numeric",
                          minute: "2-digit",
                        }).format(new Date(item.created_at))}
                      </small>
                    </div>

                    <div className="notification-actions">
                      {item.target_url ? (
                        <Link
                          href={item.target_url}
                          onClick={() => markRead(item.id)}
                        >
                          Open
                        </Link>
                      ) : null}

                      {!item.read_at ? (
                        <button
                          type="button"
                          onClick={() => markRead(item.id)}
                        >
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

      {popup ? (
        <div className="chat-notification-popup" role="status">
          <button
            type="button"
            className="chat-popup-main"
            onClick={() => openNotification(popup)}
          >
            <div className="chat-popup-icon">💬</div>
            <div className="chat-popup-copy">
              <strong>{popup.title || "New Trip Chat"}</strong>
              <span>
                {popup.message || "Something new was shared to your trip chat."}
              </span>
              <small>Click to review in Trip Chat</small>
            </div>
          </button>

          <button
            className="chat-popup-close"
            type="button"
            aria-label="Dismiss notification"
            onClick={() => setPopup(null)}
          >
            ×
          </button>
        </div>
      ) : null}
    </>
  );
}
