"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

interface Item {
  name: string;
  amount: string;
}

const INCOME_SUGGESTIONS = ["Gehalt", "Kindergeld", "Nebenjob", "Rente", "BAföG"];
const EXPENSE_SUGGESTIONS = ["Miete", "Strom & Gas", "Internet", "Netflix", "Spotify", "FitX"];

export default function OnboardingFlow() {
  const router = useRouter();
  const [step, setStep]       = useState(1);
  const [incomes, setIncomes] = useState<Item[]>([]);
  const [expenses, setExpenses] = useState<Item[]>([]);
  const [name, setName]       = useState("");
  const [amount, setAmount]   = useState("");
  const [loading, setLoading] = useState(false);
  const nameRef   = useRef<HTMLInputElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);

  const items    = step === 1 ? incomes : expenses;
  const setItems = step === 1 ? setIncomes : setExpenses;
  const suggestions = step === 1 ? INCOME_SUGGESTIONS : EXPENSE_SUGGESTIONS;

  function addItem() {
    if (!name.trim() || !amount.trim()) return;
    setItems(prev => [...prev, { name: name.trim(), amount: amount.trim() }]);
    setName("");
    setAmount("");
    nameRef.current?.focus();
  }

  function removeItem(i: number) {
    setItems(prev => prev.filter((_, idx) => idx !== i));
  }

  function fillSuggestion(s: string) {
    setName(s);
    amountRef.current?.focus();
  }

  async function submit(skipAll = false) {
    setLoading(true);
    await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(skipAll ? { incomes: [], expenses: [] } : { incomes, expenses }),
    });
    router.push("/dashboard");
  }

  const fmt = (s: string) => {
    const n = parseFloat(s.replace(",", "."));
    if (isNaN(n)) return s;
    return n.toLocaleString("de-DE", { style: "currency", currency: "EUR", minimumFractionDigits: 2 });
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="mb-8">
          <p className="text-[10px] text-zinc-400 uppercase tracking-widest mb-6">
            Finance · Schritt {step} von 2
          </p>
          <div className="flex gap-1.5 mb-6">
            <div className={`h-0.5 flex-1 rounded-full transition-colors ${step >= 1 ? "bg-zinc-900" : "bg-zinc-100"}`} />
            <div className={`h-0.5 flex-1 rounded-full transition-colors ${step >= 2 ? "bg-zinc-900" : "bg-zinc-100"}`} />
          </div>
          <h1 className="text-2xl font-semibold text-zinc-900 tracking-tight mb-2">
            {step === 1
              ? "Was sind deine monatlichen Einnahmen?"
              : "Was gibst du monatlich aus?"}
          </h1>
          <p className="text-sm text-zinc-400">
            {step === 1
              ? "Gehalt, Kindergeld, Nebenjob — alles was regelmäßig reinkommt."
              : "Miete, Abos, Gym — alles was regelmäßig abgeht."}
          </p>
        </div>

        {/* Suggestions */}
        <div className="flex flex-wrap gap-2 mb-5">
          {suggestions.map(s => (
            <button
              key={s}
              type="button"
              onClick={() => fillSuggestion(s)}
              className="text-xs px-3 py-1.5 rounded-full border border-zinc-200 text-zinc-500 hover:border-zinc-400 hover:text-zinc-700 transition-colors"
            >
              {s}
            </button>
          ))}
        </div>

        {/* Input row */}
        <div className="flex gap-2 mb-4">
          <input
            ref={nameRef}
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter") addItem();
              if (e.key === "Tab" && name.trim()) { e.preventDefault(); amountRef.current?.focus(); }
            }}
            placeholder={step === 1 ? "Einnahme..." : "Ausgabe..."}
            className="flex-1 min-w-0 text-sm border border-zinc-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-zinc-400 placeholder:text-zinc-300 transition-colors"
          />
          <input
            ref={amountRef}
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addItem()}
            placeholder="Betrag"
            className="w-24 text-sm border border-zinc-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-zinc-400 placeholder:text-zinc-300 transition-colors"
          />
          <button
            type="button"
            onClick={addItem}
            disabled={!name.trim() || !amount.trim()}
            className="px-4 py-2.5 text-sm font-medium bg-zinc-900 text-white rounded-lg disabled:opacity-30 hover:bg-zinc-700 transition-colors"
          >
            +
          </button>
        </div>

        {/* Item list */}
        {items.length > 0 && (
          <div className="border border-zinc-100 rounded-lg overflow-hidden mb-8 divide-y divide-zinc-100">
            {items.map((item, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-3">
                <span className="text-sm text-zinc-700">{item.name}</span>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-zinc-900" style={{ fontVariantNumeric: "tabular-nums" }}>
                    {fmt(item.amount)}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeItem(i)}
                    className="text-xs text-zinc-300 hover:text-red-400 transition-colors"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Spacer if no items */}
        {items.length === 0 && <div className="mb-8" />}

        {/* Navigation */}
        <div className="flex items-center justify-between">
          {step === 1 ? (
            <button
              type="button"
              onClick={() => submit(true)}
              disabled={loading}
              className="text-xs text-zinc-300 hover:text-zinc-500 transition-colors disabled:opacity-50"
            >
              Überspringen
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setStep(1)}
              disabled={loading}
              className="text-sm text-zinc-400 hover:text-zinc-700 transition-colors"
            >
              ← Zurück
            </button>
          )}

          {step === 1 ? (
            <button
              type="button"
              onClick={() => setStep(2)}
              className="text-sm font-medium px-6 py-2.5 bg-zinc-900 text-white rounded-lg hover:bg-zinc-700 transition-colors"
            >
              Weiter →
            </button>
          ) : (
            <button
              type="button"
              onClick={() => submit(false)}
              disabled={loading}
              className="text-sm font-medium px-6 py-2.5 bg-zinc-900 text-white rounded-lg hover:bg-zinc-700 transition-colors disabled:opacity-50"
            >
              {loading ? "Wird gespeichert…" : "Fertig →"}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
