"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

interface Row {
  name: string;
  amount: string;
}

const EMPTY_ROW: Row = { name: "", amount: "" };

function makeRows(n: number): Row[] {
  return Array.from({ length: n }, () => ({ ...EMPTY_ROW }));
}

export default function OnboardingFlow() {
  const router = useRouter();
  const [step, setStep]         = useState(1);
  const [incomes, setIncomes]   = useState<Row[]>(makeRows(3));
  const [expenses, setExpenses] = useState<Row[]>(makeRows(3));
  const [loading, setLoading]   = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const rows    = step === 1 ? incomes : expenses;
  const setRows = step === 1 ? setIncomes : setExpenses;

  function updateRow(i: number, field: keyof Row, value: string) {
    setRows(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: value } : r));
  }

  function addRow() {
    setRows(prev => [...prev, { ...EMPTY_ROW }]);
    setTimeout(() => {
      const inputs = containerRef.current?.querySelectorAll<HTMLInputElement>("input[data-name]");
      inputs?.[inputs.length - 1]?.focus();
    }, 50);
  }

  function removeRow(i: number) {
    setRows(prev => prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev);
  }

  function validRows(r: Row[]) {
    return r.filter(row => row.name.trim() && row.amount.trim());
  }

  async function submit(skip = false) {
    setLoading(true);
    await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        skip
          ? { incomes: [], expenses: [] }
          : { incomes: validRows(incomes), expenses: validRows(expenses) }
      ),
    });
    router.push("/dashboard");
  }

  function goNext() {
    setStep(2);
    setTimeout(() => {
      containerRef.current?.querySelectorAll<HTMLInputElement>("input[data-name]")[0]?.focus();
    }, 50);
  }

  const filledCount = validRows(rows).length;

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg" ref={containerRef}>

        {/* Header */}
        <div className="mb-8">
          <p className="text-[10px] text-zinc-400 uppercase tracking-widest mb-4">
            Finance · Schritt {step} von 2
          </p>
          <div className="flex gap-1.5 mb-6">
            <div className={`h-0.5 flex-1 rounded-full transition-colors ${step >= 1 ? "bg-zinc-900" : "bg-zinc-100"}`} />
            <div className={`h-0.5 flex-1 rounded-full transition-colors ${step >= 2 ? "bg-zinc-900" : "bg-zinc-100"}`} />
          </div>
          <h1 className="text-2xl font-semibold text-zinc-900 tracking-tight mb-1">
            {step === 1 ? "Was verdienst du monatlich?" : "Was gibst du monatlich aus?"}
          </h1>
          <p className="text-sm text-zinc-400">
            {step === 1
              ? "Trag deine Einnahmen ein — z.B. Gehalt, Kindergeld, Nebenjob."
              : "Trag deine Ausgaben ein — z.B. Miete, Netflix, FitX."}
          </p>
        </div>

        {/* Row inputs */}
        <div className="flex flex-col gap-2 mb-3">
          {/* Column headers */}
          <div className="flex gap-2 px-1">
            <p className="flex-1 text-[10px] text-zinc-400 uppercase tracking-widest">
              {step === 1 ? "Einnahme" : "Ausgabe"}
            </p>
            <p className="w-28 text-[10px] text-zinc-400 uppercase tracking-widest">Betrag / Monat</p>
            <div className="w-6" />
          </div>

          {rows.map((row, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input
                data-name
                type="text"
                value={row.name}
                onChange={e => updateRow(i, "name", e.target.value)}
                onKeyDown={e => e.key === "Enter" && containerRef.current
                  ?.querySelectorAll<HTMLInputElement>("input[data-amount]")[i]?.focus()}
                placeholder={step === 1
                  ? ["Gehalt", "Kindergeld", "Nebenjob"][i] ?? "Weitere Einnahme"
                  : ["Miete", "Netflix", "FitX"][i] ?? "Weitere Ausgabe"}
                className="flex-1 text-sm border border-zinc-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-zinc-400 placeholder:text-zinc-300 transition-colors"
              />
              <input
                data-amount
                type="text"
                inputMode="decimal"
                value={row.amount}
                onChange={e => updateRow(i, "amount", e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter") {
                    const nextName = containerRef.current
                      ?.querySelectorAll<HTMLInputElement>("input[data-name]")[i + 1];
                    if (nextName) nextName.focus();
                    else addRow();
                  }
                }}
                placeholder="0,00 €"
                className="w-28 text-sm border border-zinc-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-zinc-400 placeholder:text-zinc-300 transition-colors text-right"
              />
              <button
                type="button"
                onClick={() => removeRow(i)}
                className="w-6 text-zinc-200 hover:text-zinc-400 transition-colors text-lg leading-none flex-shrink-0"
              >
                ×
              </button>
            </div>
          ))}
        </div>

        {/* Add row */}
        <button
          type="button"
          onClick={addRow}
          className="text-xs text-zinc-400 hover:text-zinc-700 transition-colors mb-8"
        >
          + Zeile hinzufügen
        </button>

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
              onClick={goNext}
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
              {loading
                ? "Wird gespeichert…"
                : filledCount > 0
                  ? `${filledCount} Eintrag${filledCount !== 1 ? "träge" : ""} speichern →`
                  : "Fertig →"}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
