import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

interface Transaction {
  id: string;
  amount: number;
  currency: string;
  merchant: string | null;
  raw_text: string;
  transacted_at: string;
  categories: { name: string; color: string; icon: string } | null;
}

export default async function DashboardPage() {
  const supabase = await createClient();

  // Auth prüfen
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // Webhook-Secret laden
  const { data: profile } = await supabase
    .from("profiles")
    .select("webhook_secret")
    .eq("id", user.id)
    .single();

  // Transaktionen diesen Monat
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { data: transactions } = await supabase
    .from("transactions")
    .select(`
      id, amount, currency, merchant, raw_text, transacted_at,
      categories ( name, color, icon )
    `)
    .eq("user_id", user.id)
    .gte("transacted_at", startOfMonth.toISOString())
    .order("transacted_at", { ascending: false })
    .returns<Transaction[]>();

  const monthlyTotal = (transactions ?? []).reduce(
    (sum, t) => sum + t.amount,
    0
  );

  const webhookUrl = profile?.webhook_secret
    ? `${process.env.NEXT_PUBLIC_APP_URL ?? "https://deine-app.vercel.app"}/api/webhook/${profile.webhook_secret}`
    : null;

  return (
    <main style={{ minHeight: "100vh", background: "#0f172a", color: "#f8fafc", padding: "2rem", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700 }}>Finance Tracker</h1>
          <span style={{ color: "#64748b", fontSize: "0.875rem" }}>{user.email}</span>
        </div>

        {/* Monatszusammenfassung */}
        <div style={{ background: "#1e293b", borderRadius: "1rem", padding: "1.5rem", marginBottom: "1.5rem" }}>
          <p style={{ color: "#94a3b8", fontSize: "0.875rem", marginBottom: "0.5rem" }}>
            Ausgaben diesen Monat
          </p>
          <p style={{
            fontSize: "2.5rem",
            fontWeight: 700,
            color: monthlyTotal < 0 ? "#ef4444" : "#22c55e"
          }}>
            {monthlyTotal.toLocaleString("de-DE", { style: "currency", currency: "EUR" })}
          </p>
          <p style={{ color: "#64748b", fontSize: "0.875rem", marginTop: "0.25rem" }}>
            {transactions?.length ?? 0} Transaktionen
          </p>
        </div>

        {/* Webhook-URL Box */}
        {webhookUrl && (
          <div style={{ background: "#1e293b", borderRadius: "1rem", padding: "1.5rem", marginBottom: "1.5rem", border: "1px solid #334155" }}>
            <p style={{ color: "#94a3b8", fontSize: "0.875rem", marginBottom: "0.75rem", fontWeight: 600 }}>
              Dein persönlicher Webhook (für iOS Shortcuts / Tasker)
            </p>
            <code style={{
              display: "block",
              background: "#0f172a",
              padding: "0.75rem",
              borderRadius: "0.5rem",
              fontSize: "0.75rem",
              color: "#22c55e",
              wordBreak: "break-all"
            }}>
              {webhookUrl}
            </code>
            <p style={{ color: "#64748b", fontSize: "0.75rem", marginTop: "0.5rem" }}>
              POST-Request mit dem Benachrichtigungstext als Body senden.
            </p>
          </div>
        )}

        {/* Transaktionsliste */}
        <div style={{ background: "#1e293b", borderRadius: "1rem", padding: "1.5rem" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "1rem", color: "#94a3b8" }}>
            Letzte Transaktionen
          </h2>

          {!transactions?.length ? (
            <p style={{ color: "#475569", textAlign: "center", padding: "2rem" }}>
              Noch keine Transaktionen. Sende deinen ersten Webhook!
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {transactions.map((t) => (
                <div
                  key={t.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "0.75rem",
                    background: "#0f172a",
                    borderRadius: "0.5rem",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <span style={{ fontSize: "1.25rem" }}>
                      {t.categories?.icon ?? "💳"}
                    </span>
                    <div>
                      <p style={{ fontWeight: 600, fontSize: "0.875rem" }}>
                        {t.merchant ?? "Unbekannt"}
                      </p>
                      <p style={{ color: "#64748b", fontSize: "0.75rem" }}>
                        {t.categories?.name ?? "Sonstiges"} ·{" "}
                        {new Date(t.transacted_at).toLocaleDateString("de-DE")}
                      </p>
                    </div>
                  </div>
                  <span style={{
                    fontWeight: 700,
                    color: t.amount < 0 ? "#ef4444" : "#22c55e",
                    fontSize: "0.9rem"
                  }}>
                    {t.amount.toLocaleString("de-DE", {
                      style: "currency",
                      currency: t.currency
                    })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
