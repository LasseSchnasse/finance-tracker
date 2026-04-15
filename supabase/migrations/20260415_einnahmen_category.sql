-- Einnahmen als globale Kategorie hinzufügen
INSERT INTO categories (name, color, icon, user_id)
VALUES ('Einnahmen', '#16a34a', '💰', NULL)
ON CONFLICT DO NOTHING;
