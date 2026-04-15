import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
import MonthNav from "./MonthNav";
import SankeyChart from "./SankeyChart";
import AddTransaction from "./AddTransaction";
import StandingOrders from "./StandingOrders";
import TransactionList from "./TransactionList";

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

  // Daueraufträge nur für zukünftige Monate als Prognose einrechnen
  const isFutureMonth = year > now.getFullYear() ||
    (year === now.getFullYear() && month > now.getMonth() + 1);

  const soIncome = isFutureMonth
    ? (standingOrders ?? []).filter(s => s.amount > 0).reduce((sum, s) => {
        let monthly = s.amount;
        if (s.interval === "weekly")  monthly *= 4.33;
        if (s.interval === "yearly")  monthly /= 12;
        return sum + monthly;
      }, 0)
    : 0;
  const totalIn      = txList.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0) + soIncome;
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
  // Daueraufträge nur für zukünftige Monate als Prognose einrechnen
  if (isFutureMonth) {
    for (const so of standingOrders ?? []) {
      if (so.amount >= 0) continue; // Einnahmen-Daueraufträge überspringen
      const name  = so.categories?.name  ?? "Sonstiges";
      const color = so.categories?.color ?? "#9ca3af";
      const icon  = so.categories?.icon  ?? "🔁";
      if (!catMap[name]) catMap[name] = { total: 0, color, icon };
      let monthly = Math.abs(so.amount);
      if (so.interval === "weekly")  monthly *= 4.33;
      if (so.interval === "yearly")  monthly /= 12;
      catMap[name].total += monthly;
    }
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
      <header className="border-b border-zinc-100 px-4 sm:px-8 py-3 sm:py-4 flex items-center justify-between">
        <span className="text-sm font-medium text-zinc-400 tracking-wide uppercase">Finance</span>
        <div className="flex items-center gap-3 sm:gap-6">
          <MonthNav year={year} month={month} />
          <span className="hidden sm:block text-xs text-zinc-300">{user.email}</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-8 py-6 sm:py-12">

        {/* KPI Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-0 mb-8 sm:mb-16">
          <div className="pr-4 sm:pr-8 border-r border-zinc-100">
            <p className="text-[10px] text-zinc-400 uppercase tracking-widest mb-1">Ausgaben</p>
            <p className="text-2xl sm:text-4xl font-semibold tracking-tight text-zinc-900 truncate" style={{ fontVariantNumeric: "tabular-nums" }}>
              {fmt(Math.abs(totalOut))}
            </p>
            <p className="text-[10px] text-zinc-400 mt-1">{txList.filter(t => t.amount < 0).length} Transaktionen</p>
          </div>
          <div className="pl-4 sm:px-8 sm:border-r border-zinc-100">
            <p className="text-[10px] text-zinc-400 uppercase tracking-widest mb-1">Einnahmen</p>
            <p className="text-2xl sm:text-4xl font-semibold tracking-tight text-emerald-600 truncate" style={{ fontVariantNumeric: "tabular-nums" }}>
              {fmt(totalIn)}
            </p>
            <p className="text-[10px] text-zinc-400 mt-1">{txList.filter(t => t.amount > 0).length} Buchungen</p>
          </div>
          <div className="hidden sm:block pl-8">
            <p className="text-xs text-zinc-400 uppercase tracking-widest mb-2">Größte Ausgabe</p>
            <p className="text-4xl font-semibold tracking-tight text-zinc-900" style={{ fontVariantNumeric: "tabular-nums" }}>
              {largestTx ? fmt(Math.abs(largestTx.amount), largestTx.currency) : "—"}
            </p>
            <p className="text-xs text-zinc-400 mt-1">{largestTx?.merchant ?? "—"}</p>
          </div>
        </div>

        {/* Eingabe — auf Mobile ganz oben */}
        <AddTransaction />

        {/* Sankey */}
        {(categoryData.length > 0 || totalIn > 0) && (
          <section className="mb-8 sm:mb-16">
            <h2 className="text-[10px] sm:text-xs text-zinc-400 uppercase tracking-widest mb-4 sm:mb-6">
              {isFutureMonth ? `Prognose ${MONTHS[month - 1]}` : `Verteilung ${MONTHS[month - 1]}`}
            </h2>
            <SankeyChart
              categories={categoryData}
              totalSpending={Math.abs(totalOut)}
              totalIncome={totalIn}
              monthLabel={`${MONTHS[month - 1]} ${year}`}
            />
            <div className="flex flex-wrap gap-x-4 gap-y-2 mt-4">
              {categoryData.map(cat => (
                <div key={cat.name} className="flex items-center gap-1.5">
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

        {/* Transaktionsliste */}
        <section>
          <h2 className="text-[10px] sm:text-xs text-zinc-400 uppercase tracking-widest mb-4">Transaktionen</h2>
          {txList.length === 0 ? (
            <p className="text-sm text-zinc-300 py-12 text-center">
              Keine Transaktionen in {MONTHS[month - 1]}.
            </p>
          ) : (
            <TransactionList transactions={txList} />
          )}
        </section>

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
