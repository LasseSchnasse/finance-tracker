"use client";

import { createClient } from "@/lib/supabase/client";
import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail]   = useState("");
  const [sent, setSent]     = useState(false);
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
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        <div className="mb-10">
          <p className="text-xs text-zinc-400 uppercase tracking-widest mb-3">Finance Tracker</p>
          <h1 className="text-2xl font-semibold text-zinc-900 tracking-tight">Anmelden</h1>
          <p className="text-sm text-zinc-400 mt-1">Wir schicken dir einen Magic Link.</p>
        </div>

        {sent ? (
          <div className="border border-zinc-100 rounded-xl p-6 bg-zinc-50 text-sm text-zinc-600">
            Mail verschickt — klick auf den Link in deinem Postfach.
          </div>
        ) : (
          <form onSubmit={handleLogin} className="flex flex-col gap-3">
            <input
              type="email"
              placeholder="deine@email.de"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 text-sm border border-zinc-200 rounded-lg outline-none focus:border-zinc-400 transition-colors placeholder:text-zinc-300"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 text-sm font-medium bg-zinc-900 text-white rounded-lg hover:bg-zinc-700 transition-colors disabled:opacity-50"
            >
              {loading ? "Sende..." : "Magic Link senden"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
