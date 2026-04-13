# Deployment-Anleitung — Von 0 auf Live in ~20 Minuten

## Schritt 1: Supabase Projekt anlegen (5 min)

1. Gehe zu supabase.com → "New Project"
2. Name: `finance-tracker`, Region: Frankfurt (eu-central-1)
3. Passwort merken → "Create project"
4. Warte bis Projekt bereit ist
5. Gehe zu **SQL Editor** → kopiere den Inhalt von `supabase/schema.sql` → "Run"
6. Gehe zu **Settings > API**:
   - `NEXT_PUBLIC_SUPABASE_URL` → "Project URL"
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → "anon public"
   - `SUPABASE_SERVICE_ROLE_KEY` → "service_role" (GEHEIM — nur server-seitig!)

7. **Auth konfigurieren**: Settings > Auth > Email Auth aktivieren
   - "Confirm email" → je nach Präferenz (für Phase 1 deaktivieren für einfacheres Testen)

## Schritt 2: Anthropic API Key (2 min)

1. console.anthropic.com → API Keys → "Create Key"
2. Key kopieren → `ANTHROPIC_API_KEY`

## Schritt 3: GitHub Repo erstellen (3 min)

```bash
cd C:\Users\lasse\Desktop\FinanceTracker
git init
git add .
git commit -m "Initial commit: AI Finance Tracker MVP"
# Auf github.com neues Repo erstellen (privat!)
git remote add origin https://github.com/DEIN-USERNAME/finance-tracker.git
git push -u origin main
```

## Schritt 4: Vercel Deployment (5 min)

1. vercel.com → "Add New Project" → GitHub Repo auswählen
2. Framework: Next.js (wird automatisch erkannt)
3. **Environment Variables** hinzufügen:
   ```
   NEXT_PUBLIC_SUPABASE_URL      = https://xxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJ...
   SUPABASE_SERVICE_ROLE_KEY     = eyJ...
   ANTHROPIC_API_KEY             = sk-ant-...
   NEXT_PUBLIC_APP_URL           = https://DEIN-PROJEKT.vercel.app
   ```
4. "Deploy" klicken → warte ~2 Minuten

## Schritt 5: Supabase Auth Callback URL (2 min)

1. Supabase → Authentication > URL Configuration
2. "Site URL": `https://DEIN-PROJEKT.vercel.app`
3. "Redirect URLs" hinzufügen: `https://DEIN-PROJEKT.vercel.app/auth/callback`

## Schritt 6: Deinen Webhook-Link herausfinden (2 min)

1. Öffne `https://DEIN-PROJEKT.vercel.app`
2. Logge dich mit deiner E-Mail ein (Magic Link)
3. Im Dashboard siehst du deine persönliche Webhook-URL:
   `https://DEIN-PROJEKT.vercel.app/api/webhook/DEIN-UUID`

## Schritt 7: iOS Kurzbefehl einrichten

### Kurzbefehl erstellen:
1. iOS: Kurzbefehle App → "+" → "Aktion hinzufügen"
2. Suche nach "URL-Inhalt abrufen"
3. Konfiguration:
   - URL: `https://DEIN-PROJEKT.vercel.app/api/webhook/DEIN-UUID`
   - Methode: `POST`
   - Header: `Content-Type: text/plain`
   - Body: `[Kurzbefehl-Variable: Eingabe]`
4. Kurzbefehl als Widget auf den Sperrbildschirm legen

### Automatisierung (der eigentliche Trick):
1. Kurzbefehle → "Automatisierung" → "+" → "App"
2. App: deine Banking-App (z.B. "DKB")
3. Trigger: "Wird geöffnet" oder über Mitteilungen (je nach iOS-Version)
4. Aktion: Mitteilungstext lesen → an Webhook senden

### Alternativ — Manuelle Eingabe als Sofort-Test:
1. Kurzbefehl mit "Text fragen" erstellen
2. Text per POST an Webhook senden
3. Kann sofort zum manuellen Testen verwendet werden

## Testen

```bash
curl -X POST https://DEIN-PROJEKT.vercel.app/api/webhook/DEIN-UUID \
  -H "Content-Type: text/plain" \
  -d "Zahlung 15,50 EUR REWE Sagt Danke"
```

Erwartete Antwort:
```json
{
  "success": true,
  "transaction": {
    "id": "uuid...",
    "amount": -15.50,
    "currency": "EUR",
    "merchant": "REWE",
    "category": "Lebensmittel"
  }
}
```
