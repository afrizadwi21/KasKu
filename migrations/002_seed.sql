-- KasKu Database Seed Data
-- 002_seed.sql
-- Semua tanggal: 2026-11-26

-- 1. masuk 99000 "Jual Akun/Barang", source "Jual Akun MLBB", note "Jual akun MLBB"
INSERT INTO transactions (id, date, type, category, party, source, note, amount, created_at)
VALUES (
    '11111111-1111-1111-1111-111111111101',
    '2026-11-26',
    'masuk',
    'Jual Akun/Barang',
    '',
    'Jual Akun MLBB',
    'Jual akun MLBB',
    99000,
    '2026-11-26 08:00:00+07'
);

-- 2. keluar 30999 "Beri Pinjaman" party Febi
INSERT INTO transactions (id, date, type, category, party, source, note, amount, created_at)
VALUES (
    '11111111-1111-1111-1111-111111111102',
    '2026-11-26',
    'keluar',
    'Beri Pinjaman',
    'Febi',
    '',
    'Pinjaman pertama Febi',
    30999,
    '2026-11-26 09:00:00+07'
);

-- 3. keluar 10000 "Beri Pinjaman" party Febi
INSERT INTO transactions (id, date, type, category, party, source, note, amount, created_at)
VALUES (
    '11111111-1111-1111-1111-111111111103',
    '2026-11-26',
    'keluar',
    'Beri Pinjaman',
    'Febi',
    '',
    'Pinjaman kedua Febi',
    10000,
    '2026-11-26 10:00:00+07'
);

-- 4. keluar 4000 "Pengeluaran Lain" party "Bu Inggit"
INSERT INTO transactions (id, date, type, category, party, source, note, amount, created_at)
VALUES (
    '11111111-1111-1111-1111-111111111104',
    '2026-11-26',
    'keluar',
    'Pengeluaran Lain',
    'Bu Inggit',
    '',
    'Beli cemilan Bu Inggit',
    4000,
    '2026-11-26 11:00:00+07'
);

-- 5. keluar 3300 "Langganan" party Domain, dengan 1 item {name "Domain", qty 1, unit_price 3300}
INSERT INTO transactions (id, date, type, category, party, source, note, amount, created_at)
VALUES (
    '11111111-1111-1111-1111-111111111105',
    '2026-11-26',
    'keluar',
    'Langganan',
    'Domain',
    '',
    'Perpanjang Domain',
    3300,
    '2026-11-26 12:00:00+07'
);

INSERT INTO transaction_items (id, transaction_id, name, qty, unit_price, subtotal)
VALUES (
    '22222222-2222-2222-2222-222222222201',
    '11111111-1111-1111-1111-111111111105',
    'Domain',
    1,
    3300,
    3300
);

-- 6. masuk 9652 "Terima Bayar Hutang" party Febi, source Febi
INSERT INTO transactions (id, date, type, category, party, source, note, amount, created_at)
VALUES (
    '11111111-1111-1111-1111-111111111106',
    '2026-11-26',
    'masuk',
    'Terima Bayar Hutang',
    'Febi',
    'Febi',
    'Cicilan pertama Febi',
    9652,
    '2026-11-26 13:00:00+07'
);

-- 7. masuk 5000 "Terima Bayar Hutang" party Febi, source Febi
INSERT INTO transactions (id, date, type, category, party, source, note, amount, created_at)
VALUES (
    '11111111-1111-1111-1111-111111111107',
    '2026-11-26',
    'masuk',
    'Terima Bayar Hutang',
    'Febi',
    'Febi',
    'Cicilan kedua Febi',
    5000,
    '2026-11-26 14:00:00+07'
);

-- 8. langganan Domain, 3300, tahunan, first_due 2026-11-26
INSERT INTO subscriptions (id, name, amount, cycle, first_due, active, created_at)
VALUES (
    '33333333-3333-3333-3333-333333333301',
    'Domain',
    3300,
    'tahunan',
    '2026-11-26',
    true,
    '2026-11-26 07:00:00+07'
);
