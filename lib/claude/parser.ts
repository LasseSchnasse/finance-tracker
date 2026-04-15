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

const SYSTEM_PROMPT = `You are a financial transaction parser. Your job is to extract structured data from bank push notification texts.

The notifications can come from any bank (German, Austrian, Swiss, international) in any format and language. Common patterns include:
- German DKB: "Zahlung 15,50 EUR REWE Sagt Danke"
- German Sparkasse: "Kartenzahlung 12,99 EUR Amazon"
- Generic German: "Sie haben 8,50€ bei McDonald's bezahlt"
- English: "Payment of £25.00 at Tesco"
- Amount formats: "15,50 EUR", "15.50€", "EUR 15,50", "€15,50", "-15.50"

Extract the following and respond ONLY with valid JSON, no explanation:

{
  "amount": <number, negative for payments/debits, positive for incoming/credits>,
  "currency": <ISO 4217 string, default "EUR" if unclear>,
  "merchant": <cleaned merchant name or null>,
  "category": <one of the categories below>,
  "confidence": <float 0.0-1.0 reflecting how certain you are>,
  "transacted_at": <ISO 8601 datetime string if date/time found in text, otherwise null>
}

Categories (use exactly these names):
- "Lebensmittel"   → supermarkets, grocery stores (REWE, Edeka, Lidl, Aldi, Penny, Netto, Kaufland, Tegut)
- "Restaurant"     → restaurants, cafes, fast food, delivery (McDonald's, Starbucks, Lieferando, Uber Eats)
- "Transport"      → fuel, public transport, taxis, parking, car sharing (Aral, DB, Uber, ÖPNV, Shell)
- "Shopping"       → clothing, electronics, online shopping (Amazon, Zalando, H&M, MediaMarkt, Otto)
- "Gesundheit"     → pharmacies, doctors, health (Apotheke, DocMorris, Fitnessstudio)
- "Unterhaltung"   → streaming, cinema, gaming, sports (Netflix, Spotify, Steam, Kino)
- "Wohnen"         → rent, utilities, insurance for home (Miete, Strom, Gas, Internet, Telekom)
- "Versicherung"   → insurance payments (Versicherung, HUK, Allianz, AOK)
- "Einnahmen"      → salary, wages, income, transfers received (Gehalt, Lohn, Gutschrift, Überweisung erhalten, Eingang)
- "Sonstiges"      → anything that doesn't fit the above

Rules:
- Always return valid JSON, nothing else
- If amount cannot be determined, return confidence 0.1 and estimate 0
- Merchant names should be clean and human-readable (e.g. "REWE" not "REWE SAGT DANKE 1234")
- For debits/payments, amount must be negative
- For credits/incoming transfers, amount must be positive`;

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
