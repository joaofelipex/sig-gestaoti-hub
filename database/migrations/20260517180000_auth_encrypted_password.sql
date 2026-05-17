-- Bases criadas antes de 03_api_auth.sql: coluna de palavra-passe em auth.users.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS encrypted_password text;
