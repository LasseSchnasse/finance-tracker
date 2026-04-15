import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseTransaction } from "@/lib/claude/parser";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("standing_orders")
    .select("id, amount, currency, merchant, interval, day_of_month, active, categories ( name, color, icon )")
    .eq("user_id", user.id)
    .eq("active", true)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ standing_orders: data });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const rawText: string = (body.text ?? "").trim();
  const interval: string = body.interval ?? "monthly";

  if (!rawText) return NextResponse.json({ error: "Empty text" }, { status: 400 });

  let parsed;
  try {
    parsed = await parseTransaction(rawText);
  } catch {
    return NextResponse.json({ error: "Parsing failed" }, { status: 500 });
  }

  const { data: category } = await supabase
    .from("categories")
    .select("id")
    .eq("name", parsed.category)
    .is("user_id", null)
    .single();

  const { data: order, error: insertError } = await supabase
    .from("standing_orders")
    .insert({
      user_id: user.id,
      amount: parsed.amount,
      currency: parsed.currency,
      merchant: parsed.merchant,
      category_id: category?.id ?? null,
      raw_text: rawText,
      interval,
      day_of_month: interval === "monthly" ? (body.day_of_month ?? 1) : null,
    })
    .select()
    .single();

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

  return NextResponse.json(
    { success: true, order: { id: order.id, merchant: parsed.merchant, amount: parsed.amount, category: parsed.category, interval } },
    { status: 201 }
  );
}
