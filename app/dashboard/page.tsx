import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
import MonthNav from "./MonthNav";
import SankeyChart from "./SankeyChart";
import AddTransaction from "./AddTransaction";
import StandingOrders from "./StandingOrders";

const MONTHS = ["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"];

interface StandingOrder {
  id: string;
  amount: number;
  currency: string;
  merchant: string | null;
  interval: string;
  day_of_month: number | null;
  categories: { name: string; color: string; icon: string } | null;
}

interface Transaction {
  id: string;
  amount: number;
  currency: string;
  merchant: string | null;
  transacted_at: string;
  categories: { name: string; color: string; icon: string } | null;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const params = await searchParams;
  const now = new Date();
  const year  = parseInt(params.year  ?? String(now.getFullYear()));
  const month = parseInt(params.month ?? String(now.getMonth() + 1));

  const startOfMonth = new Date(year, month - 1, 1).toISOString();
  const endOfMonth   = new Date(year, month, 0, 23, 59, 59, 999).toISOString();

  const [{ data: profile }, { data: transactions }, { data: allCategories }, { data: standingOrders }] = await Promise.all([
    supabase.from("profiles").select("webhook_secret").eq("id", user.id).single(),
    supabase
      .from("transactions")
      .select("id, amount, currency, merchant, transacted_at, categories ( name, color, icon )")
      .eq("user_id", user.id)
      .gte("transacted_at", startOfMonth)
      .lte("transacted_at", endOfMonth)
      .order("transacted_at", { ascending: false })
      .returns<Transaction[]>(),
    supabase.from("categories").select("name, color, icon").is("user_id", null),
    supabase
      .from("standing_orders")
      .select("id, amount, currency, merchant, interval, day_of_month, categories ( name, color, icon )")
      .eq("user_id", user.id)
      .eq("active", true)
      .order("created_at", { ascending: false })
      .returns<StandingOrder[]>(),
  ]);

  const txList       = transactions ?? [];
  const totalOut     = txList.filter(t => t.amount < 0).reduce((s, t) => s + t.amount, 0);
  const totalIn      = txList.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const largestTx    = txList.filter(t => t.amount < 0).sort((a, b) => a.amount - b.amount)[0] ?? null;

  // Kategorie-Aggregation für Sankey
  const catMap: Record<string, { total: number; color: string; icon: string }> = {};
  for (const cat of allCategories ?? []) {
    catMap[cat.name] = { total: 0, color: cat.color, icon: cat.icon };
  }
  for (const tx of txList.filter(t => t.amount < 0)) {
    const name  = tx.categories?.name  ?? "Sonstiges";
    const color = tx.categories?.color ?? "#9ca3af";
    const icon  = tx.categories?.icon  ?? "📋";
    if (!catMap[name]) catMap[name] = { total: 0, color, icon };
    catMap[name].total += Math.abs(tx.amount);
  }
  const categoryData = Object.entries(catMap)
    .map(([name, d]) => ({ name, ...d }))
    .filter(c => c.total > 0)
    .sort((a, b) => b.total - a.total);

  const webhookUrl = profile?.webhook_secret
    ? `${process.env.NEXT_PUBLIC_APP_URL ?? "https://finance-tracker-weld-seven.vercel.app"}/api/webhook/${profile.webhook_secret}`
    : null;

  const fmt = (n: number, currency = "EUR") =>
    n.toLocaleString("de-DE", { style: "currency", currency, minimumFractionDigits: 2 });

