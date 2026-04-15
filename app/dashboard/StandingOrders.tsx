"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface StandingOrder {
  id: string;
  amount: number;
  currency: string;
  merchant: string | null;
  interval: string;
  day_of_month: number | null;
  categories: { name: string; color: string; icon: string } | null;
}

const INTERVAL_LABEL: Record<string, string> = {
  monthly: "monatlich",
  weekly:  "wöchentlich",
  yearly:  "jährlich",
};

const INTERVALS = ["monthly", "weekly", "yearly"];

interface EditState {
  merchant: string;
  amount: string;
  interval: string;
}

export default function StandingOrders({ orders }: { orders: StandingOrder[] }) {
  const router = useRouter();
  const [deleting, setDeleting]   = useState<string | null>(null);
  const [editing, setEditing]     = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState>({ merchant: "", amount: "", interval: "monthly" });
  const [saving, setSaving]       = useState(false);

  const fmt = (n: number, currency = "EUR") =>
    n.toLocaleString("de-DE", { style: "currency", currency, minimumFractionDigits: 2 });

  function startEdit(o: StandingOrder) {
    setEditing(o.id);
    setEditState({
      merchant: o.merchant ?? "",
      amount:   String(Math.abs(o.amount)),
      interval: o.interval,
    });
  }

  function cancelEdit() {
    setEditing(null);
  }

  async function handleSave(o: StandingOrder) {
    setSaving(true);
    const amount = parseFloat(editState.amount.replace(",", "."));
    await fetch(`/api/standing-orders/${o.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        merchant: editState.merchant || null,
        amount:   o.amount < 0 ? -Math.abs(amount) : Math.abs(amount),
        interval: editState.interval,
      }),
    });
    setSaving(false);
    setEditing(null);
    router.refresh();
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    await fetch(`/api/standing-orders/${id}`, { method: "DELETE" });
    setDeleting(null);
    router.refresh();
  }

  if (orders.length === 0) return null;

  const totalMonthly = orders.reduce((sum, o) => {
    if (o.interval === "monthly") return sum + Math.abs(o.amount);
    if (o.interval === "weekly")  return sum + Math.abs(o.amount) * 4.33;
    if (o.interval === "yearly")  return sum + Math.abs(o.amount) / 12;
    return sum;
  }, 0);

  return (
    <section className="mb-16">
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="text-xs text-zinc-400 uppercase tracking-widest">Daueraufträge</h2>
        <span className="text-xs text-zinc-400">≈ {fmt(totalMonthly)} / Monat</span>
      </div>

      <div className="divide-y divide-zinc-100">
        {orders.map(o => (
          <div key={o.id}>
            {editing === o.id ? (
              /* Inline-Bearbeitungszeile */
              <div className="flex flex-col gap-2 py-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editState.merchant}
                    onChange={e => setEditState(s => ({ ...s, merchant: e.target.value }))}
                    placeholder="Name"
                    className="text-sm border border-zinc-200 rounded-lg px-3 py-2 flex-1 min-w-0 focus:outline-none focus:border-zinc-400"
                  />
                  <input
                    type="text"
                    value={editState.amount}
                    onChange={e => setEditState(s => ({ ...s, amount: e.target.value }))}
                    placeholder="Betrag"
                    className="text-sm border border-zinc-200 rounded-lg px-3 py-2 w-24 focus:outline-none focus:border-zinc-400"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={editState.interval}
                    onChange={e => setEditState(s => ({ ...s, interval: e.target.value }))}
                    className="text-sm border border-zinc-200 rounded-lg px-3 py-2 focus:outline-none focus:border-zinc-400 bg-white flex-1"
                  >
                    {INTERVALS.map(i => (
                      <option key={i} value={i}>{INTERVAL_LABEL[i]}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => handleSave(o)}
                    disabled={saving}
                    className="text-xs font-medium text-emerald-600 hover:text-emerald-700 disabled:opacity-50 px-3 py-2"
                  >
                    {saving ? "…" : "Speichern"}
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="text-xs text-zinc-400 hover:text-zinc-600 px-2 py-2"
                  >
                    Abbrechen
                  </button>
                </div>
              </div>
            ) : (
              /* Normale Zeile */
              <div className="flex items-center justify-between py-3.5 group">
                <div className="flex items-center gap-4">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
                    style={{ background: `${o.categories?.color ?? "#6366f1"}18` }}
                  >
                    {o.categories?.icon ?? "🔁"}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-800 leading-none">
                      {o.merchant ?? "Unbekannt"}
                    </p>
                    <p className="text-xs text-zinc-400 mt-1">
                      {o.categories?.name ?? "Sonstiges"} · {INTERVAL_LABEL[o.interval] ?? o.interval}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <span
                    className="text-sm font-medium w-24 text-right"
                    style={{ fontVariantNumeric: "tabular-nums", color: o.amount < 0 ? "#dc2626" : "#16a34a" }}
                  >
                    {o.amount > 0 ? "+" : ""}{fmt(o.amount, o.currency)}
                  </span>
                  <div className="flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => startEdit(o)}
                      className="text-xs text-zinc-400 hover:text-zinc-700"
                    >
                      Bearbeiten
                    </button>
                    <button
                      onClick={() => handleDelete(o.id)}
                      disabled={deleting === o.id}
                      className="text-xs text-zinc-300 hover:text-red-400 disabled:opacity-50"
                    >
                      {deleting === o.id ? "…" : "Löschen"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
