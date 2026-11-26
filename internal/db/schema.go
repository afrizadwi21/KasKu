package db

const SchemaInitSQL = `
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

-- 3. Tabel settings (per pengguna)
CREATE TABLE IF NOT EXISTS settings (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    PRIMARY KEY (user_id, key)
);

-- 4. Tabel transactions
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('masuk', 'keluar')),
    category TEXT NOT NULL,
    party TEXT NOT NULL DEFAULT '',
    source TEXT NOT NULL DEFAULT '',
    note TEXT NOT NULL DEFAULT '',
    amount BIGINT NOT NULL CHECK (amount > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions (user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_user_category_party ON transactions (user_id, category, lower(party));
CREATE INDEX IF NOT EXISTS idx_transactions_user_source ON transactions (user_id, lower(source));

-- 5. Tabel transaction_items
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

-- 6. Tabel subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    amount BIGINT NOT NULL CHECK (amount > 0),
    cycle TEXT NOT NULL CHECK (cycle IN ('mingguan', 'bulanan', '3_bulanan', 'tahunan')),
    first_due DATE NOT NULL,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_name ON subscriptions (user_id, lower(name));

-- 7. Tabel bills
CREATE TABLE IF NOT EXISTS bills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    amount BIGINT NOT NULL CHECK (amount > 0),
    due_date DATE NOT NULL,
    paid BOOLEAN NOT NULL DEFAULT false,
    paid_at TIMESTAMPTZ NULL,
    note TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bills_user_due_date ON bills (user_id, due_date ASC);
CREATE INDEX IF NOT EXISTS idx_bills_user_paid ON bills (user_id, paid);

-- 8. Tabel savings_pots
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

CREATE UNIQUE INDEX IF NOT EXISTS idx_savings_pots_user_active_name 
ON savings_pots (user_id, lower(name)) 
WHERE archived = false;

CREATE INDEX IF NOT EXISTS idx_savings_pots_user_id ON savings_pots (user_id);

-- 9. Tabel savings_movements
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

-- 10. Tabel wishlist_images
CREATE TABLE IF NOT EXISTS wishlist_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content_type TEXT NOT NULL DEFAULT 'image/jpeg',
    data BYTEA NOT NULL,
    width INT NOT NULL DEFAULT 0,
    height INT NOT NULL DEFAULT 0,
    size_bytes INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wishlist_images_user_id ON wishlist_images (user_id);

-- 11. Tabel wishlist_items
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
    image_id UUID NULL REFERENCES wishlist_images(id) ON DELETE SET NULL,
    source_site TEXT NOT NULL DEFAULT '',
    link_resolved TEXT NOT NULL DEFAULT '',
    price_source TEXT NOT NULL DEFAULT 'manual' CHECK (price_source IN ('manual', 'link')),
    bought_at DATE NULL,
    bought_transaction_id UUID NULL REFERENCES transactions(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wishlist_user_status_priority 
ON wishlist_items (user_id, status, priority);

ALTER TABLE wishlist_items ADD COLUMN IF NOT EXISTS image_url TEXT NOT NULL DEFAULT '';

`
