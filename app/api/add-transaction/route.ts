import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseTransaction } from "@/lib/claude/parser";

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const rawText: string = (body.text ?? "").trim();

  if (!rawText) {
    return NextResponse.json({ error: "Empty text" }, { status: 400 });
  }

  let parsed;
  try {
    parsed = await parseTransaction(rawText);
  } catch (err) {
    console.error("Parsing failed:", err);
    return NextResponse.json({ error: "Parsing failed" }, { status: 500 });
  }

  const { data: category } = await supabase
    .from("categories")
    .select("id")
    .eq("name", parsed.category)
    .is("user_id", null)
    .single();

  const { data: transaction, error: insertError } = await supabase
    .from("transactions")
    .insert({
      user_id: user.id,
      amount: parsed.amount,
      currency: parsed.currency,
      merchant: parsed.merchant,
      category_id: category?.id ?? null,
      raw_text: rawText,
      ai_confidence: parsed.confidence,
      transacted_at: parsed.transacted_at ?? new Date().toISOString(),
    })
    .select()
    .single();

  if (insertError) {
    console.error("DB insert failed:", insertError);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  return NextResponse.json(
    {
      success: true,
      transaction: {
        id: transaction.id,
        amount: transaction.amount,
        merchant: transaction.merchant,
        category: parsed.category,
      },
    },
    { status: 201 }
  );
}
