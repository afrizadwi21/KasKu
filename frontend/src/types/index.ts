export interface TransactionItem {
  id?: string;
  name: string;
  qty: number;
  unit_price: number;
  subtotal: number;
}

export interface Transaction {
  id: string;
  date: string;
  type: "masuk" | "keluar";
  category: string;
  party: string;
  source: string;
  note: string;
  amount: number;
  saldo_setelah: number;
  jumlah_item: number;
  created_at: string;
  items?: TransactionItem[];
}

export interface DebtSummary {
  nama: string;
  total: number;
  dibayar: number;
  sisa: number;
  persen: number;
  status: "Lunas" | "Dicicil" | "Belum Dibayar";
}

export interface Subscription {
  id: string;
  name: string;
  amount: number;
  cycle: "mingguan" | "bulanan" | "3_bulanan" | "tahunan";
  first_due: string;
  active: boolean;
  jatuh_tempo: string;
  sisa_hari: number;
  telat_hari: number;
  status: "Belum Dibayar" | "Segera Jatuh Tempo" | "Sudah Dibayar";
  terakhir_dibayar?: string;
  total_dibayar: number;
  total_kali_bayar: number;
}

export interface Bill {
  id: string;
  title: string;
  amount: number;
  due_date: string;
  paid: boolean;
  paid_at?: string;
  note: string;
  status: "Sudah Dibayar" | "Belum Dibayar" | "Terlambat";
  telat_hari: number;
}

export interface OverviewData {
  saldo: number;
  piutang_total: number;
  hutang_saya_total: number;
  belum_dibayar_total: number;
  belum_dibayar_jumlah: number;
  kekayaan_bersih: number;
}

export interface TodayData {
  tanggal: string;
  masuk_hari_ini: number;
  keluar_hari_ini: number;
  jumlah_transaksi: number;
  saldo_awal_hari: number;
  saldo_sekarang: number;
  selisih_hari_ini: number;
  pemasukan_per_sumber_hari_ini: { sumber: string; total: number }[];
  transaksi: Transaction[];
}

export interface UnpaidItem {
  jenis: "piutang" | "langganan" | "tagihan" | "hutang_saya";
  nama: string;
  jumlah: number;
  jatuh_tempo: string;
  status: string;
  telat_hari: number;
}
