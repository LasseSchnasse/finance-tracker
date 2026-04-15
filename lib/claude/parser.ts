import Groq from "groq-sdk";

const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

export interface ParsedTransaction {
  amount: number;         // Negativ = Ausgabe, Positiv = Eingang
  currency: string;       // "EUR", "USD", etc.
  merchant: string | null;
  category: string;       // Name aus den Standard-Kategorien
  confidence: number;     // 0.0 – 1.0
  transacted_at: string | null; // ISO 8601, null wenn nicht erkennbar
}

const SYSTEM_PROMPT = `You are a financial transaction parser for a personal finance app. The user types short expense notes in German or English. Extract structured data and respond ONLY with valid JSON, no explanation.

Input examples (user typed, no fixed format):
- "Rewe 25" → grocery store, -25 EUR
- "Rewe 25€" → grocery store, -25 EUR
- "Alkohol 12" → alcohol purchase, -12 EUR → category "Lebensmittel"
- "Goldpass 8" → subscription/pass, -8 EUR → category "Unterhaltung"
- "Netflix 12,99" → streaming, -12.99 EUR
- "Miete 800" → rent payment, -800 EUR
- "Gehalt 2500" → salary received, +2500 EUR
- "Tankstelle 60€" → fuel, -60 EUR
- "Zahlung 15,50 EUR REWE Sagt Danke" → bank notification format
- Amount formats: "25", "25€", "25,50", "25.50", "EUR 25", "€25"

{
  "amount": <number, NEGATIVE for all purchases/payments/expenses, POSITIVE only for salary/income/received transfers>,
  "currency": <ISO 4217 string, default "EUR">,
  "merchant": <clean readable name, e.g. "REWE", "Netflix", "Alkohol", "Goldpass">,
  "category": <one of the categories below>,
  "confidence": <float 0.0-1.0>,
  "transacted_at": <ISO 8601 datetime if found in text, otherwise null>
}

Categories (use exactly these names):
- "Lebensmittel"   → supermarkets, groceries, alcohol, drinks, tobacco (REWE, Edeka, Lidl, Aldi, Penny, Kaufland, Alkohol, Getränke)
- "Restaurant"     → restaurants, cafes, bars, fast food, food delivery (McDonald's, Starbucks, Lieferando, Kneipe, Bar)
- "Transport"      → fuel, public transport, taxis, parking, car (Aral, Shell, DB, Uber, Tankstelle, Parkhaus, ÖPNV)
- "Shopping"       → clothing, electronics, online shopping (Amazon, Zalando, H&M, MediaMarkt, Ebay)
- "Gesundheit"     → pharmacies, doctors, gym, health (Apotheke, Arzt, Fitnessstudio, Sport)
- "Unterhaltung"   → streaming, cinema, gaming, subscriptions, passes, memberships (Netflix, Spotify, Steam, Kino, Goldpass, Pass, Abo)
- "Wohnen"         → rent, utilities, home insurance, internet (Miete, Strom, Gas, Internet, Telekom, Nebenkosten)
- "Versicherung"   → insurance payments (Versicherung, HUK, Allianz, AOK, KFZ)
- "Einnahmen"      → salary, wages, income, received transfers (Gehalt, Lohn, Gutschrift, Eingang)
- "Sonstiges"      → only if truly nothing else fits

Rules:
- CRITICAL: A plain number after a merchant name is ALWAYS the amount. "Goldpass 8" means amount=-8, merchant="Goldpass"
- CRITICAL: If amount cannot be clearly determined, make your best guess — NEVER return 0 unless the actual value is zero
- All purchases are negative — when in doubt, make it negative
- Merchant names: clean and short (e.g. "REWE" not "REWE SAGT DANKE 1234")
- Always return valid JSON, nothing else`;

export async function parseTransaction(
  rawText: string
): Promise<ParsedTransaction> {
  const completion = await client.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: rawText },
    ],
    max_tokens: 256,
    temperature: 0.1,
  });

  const responseText = completion.choices[0]?.message?.content ?? "";

  // Modell gibt manchmal Markdown-Code-Blöcke zurück — bereinigen
  const jsonText = responseText
    .replace(/```json\n?/g, "")
    .replace(/```\n?/g, "")
    .trim();

  const parsed = JSON.parse(jsonText) as ParsedTransaction;

  if (typeof parsed.amount !== "number") {
    throw new Error("Invalid amount in parsed response");
  }

  return {
    amount: parsed.amount,
    currency: parsed.currency ?? "EUR",
    merchant: parsed.merchant ?? null,
    category: parsed.category ?? "Sonstiges",
    confidence: parsed.confidence ?? 0.5,
    transacted_at: parsed.transacted_at ?? null,
  };
}
