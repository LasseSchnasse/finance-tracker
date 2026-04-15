import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseTransaction } from "@/lib/claude/parser";

interface OnboardingItem {
  name: string;
  amount: string;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const incomes: OnboardingItem[] = body.incomes ?? [];
  const expenses: OnboardingItem[] = body.expenses ?? [];

  const { data: categories } = await supabase
    .from("categories")
    .select("id, name")
    .is("user_id", null);
  const catMap = Object.fromEntries((categories ?? []).map(c => [c.name, c.id]));

  const parseItem = async (item: OnboardingItem, isIncome: boolean) => {
    const rawText = `${item.name} ${item.amount}`;
    const amountVal = parseFloat(item.amount.replace(",", "."));
    if (isNaN(amountVal) || amountVal <= 0) return null;
    try {
      const parsed = await parseTransaction(rawText);
      const category = isIncome ? "Einnahmen" : parsed.category;
      return {
        user_id: user.id,
        amount: isIncome ? Math.abs(amountVal) : -Math.abs(amountVal),
        currency: "EUR",
        merchant: item.name,
        category_id: catMap[category] ?? null,
        raw_text: rawText,
        interval: "monthly",
        day_of_month: 1,
      };
    } catch {
      return {
        user_id: user.id,
        amount: isIncome ? Math.abs(amountVal) : -Math.abs(amountVal),
        currency: "EUR",
        merchant: item.name,
        category_id: catMap[isIncome ? "Einnahmen" : "Sonstiges"] ?? null,
        raw_text: rawText,
        interval: "monthly",
        day_of_month: 1,
      };
    }
  };

  const [parsedIncomes, parsedExpenses] = await Promise.all([
    Promise.all(incomes.map(i => parseItem(i, true))),
    Promise.all(expenses.map(e => parseItem(e, false))),
  ]);

  const allOrders = [...parsedIncomes, ...parsedExpenses].filter(Boolean);
  if (allOrders.length > 0) {
    await supabase.from("standing_orders").insert(allOrders);
  }

  await supabase
    .from("profiles")
    .update({ onboarding_completed: true })
    .eq("id", user.id);

  return NextResponse.json({ success: true });
}
