-- KasKu Savings Pots Migration
-- 004_savings.sql

-- 1. Tabel savings_pots
CREATE TABLE IF NOT EXISTS savings_pots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    target_amount BIGINT NULL CHECK (target_amount > 0),
    deadline DATE NULL,
    note TEXT NOT NULL DEFAULT '',
    archived BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unik per (user_id, lower(name)) untuk pos yang belum diarsipkan
CREATE UNIQUE INDEX IF NOT EXISTS idx_savings_pots_user_active_name 
ON savings_pots (user_id, lower(name)) 
WHERE archived = false;

CREATE INDEX IF NOT EXISTS idx_savings_pots_user_id ON savings_pots (user_id);

-- 2. Tabel savings_movements
CREATE TABLE IF NOT EXISTS savings_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pot_id UUID NOT NULL REFERENCES savings_pots(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('setor', 'tarik', 'pakai')),
    amount BIGINT NOT NULL CHECK (amount > 0),
    date DATE NOT NULL,
    note TEXT NOT NULL DEFAULT '',
    transaction_id UUID NULL REFERENCES transactions(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_savings_movements_user_pot_date 
ON savings_movements (user_id, pot_id, date);
