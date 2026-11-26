-- KasKu Wishlist Migration
-- 005_wishlist.sql

CREATE TABLE IF NOT EXISTS wishlist_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    price BIGINT NOT NULL CHECK (price > 0),
    priority TEXT NOT NULL CHECK (priority IN ('tinggi', 'sedang', 'rendah')) DEFAULT 'sedang',
    category TEXT NOT NULL DEFAULT 'Belanja',
    link TEXT NOT NULL DEFAULT '',
    note TEXT NOT NULL DEFAULT '',
    target_date DATE NULL,
    status TEXT NOT NULL CHECK (status IN ('aktif', 'dibeli', 'dibatalkan')) DEFAULT 'aktif',
    saving_pot_id UUID NULL REFERENCES savings_pots(id) ON DELETE SET NULL,
    bought_at DATE NULL,
    bought_transaction_id UUID NULL REFERENCES transactions(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wishlist_user_status_priority 
ON wishlist_items (user_id, status, priority);

CREATE INDEX IF NOT EXISTS idx_wishlist_user_target_date 
ON wishlist_items (user_id, target_date ASC);
