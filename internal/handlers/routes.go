package handlers

import (
	"github.com/gofiber/fiber/v2"

	"kasku-backend/internal/middleware"
)

// RegisterRoutes mendaftarkan seluruh rute endpoint API KasKu
func (h *Handler) RegisterRoutes(app *fiber.App) {
	// Header keamanan dasar untuk semua respons
	app.Use(middleware.SecurityHeaders())

	// Health check (publik, tanpa otentikasi)
	app.Get("/healthz", h.Healthz)

	// Auth Group (publik, tanpa otentikasi)
	authGroup := app.Group("/auth")
	authGroup.Post("/register", h.Register)
	authGroup.Post("/login", h.Login)
	authGroup.Post("/refresh", h.RefreshToken)
	authGroup.Post("/logout", h.Logout)

	// API Group dengan pengamanan JWT Access Token
	jwtSecret := ""
	if h.Config != nil {
		jwtSecret = h.Config.JWTSecret
	}
	api := app.Group("/api", middleware.JWTAuth(h.DB, jwtSecret))

	// Akun Pengguna (/api/me)
	api.Get("/me", h.GetMe)
	api.Put("/me", h.UpdateMe)
	api.Put("/me/password", h.ChangePassword)
	api.Delete("/me", h.DeleteMe)
	api.Post("/me/logout-all", h.LogoutAll)

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

	// 7. Tabungan / Pos Tabungan (Savings)
	api.Get("/savings", h.GetSavings)
	api.Post("/savings", h.CreateSavingsPot)
	api.Get("/savings/movements", h.GetSavingsMovements)
	api.Delete("/savings/movements/:id", h.CancelSavingsMovement)
	api.Get("/savings/:id", h.GetSavingsPotByID)
	api.Put("/savings/:id", h.UpdateSavingsPot)
	api.Delete("/savings/:id", h.DeleteSavingsPot)
	api.Post("/savings/:id/deposit", h.DepositSavings)
	api.Post("/savings/:id/withdraw", h.WithdrawSavings)
	api.Post("/savings/:id/spend", h.SpendSavings)
	api.Post("/savings/:id/close", h.CloseSavingsPot)

	// 8. Pengaturan, Ekspor, dan Meta
	api.Get("/settings/opening-balance", h.GetOpeningBalanceSetting)
	api.Put("/settings/opening-balance", h.UpdateOpeningBalanceSetting)
	api.Get("/export.csv", h.ExportCSV)
	api.Get("/export-savings.csv", h.ExportSavingsCSV)
	api.Get("/meta", h.GetMeta)
}
