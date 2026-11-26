-- KasKu Seed Data per Pengguna Tertentu
-- 002_seed.sql
-- Gunakan fungsi ini untuk mengisi data simulasi untuk satu akun user tertentu.
-- Contoh eksekusi:
--   SELECT seed_user_data('user@example.com');
-- Atau jalankan skrip ini langsung setelah membuat user via API /auth/register.

CREATE OR REPLACE FUNCTION seed_user_data(target_email TEXT)
RETURNS void AS $$
DECLARE
    v_user_id UUID;
    v_tx_domain_id UUID;
BEGIN
    SELECT id INTO v_user_id FROM users WHERE lower(email) = lower(trim(target_email));
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User dengan email % tidak ditemukan. Buat user terlebih dahulu.', target_email;
    END IF;

    -- Atur opening_balance
    INSERT INTO settings (user_id, key, value)
    VALUES (v_user_id, 'opening_balance', '0')
    ON CONFLICT (user_id, key) DO UPDATE SET value = EXCLUDED.value;

    -- 1. Masuk 99.000 Jual Akun MLBB
    INSERT INTO transactions (user_id, date, type, category, party, source, note, amount, created_at)
    VALUES (v_user_id, '2026-11-26', 'masuk', 'Jual Akun/Barang', '', 'Jual Akun MLBB', 'Jual akun MLBB', 99000, '2026-11-26 08:00:00+07');

    -- 2. Keluar 30.999 Beri Pinjaman Febi
    INSERT INTO transactions (user_id, date, type, category, party, source, note, amount, created_at)
    VALUES (v_user_id, '2026-11-26', 'keluar', 'Beri Pinjaman', 'Febi', '', 'Pinjaman pertama Febi', 30999, '2026-11-26 09:00:00+07');

    -- 3. Keluar 10.000 Beri Pinjaman Febi
    INSERT INTO transactions (user_id, date, type, category, party, source, note, amount, created_at)
    VALUES (v_user_id, '2026-11-26', 'keluar', 'Beri Pinjaman', 'Febi', '', 'Pinjaman kedua Febi', 10000, '2026-11-26 10:00:00+07');

    -- 4. Keluar 4.000 Pengeluaran Lain Bu Inggit
    INSERT INTO transactions (user_id, date, type, category, party, source, note, amount, created_at)
    VALUES (v_user_id, '2026-11-26', 'keluar', 'Pengeluaran Lain', 'Bu Inggit', '', 'Beli cemilan Bu Inggit', 4000, '2026-11-26 11:00:00+07');

    -- 5. Keluar 3.300 Langganan Domain (dengan 1 item)
    INSERT INTO transactions (user_id, date, type, category, party, source, note, amount, created_at)
    VALUES (v_user_id, '2026-11-26', 'keluar', 'Langganan', 'Domain', '', 'Perpanjang Domain', 3300, '2026-11-26 12:00:00+07')
    RETURNING id INTO v_tx_domain_id;

    INSERT INTO transaction_items (transaction_id, name, qty, unit_price, subtotal)
    VALUES (v_tx_domain_id, 'Domain', 1, 3300, 3300);

    -- 6. Masuk 9.652 Terima Bayar Hutang Febi
    INSERT INTO transactions (user_id, date, type, category, party, source, note, amount, created_at)
    VALUES (v_user_id, '2026-11-26', 'masuk', 'Terima Bayar Hutang', 'Febi', 'Febi', 'Cicilan pertama Febi', 9652, '2026-11-26 13:00:00+07');

    -- 7. Masuk 5.000 Terima Bayar Hutang Febi
    INSERT INTO transactions (user_id, date, type, category, party, source, note, amount, created_at)
    VALUES (v_user_id, '2026-11-26', 'masuk', 'Terima Bayar Hutang', 'Febi', 'Febi', 'Cicilan kedua Febi', 5000, '2026-11-26 14:00:00+07');

    -- 8. Langganan Domain Tahunan (First due 2026-11-26)
    INSERT INTO subscriptions (user_id, name, amount, cycle, first_due, active, created_at)
    VALUES (v_user_id, 'Domain', 3300, 'tahunan', '2026-11-26', true, '2026-11-26 07:00:00+07');
END;
$$ LANGUAGE plpgsql;
