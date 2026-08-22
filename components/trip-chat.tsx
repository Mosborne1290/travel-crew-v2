"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Message = {
  id: string;
  room_id: string;
  user_id: string;
  message_text: string | null;
  message_type: string;
  created_at: string;
  edited_at: string | null;
  deleted_at: string | null;
};

type Member = {
  user_id: string;
  display_name: string;
};

function niceTime(value: string) {
  return new Intl.DateTimeFormat("en-AU", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function TripChat({
  tripId,
  userId,
  roomId,
  initialMessages,
  members,
}: {
  tripId: string;
  userId: string;
  roomId: string;
  initialMessages: Message[];
  members: Member[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [text, setText] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  const names = useMemo(
    () => new Map(members.map((m) => [m.user_id, m.display_name])),
    [members],
  );

  useEffect(() => {
    const channel = supabase
      .channel(`trip-room-${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const next = payload.new as Message;
          setMessages((current) =>
            current.some((m) => m.id === next.id) ? current : [...current, next],
          );
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const next = payload.new as Message;
          setMessages((current) => current.map((m) => (m.id === next.id ? next : m)));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, supabase]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages.length]);

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = text.trim();
    if (!body || sending) return;

    setSending(true);
    setMessage("");

    const { data, error } = await supabase
      .from("messages")
      .insert({
        room_id: roomId,
        user_id: userId,
        message_text: body,
        message_type: "text",
      })
      .select("id,room_id,user_id,message_text,message_type,created_at,edited_at,deleted_at")
      .single();

    if (error) {
      setMessage(error.message);
    } else if (data) {
      setMessages((current) =>
        current.some((m) => m.id === data.id) ? current : [...current, data as Message],
      );
      setText("");
    }
    setSending(false);
  }

  async function deleteMessage(id: string) {
    if (!confirm("Delete this message?")) return;
    const { error } = await supabase
      .from("messages")
      .update({
        message_text: null,
        deleted_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", userId);

    if (error) setMessage(error.message);
  }

  return (
    <section className="chat-stage3">
      <div className="panel chat-panel">
        <div className="section-title-row">
          <div>
            <h2>Trip Chat</h2>
            <div className="muted">{members.length} traveller(s) in this trip</div>
          </div>
          <span className="badge">Live</span>
        </div>

        <div className="message-stream" aria-live="polite">
          {messages.length ? (
            messages.map((item) => {
              const mine = item.user_id === userId;
              return (
                <article className={`chat-message ${mine ? "mine" : ""}`} key={item.id}>
                  <div className="chat-avatar">
                    {(names.get(item.user_id) || "T").slice(0, 1).toUpperCase()}
                  </div>
                  <div className="chat-bubble-wrap">
                    <div className="chat-meta">
                      <strong>{mine ? "You" : names.get(item.user_id) || "Traveller"}</strong>
                      <span>{niceTime(item.created_at)}</span>
                    </div>
                    <div className={`chat-bubble ${mine ? "mine" : ""}`}>
                      {item.deleted_at ? <em>Message deleted</em> : item.message_text}
                    </div>
                    {mine && !item.deleted_at ? (
                      <button
                        type="button"
                        className="chat-delete"
                        onClick={() => deleteMessage(item.id)}
                      >
                        Delete
                      </button>
                    ) : null}
                  </div>
                </article>
              );
            })
          ) : (
            <div className="empty-mini">
              No messages yet. Start the conversation for this trip.
            </div>
          )}
          <div ref={endRef} />
        </div>

        <form className="chat-composer" onSubmit={sendMessage}>
          <textarea
            aria-label="Message"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Message your Travel Crew…"
            rows={2}
            maxLength={4000}
          />
          <button className="primary" type="submit" disabled={sending || !text.trim()}>
            {sending ? "Sending…" : "Send"}
          </button>
        </form>

        {message ? <div className="error">{message}</div> : null}
      </div>
    </section>
  );
}
