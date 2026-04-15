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

export default function StandingOrders({ orders }: { orders: StandingOrder[] }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState<string | null>(null);

  const fmt = (n: number, currency = "EUR") =>
    n.toLocaleString("de-DE", { style: "currency", currency, minimumFractionDigits: 2 });

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
        <span className="text-xs text-zinc-400">
          ≈ {fmt(totalMonthly)} / Monat
        </span>
      </div>

      <div className="divide-y divide-zinc-100">
        {orders.map(o => (
          <div key={o.id} className="flex items-center justify-between py-3.5 group">
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
              <button
                onClick={() => handleDelete(o.id)}
                disabled={deleting === o.id}
                className="text-xs text-zinc-300 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50"
              >
                {deleting === o.id ? "…" : "Löschen"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
