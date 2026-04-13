"use client";

import { createClient } from "@/lib/supabase/client";
import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${location.origin}/auth/callback` },
    });
    setSent(true);
    setLoading(false);
  };

  return (
    <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0f172a" }}>
      <div style={{ background: "#1e293b", padding: "2rem", borderRadius: "1rem", width: "100%", maxWidth: "400px" }}>
        <h1 style={{ color: "#f8fafc", fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.5rem" }}>
          AI Finance Tracker
        </h1>
        <p style={{ color: "#94a3b8", marginBottom: "2rem", fontSize: "0.875rem" }}>
          Magic Link — kein Passwort nötig.
        </p>

        {sent ? (
          <div style={{ color: "#22c55e", textAlign: "center", padding: "1rem" }}>
            Mail gesendet! Klicke den Link in deinem Postfach.
          </div>
        ) : (
          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <input
              type="email"
              placeholder="deine@email.de"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                padding: "0.75rem 1rem",
                borderRadius: "0.5rem",
                border: "1px solid #334155",
                background: "#0f172a",
                color: "#f8fafc",
                fontSize: "1rem",
              }}
            />
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: "0.75rem",
                borderRadius: "0.5rem",
                background: "#3b82f6",
                color: "white",
                fontWeight: 600,
                border: "none",
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? "Sende..." : "Magic Link senden"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
