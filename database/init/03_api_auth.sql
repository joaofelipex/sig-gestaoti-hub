-- Palavras-passe da API (Express) — bcrypt via pgcrypto (compatível com verificação no Node).
CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS encrypted_password text;

UPDATE auth.users
SET encrypted_password = crypt('demo123456', gen_salt('bf'))
WHERE id = '11111111-1111-1111-1111-111111111111'
  AND (encrypted_password IS NULL OR encrypted_password = '');
