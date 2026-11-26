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

export interface UserProfile {
  id: string;
  name: string;
  email: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: UserProfile;
}

export interface SavingsPot {
  id: string;
  name: string;
  target?: number | null;
  saldo: number;
  persen_target?: number;
  sisa_target?: number;
  deadline?: string | null;
  note: string;
  archived: boolean;
  created_at?: string;
}

export interface SavingsMovement {
  id: string;
  pot_id: string;
  pot_name: string;
  type: "setor" | "tarik" | "pakai";
  amount: number;
  date: string;
  note: string;
}

export interface WishlistItem {
  id: string;
  name: string;
  price: number;
  priority: "rendah" | "sedang" | "tinggi";
  category: string;
  link?: string;
  situs?: string;
  foto_url?: string | null;
  image_id?: string | null;
  note: string;
  target_date?: string | null;
  status: "aktif" | "dibeli" | "dibatalkan";
  bisa_dibeli_sekarang?: boolean;
  kurang_berapa?: number;
}
