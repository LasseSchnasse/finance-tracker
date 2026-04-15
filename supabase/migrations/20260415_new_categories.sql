-- Neue Kategorien hinzufügen: Bildung, Sparen, Sport
INSERT INTO public.categories (user_id, name, color, icon) VALUES
  (null, 'Bildung', '#6366f1', '📚'),
  (null, 'Sparen',  '#0ea5e9', '📈'),
  (null, 'Sport',   '#84cc16', '🏋️')
ON CONFLICT DO NOTHING;
