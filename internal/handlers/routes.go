package handlers

import (
	"github.com/gofiber/fiber/v2"

	"kasku-backend/internal/middleware"
)

// RegisterRoutes mendaftarkan seluruh rute endpoint API KasKu
func (h *Handler) RegisterRoutes(app *fiber.App, secretToken string) {
	// Health check (publik, tanpa otentikasi)
	app.Get("/healthz", h.Healthz)

	// API Group dengan pengamanan Token Rahasia (single user)
	api := app.Group("/api", middleware.TokenAuth(secretToken))

	// 1. Transaksi
	api.Get("/transactions", h.GetTransactions)
	api.Get("/transactions/:id", h.GetTransactionByID)
	api.Post("/transactions", h.CreateTransaction)
	api.Put("/transactions/:id", h.UpdateTransaction)
	api.Delete("/transactions/:id", h.DeleteTransaction)

	// 2. Dashboard & Ringkasan
	api.Get("/today", h.GetToday)
	api.Get("/summary", h.GetSummary)
	api.Get("/overview", h.GetOverview)

	// 3. Pemasukan & Barang
	api.Get("/income-sources", h.GetIncomeSources)
	api.Get("/items", h.GetItems)

	// 4. Hutang & Belum Dibayar
	api.Get("/debts", h.GetDebts)
	api.Get("/debts/:nama", h.GetDebtsByPerson)
	api.Get("/unpaid", h.GetUnpaid)

	// 5. Langganan
	api.Get("/subscriptions", h.GetSubscriptions)
	api.Post("/subscriptions", h.CreateSubscription)
	api.Put("/subscriptions/:id", h.UpdateSubscription)
	api.Delete("/subscriptions/:id", h.DeleteSubscription)
	api.Post("/subscriptions/:id/pay", h.PaySubscription)

	// 6. Tagihan
	api.Get("/bills", h.GetBills)
	api.Post("/bills", h.CreateBill)
	api.Put("/bills/:id", h.UpdateBill)
	api.Delete("/bills/:id", h.DeleteBill)
	api.Post("/bills/:id/pay", h.PayBill)

	// 7. Pengaturan, Ekspor, dan Meta
	api.Get("/settings/opening-balance", h.GetOpeningBalanceSetting)
	api.Put("/settings/opening-balance", h.UpdateOpeningBalanceSetting)
	api.Get("/export.csv", h.ExportCSV)
	api.Get("/meta", h.GetMeta)
}
