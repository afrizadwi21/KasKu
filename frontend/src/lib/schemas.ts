import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().email("Format email tidak valid"),
  password: z.string().min(1, "Kata sandi wajib diisi"),
});

export const registerSchema = z.object({
  name: z.string().trim().min(1, "Nama lengkap wajib diisi"),
  email: z.string().trim().email("Format email tidak valid"),
  password: z
    .string()
    .min(8, "Kata sandi minimal 8 karakter")
    .regex(/[A-Za-z]/, "Kata sandi wajib mengandung huruf")
    .regex(/[0-9]/, "Kata sandi wajib mengandung angka"),
});

export const transactionSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal tidak valid"),
  type: z.enum(["masuk", "keluar"]),
  category: z.string().trim().min(1, "Kategori wajib dipilih"),
  amount: z.number().positive("Nominal transaksi harus lebih dari 0"),
});

export const debtPaymentSchema = z.object({
  amount: z.number().positive("Nominal pembayaran harus lebih dari 0"),
  note: z.string().trim().optional(),
});

export const subscriptionSchema = z.object({
  name: z.string().trim().min(1, "Nama langganan tidak boleh kosong"),
  amount: z.number().positive("Nominal langganan harus lebih dari 0"),
  cycle: z.enum(["mingguan", "bulanan", "3_bulanan", "tahunan"]),
  first_due: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal jatuh tempo tidak valid"),
});

export const billSchema = z.object({
  title: z.string().trim().min(1, "Nama tagihan tidak boleh kosong"),
  amount: z.number().positive("Nominal tagihan harus lebih dari 0"),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal jatuh tempo tidak valid"),
});

export const savingsPotSchema = z.object({
  name: z.string().trim().min(1, "Nama pos tabungan tidak boleh kosong"),
  target_amount: z.number().positive("Target nominal harus lebih dari 0"),
});

export const savingsMovementSchema = z.object({
  amount: z.number().positive("Nominal mutasi tabungan harus lebih dari 0"),
});

export const wishlistSchema = z.object({
  name: z.string().trim().min(1, "Nama barang wishlist tidak boleh kosong"),
  price: z.number().positive("Harga barang harus lebih dari 0"),
  priority: z.enum(["rendah", "sedang", "tinggi"]),
  link: z
    .string()
    .trim()
    .optional()
    .refine(
      (val) => !val || /^https?:\/\/.+/i.test(val),
      "Link produk harus diawali http:// atau https://"
    ),
});

export const profileNameSchema = z.object({
  name: z.string().trim().min(1, "Nama profil tidak boleh kosong"),
});

export function getZodErrorMessage(err: z.ZodError): string {
  return err.issues[0]?.message || "Data yang dimasukkan tidak valid";
}
