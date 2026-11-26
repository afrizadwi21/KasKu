-- KasKu Multi-User Auth Migration
-- 003_auth.sql

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Tabel users
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (lower(email));

-- 2. Tabel refresh_tokens
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    user_agent TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens (user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash ON refresh_tokens (token_hash);

-- 3. Tambahkan kolom user_id pada transactions, subscriptions, bills
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- 4. Ubah settings menjadi per pengguna: PRIMARY KEY (user_id, key)
DROP TABLE IF EXISTS settings;
CREATE TABLE IF NOT EXISTS settings (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    PRIMARY KEY (user_id, key)
);

-- 5. Perbarui index yang ada menjadi diawali user_id
DROP INDEX IF EXISTS idx_transactions_date;
DROP INDEX IF EXISTS idx_transactions_category_party;
DROP INDEX IF EXISTS idx_transactions_source;
DROP INDEX IF EXISTS idx_subscriptions_name;
DROP INDEX IF EXISTS idx_bills_due_date;
DROP INDEX IF EXISTS idx_bills_paid;

CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions (user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_user_category_party ON transactions (user_id, category, lower(party));
CREATE INDEX IF NOT EXISTS idx_transactions_user_source ON transactions (user_id, lower(source));
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_name ON subscriptions (user_id, lower(name));
CREATE INDEX IF NOT EXISTS idx_bills_user_due_date ON bills (user_id, due_date ASC);
CREATE INDEX IF NOT EXISTS idx_bills_user_paid ON bills (user_id, paid);
