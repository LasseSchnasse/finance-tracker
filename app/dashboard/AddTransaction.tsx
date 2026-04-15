"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

const INTERVALS = [
  { value: "monthly", label: "Monatlich" },
  { value: "weekly",  label: "Wöchentlich" },
  { value: "yearly",  label: "Jährlich" },
];

export default function AddTransaction() {
  const [text, setText]           = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [interval, setInterval]   = useState("monthly");
  const [loading, setLoading]     = useState(false);
  const [feedback, setFeedback]   = useState<{ ok: boolean; msg: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const fmt = (n: number) =>
    n.toLocaleString("de-DE", { style: "currency", currency: "EUR", minimumFractionDigits: 2 });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || loading) return;

    setLoading(true);
    setFeedback(null);

    const endpoint = isRecurring ? "/api/standing-orders" : "/api/add-transaction";
    const body = isRecurring
      ? { text, interval }
      : { text };

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setFeedback({ ok: false, msg: data.error ?? "Fehler beim Speichern" });
        return;
      }

      const tx = isRecurring ? data.order : data.transaction;
      const intervalLabel = INTERVALS.find(i => i.value === interval)?.label ?? "";

      setFeedback({
        ok: true,
        msg: isRecurring
          ? `${tx.merchant ?? "Dauerauftrag"} · ${fmt(tx.amount)} · ${tx.category} · ${intervalLabel}`
          : `${tx.merchant ?? "Transaktion"} · ${fmt(tx.amount)} · ${tx.category}`,
      });

      setText("");
      router.refresh();
    } catch {
      setFeedback({ ok: false, msg: "Netzwerkfehler" });
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  return (
    <section className="mb-16">
      <h2 className="text-xs text-zinc-400 uppercase tracking-widest mb-4">Transaktion hinzufügen</h2>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder={isRecurring ? "Miete 800 · Netflix 12,99" : "Rewe 25 · Tankstelle 60"}
            disabled={loading}
            className="flex-1 min-w-0 text-sm bg-zinc-50 border border-zinc-200 rounded-lg px-4 py-3 text-zinc-800 placeholder:text-zinc-300 focus:outline-none focus:border-zinc-400 disabled:opacity-50 transition-colors"
          />
          <button
            type="submit"
            disabled={!text.trim() || loading}
            className="text-sm font-medium px-4 py-3 rounded-lg bg-zinc-900 text-white disabled:opacity-30 hover:bg-zinc-700 transition-colors whitespace-nowrap flex-shrink-0"
          >
            {loading ? "…" : "+"}
          </button>
        </div>

        {/* Dauerauftrag Toggle */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setIsRecurring(r => !r)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              isRecurring
                ? "bg-zinc-900 text-white border-zinc-900"
                : "bg-white text-zinc-400 border-zinc-200 hover:border-zinc-400"
            }`}
          >
            Dauerauftrag
          </button>

          {isRecurring && INTERVALS.map(i => (
            <button
              key={i.value}
              type="button"
              onClick={() => setInterval(i.value)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                interval === i.value
                  ? "bg-zinc-100 text-zinc-800 border-zinc-300"
                  : "bg-white text-zinc-400 border-zinc-200 hover:border-zinc-300"
              }`}
            >
              {i.label}
            </button>
          ))}
        </div>
      </form>

      {feedback && (
        <p className={`mt-2 text-xs ${feedback.ok ? "text-emerald-600" : "text-red-500"}`}>
          {feedback.ok ? "✓ " : "✗ "}{feedback.msg}
        </p>
      )}
    </section>
  );
}
