"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);

    const supabase = createClient();
    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setBusy(false);

    if (loginError) {
      setError(loginError.message);
      return;
    }

    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <main className="auth-page">
      <section className="auth-visual">
        <div className="brand-lockup">
          <div className="brand-mark">✈</div>
          <div>
            <div className="brand-name">Travel Crew</div>
            <div>Plan • Explore • Share</div>
          </div>
        </div>

        <div>
          <div className="eyebrow">Travel Crew V2</div>
          <h1>One place for every part of your next adventure.</h1>
          <p>
            Trips, itineraries, bookings, photos, documents, weather, travel
            money and group planning — built for your own private Travel Crew.
          </p>
        </div>

        <div>Private friends & family travel planning</div>
      </section>

      <section className="auth-form-wrap">
        <div className="auth-card">
          <div className="eyebrow" style={{ color: "#2458dc" }}>
            Welcome back
          </div>
          <h2>Sign in</h2>
          <p className="muted">Use your Travel Crew email and password.</p>

          <form className="form-stack" onSubmit={handleLogin}>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error ? <div className="error">{error}</div> : null}

            <button className="primary" type="submit" disabled={busy}>
              {busy ? "Signing in…" : "Sign in to Travel Crew"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
