import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { parseTransaction } from "@/lib/claude/parser";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  // 1. Webhook-Token gegen Datenbank prüfen → User-ID ermitteln
  const supabase = createServiceClient();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .eq("webhook_secret", token)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  const userId = profile.id;

  // 2. Request-Body lesen
  let rawText: string;

  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const body = await request.json();
    rawText = body.text ?? body.message ?? body.notification ?? "";
  } else {
    // iOS Shortcuts sendet oft plain text
    rawText = await request.text();
  }

  if (!rawText || rawText.trim().length === 0) {
    return NextResponse.json({ error: "Empty text" }, { status: 400 });
  }

  rawText = rawText.trim();

  // 3. Claude parst den Text
  let parsed;
  try {
    parsed = await parseTransaction(rawText);
  } catch (err) {
    console.error("Claude parsing failed:", err);
    return NextResponse.json({ error: "Parsing failed" }, { status: 500 });
  }

  // 4. Kategorie-ID aus der DB ermitteln (globale Kategorien)
  const { data: category } = await supabase
    .from("categories")
    .select("id")
    .eq("name", parsed.category)
    .is("user_id", null)
    .single();

  // 5. Transaktion speichern
  const { data: transaction, error: insertError } = await supabase
    .from("transactions")
    .insert({
      user_id: userId,
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
        currency: transaction.currency,
        merchant: transaction.merchant,
        category: parsed.category,
      },
    },
    { status: 201 }
  );
}

// iOS Shortcuts testet manchmal mit GET
export async function GET() {
  return NextResponse.json({ status: "Webhook endpoint active" });
}
