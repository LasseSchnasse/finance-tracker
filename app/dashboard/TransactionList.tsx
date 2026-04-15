"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Transaction {
  id: string;
  amount: number;
  currency: string;
  merchant: string | null;
  transacted_at: string;
  categories: { name: string; color: string; icon: string } | null;
}

export default function TransactionList({ transactions }: { transactions: Transaction[] }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState<string | null>(null);

  const fmt = (n: number, currency = "EUR") =>
    n.toLocaleString("de-DE", { style: "currency", currency, minimumFractionDigits: 2 });

  async function handleDelete(id: string) {
    setDeleting(id);
    await fetch(`/api/transactions/${id}`, { method: "DELETE" });
    setDeleting(null);
    router.refresh();
  }

  if (transactions.length === 0) return null;

  return (
    <div className="divide-y divide-zinc-100">
      {transactions.map(t => (
        <div key={t.id} className="flex items-center justify-between py-3.5 group">
          <div className="flex items-center gap-4">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
              style={{ background: `${t.categories?.color ?? "#6366f1"}18` }}
            >
              {t.categories?.icon ?? "💳"}
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-800 leading-none">
                {t.merchant ?? "Unbekannt"}
              </p>
              <p className="text-xs text-zinc-400 mt-1">
                {t.categories?.name ?? "Sonstiges"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-6">
            <span className="hidden sm:block text-xs text-zinc-300">
              {new Date(t.transacted_at).toLocaleDateString("de-DE", { day: "2-digit", month: "short" })}
            </span>
            <span className="sm:hidden text-xs text-zinc-300">
              {new Date(t.transacted_at).toLocaleDateString("de-DE", { day: "2-digit", month: "short" })}
            </span>
            <span
              className="text-sm font-medium w-20 sm:w-24 text-right"
              style={{ fontVariantNumeric: "tabular-nums", color: t.amount < 0 ? "#dc2626" : "#16a34a" }}
            >
              {t.amount > 0 ? "+" : ""}{fmt(t.amount, t.currency)}
            </span>
            <button
              onClick={() => handleDelete(t.id)}
              disabled={deleting === t.id}
              className="text-xs text-zinc-300 hover:text-red-400 active:text-red-400 transition-colors sm:opacity-0 sm:group-hover:opacity-100 disabled:opacity-50"
            >
              {deleting === t.id ? "…" : "✕"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
