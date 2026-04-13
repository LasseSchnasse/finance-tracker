import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import MonthNav from "./MonthNav";
import SankeyChart from "./SankeyChart";

const MONTHS = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
];

interface Transaction {
  id: string;
  amount: number;
  currency: string;
  merchant: string | null;
  transacted_at: string;
  categories: { name: string; color: string; icon: string } | null;
}

interface SearchParams {
  year?: string;
  month?: string;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const params = await searchParams;
  const now = new Date();
  const year = parseInt(params.year ?? String(now.getFullYear()));
  const month = parseInt(params.month ?? String(now.getMonth() + 1));

  const startOfMonth = new Date(year, month - 1, 1).toISOString();
  const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999).toISOString();

  const { data: profile } = await supabase
    .from("profiles")
    .select("webhook_secret")
    .eq("id", user.id)
    .single();

  const { data: transactions } = await supabase
    .from("transactions")
    .select(`id, amount, currency, merchant, transacted_at, categories ( name, color, icon )`)
    .eq("user_id", user.id)
    .gte("transacted_at", startOfMonth)
    .lte("transacted_at", endOfMonth)
    .order("transacted_at", { ascending: false })
    .returns<Transaction[]>();

  const { data: allCategories } = await supabase
    .from("categories")
    .select("name, color, icon")
    .is("user_id", null);

  const txList = transactions ?? [];
  const totalSpending = txList.filter((t) => t.amount < 0).reduce((s, t) => s + t.amount, 0);
  const totalIncome = txList.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const largestTx = txList.reduce((max, t) => Math.abs(t.amount) > Math.abs(max?.amount ?? 0) ? t : max, txList[0] ?? null);

  // Aggregiere nach Kategorie für Sankey
  const categoryMap: Record<string, { total: number; color: string; icon: string }> = {};
  for (const tx of txList.filter((t) => t.amount < 0)) {
    const cat = tx.categories?.name ?? "Sonstiges";
    const color = tx.categories?.color ?? "#9ca3af";
    const icon = tx.categories?.icon ?? "📋";
    if (!categoryMap[cat]) categoryMap[cat] = { total: 0, color, icon };
    categoryMap[cat].total += Math.abs(tx.amount);
  }

  // Fehlende Kategorien aus allCategories ergänzen
  for (const cat of allCategories ?? []) {
    if (!categoryMap[cat.name]) {
      categoryMap[cat.name] = { total: 0, color: cat.color, icon: cat.icon };
    }
  }

  const categoryData = Object.entries(categoryMap)
    .map(([name, data]) => ({ name, ...data }))
    .filter((c) => c.total > 0)
    .sort((a, b) => b.total - a.total);

  const webhookUrl = profile?.webhook_secret
    ? `${process.env.NEXT_PUBLIC_APP_URL ?? "https://finance-tracker-weld-seven.vercel.app"}/api/webhook/${profile.webhook_secret}`
    : null;

  const monthLabel = `${MONTHS[month - 1]} ${year}`;

  return (
    <main style={{ minHeight: "100vh", background: "#0a0a0f", color: "#e2e8f0", fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* Sidebar / Topbar */}
      <div style={{ borderBottom: "1px solid #1e1e2e", padding: "1rem 2rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div style={{ width: "32px", height: "32px", background: "linear-gradient(135deg, #6366f1, #8b5cf6)", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem" }}>
            💳
          </div>
          <span style={{ fontWeight: 700, fontSize: "1rem", letterSpacing: "-0.02em" }}>Finance Tracker</span>
        </div>
        <span style={{ color: "#475569", fontSize: "0.8rem" }}>{user.email}</span>
      </div>

      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "2rem" }}>

        {/* Header + Monatsnavigation */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
          <div>
            <h1 style={{ fontSize: "1.75rem", fontWeight: 700, letterSpacing: "-0.03em", margin: 0 }}>Übersicht</h1>
            <p style={{ color: "#475569", fontSize: "0.875rem", margin: "0.25rem 0 0" }}>{txList.length} Transaktionen</p>
          </div>
          <MonthNav year={year} month={month} />
        </div>

        {/* KPI Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
          <div style={cardStyle}>
            <p style={labelStyle}>Ausgaben</p>
            <p style={{ ...valueStyle, color: "#f43f5e" }}>
              {totalSpending.toLocaleString("de-DE", { style: "currency", currency: "EUR" })}
            </p>
          </div>
          <div style={cardStyle}>
            <p style={labelStyle}>Einnahmen</p>
            <p style={{ ...valueStyle, color: "#22d3ee" }}>
              {totalIncome.toLocaleString("de-DE", { style: "currency", currency: "EUR" })}
            </p>
          </div>
          <div style={cardStyle}>
            <p style={labelStyle}>Größte Ausgabe</p>
            <p style={{ ...valueStyle, color: "#e2e8f0" }}>
              {largestTx
                ? Math.abs(largestTx.amount).toLocaleString("de-DE", { style: "currency", currency: largestTx.currency })
                : "—"}
            </p>
            {largestTx?.merchant && (
              <p style={{ color: "#475569", fontSize: "0.75rem", marginTop: "0.25rem" }}>{largestTx.merchant}</p>
            )}
          </div>
        </div>

        {/* Sankey */}
        <div style={{ ...cardStyle, marginBottom: "1.5rem", padding: "1.5rem" }}>
          <p style={{ ...labelStyle, marginBottom: "1.25rem" }}>Ausgaben nach Kategorie</p>
          <SankeyChart
            categories={categoryData}
            totalSpending={Math.abs(totalSpending)}
            monthLabel={monthLabel}
          />
        </div>

        {/* Kategorien-Legende */}
        {categoryData.length > 0 && (
          <div style={{ ...cardStyle, marginBottom: "1.5rem", padding: "1.25rem" }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
              {categoryData.map((cat) => (
                <div key={cat.name} style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "#1e1e2e", padding: "0.4rem 0.75rem", borderRadius: "999px" }}>
                  <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: cat.color }} />
                  <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>{cat.icon} {cat.name}</span>
                  <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "#e2e8f0" }}>
                    {cat.total.toLocaleString("de-DE", { style: "currency", currency: "EUR" })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Transaktionsliste */}
        <div style={cardStyle}>
          <p style={{ ...labelStyle, marginBottom: "1rem", padding: "0 0.25rem" }}>Transaktionen</p>
          {txList.length === 0 ? (
            <p style={{ color: "#334155", textAlign: "center", padding: "3rem", fontSize: "0.875rem" }}>
              Keine Transaktionen in diesem Monat.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {txList.map((t) => (
                <div key={t.id} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "0.875rem 1rem", background: "#0f0f17", borderRadius: "10px",
                  border: "1px solid #1a1a2a",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.875rem" }}>
                    <div style={{
                      width: "38px", height: "38px", borderRadius: "10px",
                      background: `${t.categories?.color ?? "#6366f1"}22`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "1.1rem", flexShrink: 0,
                    }}>
                      {t.categories?.icon ?? "💳"}
                    </div>
                    <div>
                      <p style={{ fontWeight: 600, fontSize: "0.875rem", margin: 0 }}>
                        {t.merchant ?? "Unbekannt"}
                      </p>
                      <p style={{ color: "#475569", fontSize: "0.75rem", margin: "0.15rem 0 0" }}>
                        {t.categories?.name ?? "Sonstiges"} · {new Date(t.transacted_at).toLocaleDateString("de-DE", { day: "2-digit", month: "short" })}
                      </p>
                    </div>
                  </div>
                  <span style={{ fontWeight: 700, fontSize: "0.95rem", color: t.amount < 0 ? "#f43f5e" : "#22d3ee" }}>
                    {t.amount > 0 ? "+" : ""}
                    {t.amount.toLocaleString("de-DE", { style: "currency", currency: t.currency })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Webhook URL */}
        {webhookUrl && (
          <div style={{ marginTop: "1.5rem", padding: "1rem 1.25rem", background: "#0f0f17", border: "1px solid #1e1e2e", borderRadius: "12px" }}>
            <p style={{ color: "#334155", fontSize: "0.75rem", marginBottom: "0.5rem", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>
              Webhook URL
            </p>
            <code style={{ fontSize: "0.72rem", color: "#6366f1", wordBreak: "break-all" }}>
              {webhookUrl}
            </code>
          </div>
        )}

      </div>
    </main>
  );
}

const cardStyle: React.CSSProperties = {
  background: "#13131a",
  border: "1px solid #1e1e2e",
  borderRadius: "14px",
  padding: "1.25rem",
};

const labelStyle: React.CSSProperties = {
  color: "#475569",
  fontSize: "0.75rem",
  fontWeight: 600,
  letterSpacing: "0.05em",
  textTransform: "uppercase",
  margin: 0,
};

const valueStyle: React.CSSProperties = {
  fontSize: "1.75rem",
  fontWeight: 700,
  letterSpacing: "-0.03em",
  margin: "0.375rem 0 0",
};
