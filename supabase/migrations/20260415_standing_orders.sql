-- Daueraufträge Tabelle
CREATE TABLE IF NOT EXISTS standing_orders (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount        numeric     NOT NULL,
  currency      text        NOT NULL DEFAULT 'EUR',
  merchant      text,
  category_id   uuid        REFERENCES categories(id),
  raw_text      text,
  interval      text        NOT NULL DEFAULT 'monthly', -- 'monthly' | 'weekly' | 'yearly'
  day_of_month  integer,    -- 1–31, nur für monthly relevant
  active        boolean     NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Row Level Security
ALTER TABLE standing_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own standing orders"
  ON standing_orders
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
