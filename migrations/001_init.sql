-- KasKu Database Initialization Schema
-- 001_init.sql

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Table: settings
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

-- Insert default opening_balance
INSERT INTO settings (key, value)
VALUES ('opening_balance', '0')
ON CONFLICT (key) DO NOTHING;

-- Table: transactions
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('masuk', 'keluar')),
    category TEXT NOT NULL,
    party TEXT NOT NULL DEFAULT '',
    source TEXT NOT NULL DEFAULT '',
    note TEXT NOT NULL DEFAULT '',
    amount BIGINT NOT NULL CHECK (amount > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for transactions
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions (date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_category_party ON transactions (category, lower(party));
CREATE INDEX IF NOT EXISTS idx_transactions_source ON transactions (lower(source));

-- Table: transaction_items (rincian pembelian)
CREATE TABLE IF NOT EXISTS transaction_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    qty NUMERIC(10,2) NOT NULL DEFAULT 1 CHECK (qty > 0),
    unit_price BIGINT NOT NULL CHECK (unit_price >= 0),
    subtotal BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_transaction_items_transaction_id ON transaction_items (transaction_id);
CREATE INDEX IF NOT EXISTS idx_transaction_items_name ON transaction_items (lower(name));

-- Table: subscriptions (langganan rutin)
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    amount BIGINT NOT NULL CHECK (amount > 0),
    cycle TEXT NOT NULL CHECK (cycle IN ('mingguan', 'bulanan', '3_bulanan', 'tahunan')),
    first_due DATE NOT NULL,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_name ON subscriptions (lower(name));

-- Table: bills (tagihan sekali bayar)
CREATE TABLE IF NOT EXISTS bills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    amount BIGINT NOT NULL CHECK (amount > 0),
    due_date DATE NOT NULL,
    paid BOOLEAN NOT NULL DEFAULT false,
    paid_at TIMESTAMPTZ NULL,
    note TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bills_due_date ON bills (due_date ASC);
CREATE INDEX IF NOT EXISTS idx_bills_paid ON bills (paid);