  return (
    <div className="min-h-screen bg-white">

      {/* Top bar */}
      <header className="border-b border-zinc-100 px-8 py-4 flex items-center justify-between">
        <span className="text-sm font-medium text-zinc-400 tracking-wide uppercase">Finance Tracker</span>
        <div className="flex items-center gap-6">
          <MonthNav year={year} month={month} />
          <span className="text-xs text-zinc-300">{user.email}</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-8 py-12">

        {/* KPI Row — kein Card, nur Zahlen */}
        <div className="grid grid-cols-3 gap-0 mb-16">
          <div className="pr-8 border-r border-zinc-100">
            <p className="text-xs text-zinc-400 uppercase tracking-widest mb-2">Ausgaben</p>
            <p className="text-4xl font-semibold tracking-tight text-zinc-900" style={{ fontVariantNumeric: "tabular-nums" }}>
              {fmt(Math.abs(totalOut))}
            </p>
            <p className="text-xs text-zinc-400 mt-1">{txList.filter(t => t.amount < 0).length} Transaktionen</p>
          </div>
          <div className="px-8 border-r border-zinc-100">
            <p className="text-xs text-zinc-400 uppercase tracking-widest mb-2">Einnahmen</p>
            <p className="text-4xl font-semibold tracking-tight text-emerald-600" style={{ fontVariantNumeric: "tabular-nums" }}>
              {fmt(totalIn)}
            </p>
            <p className="text-xs text-zinc-400 mt-1">{txList.filter(t => t.amount > 0).length} Buchungen</p>
          </div>
          <div className="pl-8">
            <p className="text-xs text-zinc-400 uppercase tracking-widest mb-2">Größte Ausgabe</p>
            <p className="text-4xl font-semibold tracking-tight text-zinc-900" style={{ fontVariantNumeric: "tabular-nums" }}>
              {largestTx ? fmt(Math.abs(largestTx.amount), largestTx.currency) : "—"}
            </p>
            <p className="text-xs text-zinc-400 mt-1">{largestTx?.merchant ?? "—"}</p>
          </div>
        </div>

        {/* Sankey */}
        {(categoryData.length > 0 || totalIn > 0) && (
          <section className="mb-16">
            <h2 className="text-xs text-zinc-400 uppercase tracking-widest mb-6">
              Verteilung {MONTHS[month - 1]}
            </h2>
            <SankeyChart
              categories={categoryData}
              totalSpending={Math.abs(totalOut)}
              totalIncome={totalIn}
              monthLabel={`${MONTHS[month - 1]} ${year}`}
            />
            {/* Legende */}
            <div className="flex flex-wrap gap-x-6 gap-y-2 mt-5">
              {categoryData.map(cat => (
                <div key={cat.name} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: cat.color }} />
                  <span className="text-xs text-zinc-500">{cat.name}</span>
                  <span className="text-xs font-medium text-zinc-700">{fmt(cat.total)}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Daueraufträge */}
        <StandingOrders orders={standingOrders ?? []} />

        {/* Eingabe */}
        <AddTransaction />

        {/* Transaktionsliste */}
        <section>
          <h2 className="text-xs text-zinc-400 uppercase tracking-widest mb-4">Transaktionen</h2>

          {txList.length === 0 ? (
            <p className="text-sm text-zinc-300 py-12 text-center">
              Keine Transaktionen in {MONTHS[month - 1]}.
            </p>
          ) : (
            <div className="divide-y divide-zinc-100">
              {txList.map(t => (
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
                  <div className="flex items-center gap-8">
                    <span className="text-xs text-zinc-300">
                      {new Date(t.transacted_at).toLocaleDateString("de-DE", { day: "2-digit", month: "short" })}
                    </span>
                    <span
                      className="text-sm font-medium w-24 text-right"
                      style={{ fontVariantNumeric: "tabular-nums", color: t.amount < 0 ? "#dc2626" : "#16a34a" }}
                    >
                      {t.amount > 0 ? "+" : ""}{fmt(t.amount, t.currency)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Webhook — dezent am Seitenende */}
        {webhookUrl && (
          <div className="mt-16 pt-8 border-t border-zinc-100">
            <p className="text-xs text-zinc-400 uppercase tracking-widest mb-2">Webhook URL</p>
            <code className="text-xs text-zinc-400 break-all">{webhookUrl}</code>
          </div>
        )}

      </main>
    </div>
  );
}
