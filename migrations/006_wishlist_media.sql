-- KasKu Wishlist Media & Link Fetching Migration
-- 006_wishlist_media.sql

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

-- Tambah kolom pada wishlist_items
ALTER TABLE wishlist_items ADD COLUMN IF NOT EXISTS image_id UUID NULL REFERENCES wishlist_images(id) ON DELETE SET NULL;
ALTER TABLE wishlist_items ADD COLUMN IF NOT EXISTS source_site TEXT NOT NULL DEFAULT '';
ALTER TABLE wishlist_items ADD COLUMN IF NOT EXISTS link_resolved TEXT NOT NULL DEFAULT '';
ALTER TABLE wishlist_items ADD COLUMN IF NOT EXISTS price_source TEXT NOT NULL DEFAULT 'manual' CHECK (price_source IN ('manual', 'link'));
