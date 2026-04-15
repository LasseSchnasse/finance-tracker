-- Kategorie-Farben aktualisieren (kräftiger, besser unterscheidbar)
UPDATE categories SET color = '#16a34a', icon = '🛒' WHERE name = 'Lebensmittel'  AND user_id IS NULL;
UPDATE categories SET color = '#f97316', icon = '🍽️' WHERE name = 'Restaurant'    AND user_id IS NULL;
UPDATE categories SET color = '#3b82f6', icon = '🚗' WHERE name = 'Transport'     AND user_id IS NULL;
UPDATE categories SET color = '#a855f7', icon = '🛍️' WHERE name = 'Shopping'      AND user_id IS NULL;
UPDATE categories SET color = '#ec4899', icon = '💊' WHERE name = 'Gesundheit'    AND user_id IS NULL;
UPDATE categories SET color = '#eab308', icon = '🎬' WHERE name = 'Unterhaltung'  AND user_id IS NULL;
UPDATE categories SET color = '#64748b', icon = '🏠' WHERE name = 'Wohnen'        AND user_id IS NULL;
UPDATE categories SET color = '#06b6d4', icon = '🛡️' WHERE name = 'Versicherung'  AND user_id IS NULL;
UPDATE categories SET color = '#22c55e', icon = '💰' WHERE name = 'Einnahmen'     AND user_id IS NULL;
UPDATE categories SET color = '#9ca3af', icon = '📋' WHERE name = 'Sonstiges'     AND user_id IS NULL;
