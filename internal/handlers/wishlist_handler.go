package handlers

import (
	"context"
	"database/sql"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	"kasku-backend/internal/calc"
	"kasku-backend/internal/media"
	"kasku-backend/internal/middleware"
)

// WishlistItemResponse model respons data wishlist
type WishlistItemResponse struct {
	ID                   string   `json:"id"`
	Name                 string   `json:"name"`
	Price                int64    `json:"price"`
	Priority             string   `json:"priority"`
	Category             string   `json:"category"`
	Link                 string   `json:"link"`
	LinkAkhir            string   `json:"link_akhir"`
	Situs                string   `json:"situs"`
	PriceSource          string   `json:"price_source"`
	ImageID              *string  `json:"image_id"`
	FotoURL              *string  `json:"foto_url"`
	FotoThumbURL         *string  `json:"foto_thumb_url"`
	Note                 string   `json:"note"`
	TargetDate           *string  `json:"target_date"`
	SisaHari             *int     `json:"sisa_hari"`
	Status               string   `json:"status"`
	SavingPotID          *string  `json:"saving_pot_id"`
	SavingPotName        *string  `json:"saving_pot_name,omitempty"`
	SaldoPos             *int64   `json:"saldo_pos,omitempty"`
	PersenTerkumpul      *float64 `json:"persen_terkumpul,omitempty"`
	BisaDibeliSekarang   bool     `json:"bisa_dibeli_sekarang"`
	KurangBerapa         int64    `json:"kurang_berapa"`
	SaldoBebasJikaDibeli int64    `json:"saldo_bebas_jika_dibeli"`
	BoughtAt             *string  `json:"bought_at"`
	BoughtTransactionID  *string  `json:"bought_transaction_id"`
	CreatedAt            string   `json:"created_at"`
}

// Helper untuk menghitung total kewajiban jatuh tempo dalam 7 hari ke depan
func (h *Handler) GetTagihanJatuhTempo7Hari(ctx context.Context, userID string, refDate time.Time) (int64, error) {
	sevenDaysLater := refDate.AddDate(0, 0, 7)
	sevenDaysLaterStr := sevenDaysLater.Format("2006-01-02")
	refDateStr := refDate.Format("2006-01-02")

	// 1. Tagihan belum dibayar dengan due_date <= 7 hari ke depan
	var tagihanTotal int64
	err := h.DB.QueryRowContext(ctx, `
		SELECT COALESCE(SUM(amount), 0)
		FROM bills
		WHERE user_id = $1 AND paid = false AND due_date <= $2
	`, userID, sevenDaysLaterStr).Scan(&tagihanTotal)
	if err != nil {
		return 0, err
	}

	// 2. Langganan aktif yang jatuh tempo <= 7 hari ke depan
	subRows, err := h.DB.QueryContext(ctx, `
		SELECT name, amount, cycle, first_due
		FROM subscriptions
		WHERE user_id = $1 AND active = true
	`, userID)
	if err != nil {
		return tagihanTotal, nil
	}
	defer subRows.Close()

	var subTotal int64
	for subRows.Next() {
		var name, cycle string
		var amount int64
		var firstDue time.Time
		if err := subRows.Scan(&name, &amount, &cycle, &firstDue); err == nil {
			var paidCount int
			_ = h.DB.QueryRowContext(ctx, `
				SELECT COUNT(*) FROM transactions
				WHERE user_id = $1 AND type = 'keluar' AND category = 'Langganan' AND LOWER(TRIM(party)) = LOWER(TRIM($2))
			`, userID, name).Scan(&paidCount)

			stat := calc.CalculateSubscriptionStatus(firstDue, cycle, paidCount, refDate)
			if stat.Status == "Belum Dibayar" || stat.Status == "Segera Jatuh Tempo" {
				jtStr := stat.JatuhTempo.Format("2006-01-02")
				if jtStr <= sevenDaysLaterStr || jtStr < refDateStr {
					subTotal += amount
				}
			}
		}
	}

	return tagihanTotal + subTotal, nil
}

// GET /api/wishlist?status=aktif|dibeli|dibatalkan
func (h *Handler) GetWishlist(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	statusFilter := c.Query("status")
	ctx := context.Background()

	var conditions []string
	args := []any{userID}
	argIdx := 2

	if statusFilter != "" {
		if statusFilter != "aktif" && statusFilter != "dibeli" && statusFilter != "dibatalkan" {
			return ErrorResponse(c, fiber.StatusUnprocessableEntity, "Status filter harus aktif, dibeli, atau dibatalkan")
		}
		conditions = append(conditions, fmt.Sprintf("w.status = $%d", argIdx))
		args = append(args, statusFilter)
		argIdx++
	}

	whereClause := ""
	if len(conditions) > 0 {
		whereClause = "AND " + strings.Join(conditions, " AND ")
	}

	// Ambil saldo bebas user
	_, _, saldoBebas, err := h.GetBalances(ctx, nil, userID)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal menghitung saldo: "+err.Error())
	}

	query := fmt.Sprintf(`
		SELECT 
			w.id, w.name, w.price, w.priority, w.category, w.link, w.link_resolved, w.source_site, w.price_source,
			w.image_id, COALESCE(w.image_url, ''), w.note, w.target_date, 
			w.status, w.saving_pot_id, sp.name AS saving_pot_name,
			COALESCE(
				(SELECT SUM(CASE WHEN sm.type = 'setor' THEN sm.amount ELSE -sm.amount END)
				 FROM savings_movements sm WHERE sm.pot_id = w.saving_pot_id), 0
			) AS saldo_pos,
			w.bought_at, w.bought_transaction_id, w.created_at
		FROM wishlist_items w
		LEFT JOIN savings_pots sp ON w.saving_pot_id = sp.id
		WHERE w.user_id = $1 %s
		ORDER BY 
			CASE w.priority WHEN 'tinggi' THEN 1 WHEN 'sedang' THEN 2 WHEN 'rendah' THEN 3 ELSE 4 END ASC,
			w.target_date ASC NULLS LAST,
			w.created_at DESC
	`, whereClause)

	rows, err := h.DB.QueryContext(ctx, query, args...)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal mengambil daftar wishlist: "+err.Error())
	}
	defer rows.Close()

	now := time.Now()
	items := make([]WishlistItemResponse, 0)
	var totalHargaAktif int64
	var jumlahAktif int
	var jumlahBisaDibeliSekarang int

	baseURL := c.BaseURL()
	jwtSecret := ""
	if h.Config != nil {
		jwtSecret = h.Config.JWTSecret
	}

	for rows.Next() {
		var it WishlistItemResponse
		var targetDate, boughtAt sql.NullTime
		var savingPotID, savingPotName, boughtTxID, imageID sql.NullString
		var fallbackImageURL string
		var saldoPos sql.NullInt64
		var createdAt time.Time

		err := rows.Scan(
			&it.ID, &it.Name, &it.Price, &it.Priority, &it.Category, &it.Link, &it.LinkAkhir, &it.Situs, &it.PriceSource,
			&imageID, &fallbackImageURL, &it.Note, &targetDate, &it.Status, &savingPotID, &savingPotName, &saldoPos,
			&boughtAt, &boughtTxID, &createdAt,
		)
		if err != nil {
			continue
		}

		it.CreatedAt = createdAt.Format(time.RFC3339)
		if targetDate.Valid {
			tdStr := targetDate.Time.Format("2006-01-02")
			it.TargetDate = &tdStr
			sisaHari := calc.CalculateSisaHariDeadline(&targetDate.Time, now)
			it.SisaHari = sisaHari
		}

		if boughtAt.Valid {
			bStr := boughtAt.Time.Format("2006-01-02")
			it.BoughtAt = &bStr
		}
		if boughtTxID.Valid {
			it.BoughtTransactionID = &boughtTxID.String
		}

		if imageID.Valid && imageID.String != "" {
			imgID := imageID.String
			it.ImageID = &imgID
			fURL := media.GenerateSignedImageURL(baseURL, imgID, jwtSecret, 1*time.Hour)
			it.FotoURL = &fURL
			it.FotoThumbURL = &fURL // Sisi terpanjang 800px responsif / URL bertanda tangan
		} else if strings.TrimSpace(fallbackImageURL) != "" {
			fURL := strings.TrimSpace(fallbackImageURL)
			it.FotoURL = &fURL
			it.FotoThumbURL = &fURL
		}

		if it.Situs == "" && it.Link != "" {
			it.Situs = media.DetectSite(it.Link)
		}

		if savingPotID.Valid {
			it.SavingPotID = &savingPotID.String
			if savingPotName.Valid {
				it.SavingPotName = &savingPotName.String
			}
			sPos := saldoPos.Int64
			it.SaldoPos = &sPos
			if it.Price > 0 {
				persen := float64(sPos) / float64(it.Price) * 100.0
				persen = float64(int64(persen*100)) / 100.0
				it.PersenTerkumpul = &persen
			}
		}

		if it.Price <= saldoBebas {
			it.BisaDibeliSekarang = true
			it.KurangBerapa = 0
		} else {
			it.BisaDibeliSekarang = false
			it.KurangBerapa = it.Price - saldoBebas
		}
		it.SaldoBebasJikaDibeli = saldoBebas - it.Price

		if it.Status == "aktif" {
			totalHargaAktif += it.Price
			jumlahAktif++
			if it.BisaDibeliSekarang {
				jumlahBisaDibeliSekarang++
			}
		}

		items = append(items, it)
	}

	return c.JSON(fiber.Map{
		"items": items,
		"ringkasan": fiber.Map{
			"total_harga_aktif":          totalHargaAktif,
			"jumlah_aktif":               jumlahAktif,
			"saldo_bebas":                saldoBebas,
			"jumlah_bisa_dibeli_sekarang": jumlahBisaDibeliSekarang,
		},
	})
}

// POST /api/wishlist
func (h *Handler) CreateWishlistItem(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)

	type CreateWishlistInput struct {
		Name        string  `json:"name"`
		Price       int64   `json:"price"`
		Priority    *string `json:"priority"`
		Category    *string `json:"category"`
		Link        *string `json:"link"`
		ImageID     *string `json:"image_id"`
		ImageURL    *string `json:"image_url"`
		PriceSource *string `json:"price_source"`
		Note        *string `json:"note"`
		TargetDate  *string `json:"target_date"`
		SavingPotID *string `json:"saving_pot_id"`
	}

	var input CreateWishlistInput
	if err := c.BodyParser(&input); err != nil {
		return ErrorResponse(c, fiber.StatusBadRequest, "Format JSON tidak valid")
	}

	name := strings.TrimSpace(input.Name)
	if name == "" {
		return ErrorResponse(c, fiber.StatusUnprocessableEntity, "Nama barang tidak boleh kosong")
	}
	if input.Price <= 0 {
		return ErrorResponse(c, fiber.StatusUnprocessableEntity, "Harga barang harus lebih besar dari 0")
	}

	priority := "sedang"
	if input.Priority != nil && strings.TrimSpace(*input.Priority) != "" {
		p := strings.TrimSpace(strings.ToLower(*input.Priority))
		if p != "tinggi" && p != "sedang" && p != "rendah" {
			return ErrorResponse(c, fiber.StatusUnprocessableEntity, "Prioritas harus 'tinggi', 'sedang', atau 'rendah'")
		}
		priority = p
	}

	category := "Belanja"
	if input.Category != nil && strings.TrimSpace(*input.Category) != "" {
		cat := strings.TrimSpace(*input.Category)
		if !calc.IsValidCategory("keluar", cat) {
			return ErrorResponse(c, fiber.StatusUnprocessableEntity, "Kategori pengeluaran tidak valid")
		}
		category = cat
	}

	link := ""
	if input.Link != nil {
		link = strings.TrimSpace(*input.Link)
	}

	note := ""
	if input.Note != nil {
		note = strings.TrimSpace(*input.Note)
	}

	var targetDateVal *time.Time
	if input.TargetDate != nil && strings.TrimSpace(*input.TargetDate) != "" {
		d, err := ParseDate(*input.TargetDate)
		if err != nil {
			return ErrorResponse(c, fiber.StatusUnprocessableEntity, "Format target_date tidak valid (gunakan YYYY-MM-DD)")
		}
		targetDateVal = &d
	}

	var savingPotIDVal *string
	if input.SavingPotID != nil && strings.TrimSpace(*input.SavingPotID) != "" {
		potID := strings.TrimSpace(*input.SavingPotID)
		if _, err := uuid.Parse(potID); err != nil {
			return ErrorResponse(c, fiber.StatusBadRequest, "Format saving_pot_id tidak valid")
		}
		// Pastikan pos milik user
		var exists bool
		_ = h.DB.QueryRow("SELECT true FROM savings_pots WHERE id = $1 AND user_id = $2", potID, userID).Scan(&exists)
		if !exists {
			return ErrorResponse(c, fiber.StatusNotFound, "Pos tabungan tidak ditemukan")
		}
		savingPotIDVal = &potID
	}

	// Deteksi situs dan resolved link
	sourceSite := ""
	if link != "" {
		sourceSite = media.DetectSite(link)
	}

	priceSource := "manual"
	if input.PriceSource != nil && strings.TrimSpace(*input.PriceSource) == "link" {
		priceSource = "link"
	}

	// Image ID handling: dari input.ImageID atau unduh dari input.ImageURL
	var finalImageID *string
	fallbackImgURL := ""
	if input.ImageURL != nil {
		fallbackImgURL = strings.TrimSpace(*input.ImageURL)
	}
	if input.ImageID != nil && strings.TrimSpace(*input.ImageID) != "" {
		imgID := strings.TrimSpace(*input.ImageID)
		if _, err := uuid.Parse(imgID); err != nil {
			return ErrorResponse(c, fiber.StatusBadRequest, "Format image_id tidak valid")
		}
		var imgExists bool
		_ = h.DB.QueryRow("SELECT true FROM wishlist_images WHERE id = $1 AND user_id = $2", imgID, userID).Scan(&imgExists)
		if !imgExists {
			return ErrorResponse(c, fiber.StatusNotFound, "Foto tidak ditemukan atau bukan milik akun Anda")
		}
		finalImageID = &imgID
	} else if fallbackImgURL != "" {
		parsedImgURL, err := media.ValidateURLFormat(fallbackImgURL)
		if err == nil {
			client := media.NewSSRFSafeHTTPClient(8*time.Second, false)
			req, err := http.NewRequestWithContext(context.Background(), "GET", parsedImgURL.String(), nil)
			if err == nil {
				req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
				req.Header.Set("Referer", parsedImgURL.Scheme+"://"+parsedImgURL.Host+"/")
				req.Header.Set("Accept", "image/avif,image/webp,image/apng,image/*,*/*;q=0.8")
				if resp, err := client.Do(req); err == nil && resp.StatusCode == http.StatusOK {
					defer resp.Body.Close()
					if processed, err := media.ProcessAndResizeImage(resp.Body, 800); err == nil {
						if newImgID, err := h.saveWishlistImage(context.Background(), userID, processed); err == nil {
							finalImageID = &newImgID
						}
					}
				}
			}
		}
	}

	newID := uuid.New().String()
	_, err := h.DB.Exec(`
		INSERT INTO wishlist_items (
			id, user_id, name, price, priority, category, link, source_site, link_resolved, price_source, image_id, image_url, note, target_date, status, saving_pot_id, created_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $7, $9, $10, $11, $12, $13, 'aktif', $14, now())
	`, newID, userID, name, input.Price, priority, category, link, sourceSite, priceSource, finalImageID, fallbackImgURL, note, targetDateVal, savingPotIDVal)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal menambahkan item wishlist: "+err.Error())
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"message": "Item wishlist berhasil ditambahkan",
		"id":      newID,
	})
}

// GET /api/wishlist/:id
func (h *Handler) GetWishlistItemByID(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	id := c.Params("id")
	if _, err := uuid.Parse(id); err != nil {
		return ErrorResponse(c, fiber.StatusBadRequest, "Format ID wishlist tidak valid")
	}

	ctx := context.Background()
	_, _, saldoBebas, err := h.GetBalances(ctx, nil, userID)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal menghitung saldo: "+err.Error())
	}

	var it WishlistItemResponse
	var targetDate, boughtAt sql.NullTime
	var savingPotID, savingPotName, boughtTxID, imageID sql.NullString
	var saldoPos sql.NullInt64
	var createdAt time.Time

	err = h.DB.QueryRowContext(ctx, `
		SELECT 
			w.id, w.name, w.price, w.priority, w.category, w.link, w.link_resolved, w.source_site, w.price_source,
			w.image_id, w.note, w.target_date, 
			w.status, w.saving_pot_id, sp.name AS saving_pot_name,
			COALESCE(
				(SELECT SUM(CASE WHEN sm.type = 'setor' THEN sm.amount ELSE -sm.amount END)
				 FROM savings_movements sm WHERE sm.pot_id = w.saving_pot_id), 0
			) AS saldo_pos,
			w.bought_at, w.bought_transaction_id, w.created_at
		FROM wishlist_items w
		LEFT JOIN savings_pots sp ON w.saving_pot_id = sp.id
		WHERE w.id = $1 AND w.user_id = $2
	`, id, userID).Scan(
		&it.ID, &it.Name, &it.Price, &it.Priority, &it.Category, &it.Link, &it.LinkAkhir, &it.Situs, &it.PriceSource,
		&imageID, &it.Note, &targetDate, &it.Status, &savingPotID, &savingPotName, &saldoPos,
		&boughtAt, &boughtTxID, &createdAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return ErrorResponse(c, fiber.StatusNotFound, "Item wishlist tidak ditemukan")
		}
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal membaca item wishlist")
	}

	baseURL := c.BaseURL()
	jwtSecret := ""
	if h.Config != nil {
		jwtSecret = h.Config.JWTSecret
	}

	now := time.Now()
	it.CreatedAt = createdAt.Format(time.RFC3339)
	if targetDate.Valid {
		tdStr := targetDate.Time.Format("2006-01-02")
		it.TargetDate = &tdStr
		it.SisaHari = calc.CalculateSisaHariDeadline(&targetDate.Time, now)
	}
	if boughtAt.Valid {
		bStr := boughtAt.Time.Format("2006-01-02")
		it.BoughtAt = &bStr
	}
	if boughtTxID.Valid {
		it.BoughtTransactionID = &boughtTxID.String
	}
	if imageID.Valid && imageID.String != "" {
		imgID := imageID.String
		it.ImageID = &imgID
		fURL := media.GenerateSignedImageURL(baseURL, imgID, jwtSecret, 1*time.Hour)
		it.FotoURL = &fURL
		it.FotoThumbURL = &fURL
	}
	if it.Situs == "" && it.Link != "" {
		it.Situs = media.DetectSite(it.Link)
	}
	if savingPotID.Valid {
		it.SavingPotID = &savingPotID.String
		if savingPotName.Valid {
			it.SavingPotName = &savingPotName.String
		}
		sPos := saldoPos.Int64
		it.SaldoPos = &sPos
		if it.Price > 0 {
			persen := float64(sPos) / float64(it.Price) * 100.0
			persen = float64(int64(persen*100)) / 100.0
			it.PersenTerkumpul = &persen
		}
	}

	if it.Price <= saldoBebas {
		it.BisaDibeliSekarang = true
		it.KurangBerapa = 0
	} else {
		it.BisaDibeliSekarang = false
		it.KurangBerapa = it.Price - saldoBebas
	}
	it.SaldoBebasJikaDibeli = saldoBebas - it.Price

	return c.JSON(it)
}

// PUT /api/wishlist/:id
func (h *Handler) UpdateWishlistItem(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	id := c.Params("id")
	if _, err := uuid.Parse(id); err != nil {
		return ErrorResponse(c, fiber.StatusBadRequest, "Format ID wishlist tidak valid")
	}

	type UpdateWishlistInput struct {
		Name        string  `json:"name"`
		Price       int64   `json:"price"`
		Priority    *string `json:"priority"`
		Category    *string `json:"category"`
		Link        *string `json:"link"`
		ImageID     *string `json:"image_id"`
		ImageURL    *string `json:"image_url"`
		PriceSource *string `json:"price_source"`
		Note        *string `json:"note"`
		TargetDate  *string `json:"target_date"`
		SavingPotID *string `json:"saving_pot_id"`
	}

	var input UpdateWishlistInput
	if err := c.BodyParser(&input); err != nil {
		return ErrorResponse(c, fiber.StatusBadRequest, "Format JSON tidak valid")
	}

	name := strings.TrimSpace(input.Name)
	if name == "" {
		return ErrorResponse(c, fiber.StatusUnprocessableEntity, "Nama barang tidak boleh kosong")
	}
	if input.Price <= 0 {
		return ErrorResponse(c, fiber.StatusUnprocessableEntity, "Harga barang harus lebih besar dari 0")
	}

	priority := "sedang"
	if input.Priority != nil && strings.TrimSpace(*input.Priority) != "" {
		p := strings.TrimSpace(strings.ToLower(*input.Priority))
		if p != "tinggi" && p != "sedang" && p != "rendah" {
			return ErrorResponse(c, fiber.StatusUnprocessableEntity, "Prioritas harus 'tinggi', 'sedang', atau 'rendah'")
		}
		priority = p
	}

	category := "Belanja"
	if input.Category != nil && strings.TrimSpace(*input.Category) != "" {
		cat := strings.TrimSpace(*input.Category)
		if !calc.IsValidCategory("keluar", cat) {
			return ErrorResponse(c, fiber.StatusUnprocessableEntity, "Kategori pengeluaran tidak valid")
		}
		category = cat
	}

	link := ""
	if input.Link != nil {
		link = strings.TrimSpace(*input.Link)
	}

	note := ""
	if input.Note != nil {
		note = strings.TrimSpace(*input.Note)
	}

	var targetDateVal *time.Time
	if input.TargetDate != nil && strings.TrimSpace(*input.TargetDate) != "" {
		d, err := ParseDate(*input.TargetDate)
		if err != nil {
			return ErrorResponse(c, fiber.StatusUnprocessableEntity, "Format target_date tidak valid (gunakan YYYY-MM-DD)")
		}
		targetDateVal = &d
	}

	var savingPotIDVal *string
	if input.SavingPotID != nil && strings.TrimSpace(*input.SavingPotID) != "" {
		potID := strings.TrimSpace(*input.SavingPotID)
		if _, err := uuid.Parse(potID); err != nil {
			return ErrorResponse(c, fiber.StatusBadRequest, "Format saving_pot_id tidak valid")
		}
		var exists bool
		_ = h.DB.QueryRow("SELECT true FROM savings_pots WHERE id = $1 AND user_id = $2", potID, userID).Scan(&exists)
		if !exists {
			return ErrorResponse(c, fiber.StatusNotFound, "Pos tabungan tidak ditemukan")
		}
		savingPotIDVal = &potID
	}

	// Cek image_id lama
	var oldImageID sql.NullString
	_ = h.DB.QueryRow("SELECT image_id FROM wishlist_items WHERE id = $1 AND user_id = $2", id, userID).Scan(&oldImageID)

	sourceSite := ""
	if link != "" {
		sourceSite = media.DetectSite(link)
	}

	priceSource := "manual"
	if input.PriceSource != nil && strings.TrimSpace(*input.PriceSource) == "link" {
		priceSource = "link"
	}

	var finalImageID *string
	if oldImageID.Valid {
		s := oldImageID.String
		finalImageID = &s
	}

	imageChanged := false
	if input.ImageID != nil {
		imgID := strings.TrimSpace(*input.ImageID)
		if imgID == "" {
			finalImageID = nil
			imageChanged = true
		} else {
			if _, err := uuid.Parse(imgID); err != nil {
				return ErrorResponse(c, fiber.StatusBadRequest, "Format image_id tidak valid")
			}
			var imgExists bool
			_ = h.DB.QueryRow("SELECT true FROM wishlist_images WHERE id = $1 AND user_id = $2", imgID, userID).Scan(&imgExists)
			if !imgExists {
				return ErrorResponse(c, fiber.StatusNotFound, "Foto tidak ditemukan atau bukan milik akun Anda")
			}
			finalImageID = &imgID
			imageChanged = true
		}
	} else if input.ImageURL != nil && strings.TrimSpace(*input.ImageURL) != "" {
		imgURL := strings.TrimSpace(*input.ImageURL)
		parsedImgURL, err := media.ValidateURLFormat(imgURL)
		if err == nil {
			client := media.NewSSRFSafeHTTPClient(8*time.Second, false)
			req, err := http.NewRequestWithContext(context.Background(), "GET", parsedImgURL.String(), nil)
			if err == nil {
				req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
				if resp, err := client.Do(req); err == nil && resp.StatusCode == http.StatusOK {
					defer resp.Body.Close()
					if processed, err := media.ProcessAndResizeImage(resp.Body, 800); err == nil {
						if newImgID, err := h.saveWishlistImage(context.Background(), userID, processed); err == nil {
							finalImageID = &newImgID
							imageChanged = true
						}
					}
				}
			}
		}
	}

	result, err := h.DB.Exec(`
		UPDATE wishlist_items
		SET name = $1, price = $2, priority = $3, category = $4, link = $5, source_site = $6, link_resolved = $5, price_source = $7, image_id = $8, note = $9, target_date = $10, saving_pot_id = $11
		WHERE id = $12 AND user_id = $13
	`, name, input.Price, priority, category, link, sourceSite, priceSource, finalImageID, note, targetDateVal, savingPotIDVal, id, userID)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal memperbarui item wishlist: "+err.Error())
	}
	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		return ErrorResponse(c, fiber.StatusNotFound, "Item wishlist tidak ditemukan")
	}

	// Jika image diganti, hapus gambar lama jika tidak dipakai item lain
	if imageChanged && oldImageID.Valid && (finalImageID == nil || *finalImageID != oldImageID.String) {
		var otherCount int
		_ = h.DB.QueryRow("SELECT COUNT(*) FROM wishlist_items WHERE image_id = $1 AND id <> $2", oldImageID.String, id).Scan(&otherCount)
		if otherCount == 0 {
			_, _ = h.DB.Exec("DELETE FROM wishlist_images WHERE id = $1 AND user_id = $2", oldImageID.String, userID)
		}
	}

	return c.JSON(fiber.Map{
		"message": "Item wishlist berhasil diperbarui",
		"id":      id,
	})
}

// DELETE /api/wishlist/:id
// (DELETE = ubah status 'dibatalkan' jika sudah pernah dibeli, selain itu hapus permanen)
func (h *Handler) DeleteWishlistItem(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	id := c.Params("id")
	if _, err := uuid.Parse(id); err != nil {
		return ErrorResponse(c, fiber.StatusBadRequest, "Format ID wishlist tidak valid")
	}

	var status string
	var imageID sql.NullString
	err := h.DB.QueryRow("SELECT status, image_id FROM wishlist_items WHERE id = $1 AND user_id = $2", id, userID).Scan(&status, &imageID)
	if err != nil {
		if err == sql.ErrNoRows {
			return ErrorResponse(c, fiber.StatusNotFound, "Item wishlist tidak ditemukan")
		}
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal memeriksa item wishlist")
	}

	if status == "dibeli" {
		_, err = h.DB.Exec("UPDATE wishlist_items SET status = 'dibatalkan' WHERE id = $1 AND user_id = $2", id, userID)
		if err != nil {
			return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal membatalkan item wishlist")
		}
		return c.JSON(fiber.Map{
			"message": "Item wishlist yang sudah dibeli ditandai sebagai dibatalkan",
		})
	}

	_, err = h.DB.Exec("DELETE FROM wishlist_items WHERE id = $1 AND user_id = $2", id, userID)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal menghapus item wishlist")
	}

	// Hapus gambar yatim jika tidak dipakai item lain
	if imageID.Valid && imageID.String != "" {
		var otherCount int
		_ = h.DB.QueryRow("SELECT COUNT(*) FROM wishlist_items WHERE image_id = $1", imageID.String).Scan(&otherCount)
		if otherCount == 0 {
			_, _ = h.DB.Exec("DELETE FROM wishlist_images WHERE id = $1 AND user_id = $2", imageID.String, userID)
		}
	}

	return c.JSON(fiber.Map{
		"message": "Item wishlist berhasil dihapus permanen",
	})
}

// GET /api/wishlist/:id/preview?sumber=bebas|pos&pos_id=
func (h *Handler) PreviewWishlistByID(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	id := c.Params("id")
	if _, err := uuid.Parse(id); err != nil {
		return ErrorResponse(c, fiber.StatusBadRequest, "Format ID wishlist tidak valid")
	}

	sumber := c.Query("sumber")
	posIDQuery := c.Query("pos_id")

	ctx := context.Background()

	// Ambil item wishlist
	var name string
	var price int64
	var defaultPotID sql.NullString
	err := h.DB.QueryRowContext(ctx, "SELECT name, price, saving_pot_id FROM wishlist_items WHERE id = $1 AND user_id = $2", id, userID).Scan(&name, &price, &defaultPotID)
	if err != nil {
		if err == sql.ErrNoRows {
			return ErrorResponse(c, fiber.StatusNotFound, "Item wishlist tidak ditemukan")
		}
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal membaca item wishlist")
	}

	// Tentukan pos_id
	posID := posIDQuery
	if posID == "" && defaultPotID.Valid {
		posID = defaultPotID.String
	}

	// Ambil balances
	saldoTotal, totalTersimpan, saldoBebas, err := h.GetBalances(ctx, nil, userID)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal menghitung saldo: "+err.Error())
	}

	var saldoPos int64
	if sumber == "pos" {
		if posID == "" {
			return ErrorResponse(c, fiber.StatusBadRequest, "Parameter pos_id wajib diisi jika sumber=pos")
		}
		if _, err := uuid.Parse(posID); err != nil {
			return ErrorResponse(c, fiber.StatusBadRequest, "Format pos_id tidak valid")
		}
		err = h.DB.QueryRowContext(ctx, `
			SELECT 
				COALESCE(SUM(CASE WHEN m.type = 'setor' THEN m.amount ELSE 0 END), 0) -
				COALESCE(SUM(CASE WHEN m.type IN ('tarik', 'pakai') THEN m.amount ELSE 0 END), 0)
			FROM savings_pots p
			LEFT JOIN savings_movements m ON p.id = m.pot_id
			WHERE p.id = $1 AND p.user_id = $2
			GROUP BY p.id
		`, posID, userID).Scan(&saldoPos)
		if err != nil {
			if err == sql.ErrNoRows {
				return ErrorResponse(c, fiber.StatusNotFound, "Pos tabungan tidak ditemukan")
			}
			return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal membaca saldo pos tabungan")
		}
	}

	now := time.Now()
	tagihan7Hari, err := h.GetTagihanJatuhTempo7Hari(ctx, userID, now)
	if err != nil {
		tagihan7Hari = 0
	}

	state := calc.FinancialState{
		SaldoTotal:                   saldoTotal,
		TotalTersimpan:               totalTersimpan,
		SaldoBebas:                   saldoBebas,
		SaldoPos:                     saldoPos,
		TagihanJatuhTempo7HariTotal: tagihan7Hari,
		RefDate:                      now,
	}

	result := calc.SimulasiBeli(name, price, sumber, state)
	return c.JSON(result)
}

// POST /api/wishlist/preview  body {harga, sumber?, pos_id?}
func (h *Handler) PreviewWishlistCustom(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)

	type CustomPreviewInput struct {
		Harga  int64   `json:"harga"`
		Sumber *string `json:"sumber"`
		PosID  *string `json:"pos_id"`
	}

	var input CustomPreviewInput
	if err := c.BodyParser(&input); err != nil {
		return ErrorResponse(c, fiber.StatusBadRequest, "Format JSON tidak valid")
	}
	if input.Harga <= 0 {
		return ErrorResponse(c, fiber.StatusUnprocessableEntity, "Harga harus lebih besar dari 0")
	}

	sumber := "bebas"
	if input.Sumber != nil && strings.TrimSpace(*input.Sumber) != "" {
		s := strings.TrimSpace(strings.ToLower(*input.Sumber))
		if s == "pos" {
			sumber = "pos"
		}
	}

	ctx := context.Background()
	saldoTotal, totalTersimpan, saldoBebas, err := h.GetBalances(ctx, nil, userID)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal menghitung saldo: "+err.Error())
	}

	var saldoPos int64
	if sumber == "pos" {
		if input.PosID == nil || strings.TrimSpace(*input.PosID) == "" {
			return ErrorResponse(c, fiber.StatusBadRequest, "pos_id wajib diisi jika sumber=pos")
		}
		posID := strings.TrimSpace(*input.PosID)
		if _, err := uuid.Parse(posID); err != nil {
			return ErrorResponse(c, fiber.StatusBadRequest, "Format pos_id tidak valid")
		}
		err = h.DB.QueryRowContext(ctx, `
			SELECT 
				COALESCE(SUM(CASE WHEN m.type = 'setor' THEN m.amount ELSE 0 END), 0) -
				COALESCE(SUM(CASE WHEN m.type IN ('tarik', 'pakai') THEN m.amount ELSE 0 END), 0)
			FROM savings_pots p
			LEFT JOIN savings_movements m ON p.id = m.pot_id
			WHERE p.id = $1 AND p.user_id = $2
			GROUP BY p.id
		`, posID, userID).Scan(&saldoPos)
		if err != nil {
			if err == sql.ErrNoRows {
				return ErrorResponse(c, fiber.StatusNotFound, "Pos tabungan tidak ditemukan")
			}
			return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal membaca saldo pos tabungan")
		}
	}

	now := time.Now()
	tagihan7Hari, _ := h.GetTagihanJatuhTempo7Hari(ctx, userID, now)

	state := calc.FinancialState{
		SaldoTotal:                   saldoTotal,
		TotalTersimpan:               totalTersimpan,
		SaldoBebas:                   saldoBebas,
		SaldoPos:                     saldoPos,
		TagihanJatuhTempo7HariTotal: tagihan7Hari,
		RefDate:                      now,
	}

	result := calc.SimulasiBeli("barang ini", input.Harga, sumber, state)
	return c.JSON(result)
}

// POST /api/wishlist/:id/buy
func (h *Handler) BuyWishlistItem(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	id := c.Params("id")
	if _, err := uuid.Parse(id); err != nil {
		return ErrorResponse(c, fiber.StatusBadRequest, "Format ID wishlist tidak valid")
	}

	type BuyInput struct {
		Date        *string `json:"date"`
		Sumber      string  `json:"sumber"` // "bebas" atau "pos"
		PosID       *string `json:"pos_id"`
		PriceActual *int64  `json:"price_actual"`
		Party       *string `json:"party"`
		Note        *string `json:"note"`
		Force       bool    `json:"force"`
	}

	var input BuyInput
	if err := c.BodyParser(&input); err != nil {
		return ErrorResponse(c, fiber.StatusBadRequest, "Format JSON tidak valid")
	}

	sumber := "bebas"
	if strings.TrimSpace(strings.ToLower(input.Sumber)) == "pos" {
		sumber = "pos"
	}

	txDate := time.Now().Format("2006-01-02")
	if input.Date != nil && strings.TrimSpace(*input.Date) != "" {
		d, err := ParseDate(*input.Date)
		if err != nil {
			return ErrorResponse(c, fiber.StatusUnprocessableEntity, "Format tanggal tidak valid (gunakan YYYY-MM-DD)")
		}
		txDate = d.Format("2006-01-02")
	}

	party := ""
	if input.Party != nil {
		party = strings.TrimSpace(*input.Party)
	}

	ctx := context.Background()
	tx, err := h.DB.BeginTx(ctx, nil)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal memulai transaksi database")
	}
	defer tx.Rollback()

	// Kunci baris user untuk serialisasi saldo bebas
	var lockedUserID string
	err = tx.QueryRowContext(ctx, "SELECT id FROM users WHERE id = $1 FOR UPDATE", userID).Scan(&lockedUserID)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal mengunci sesi pengguna")
	}

	// 1. Ambil data wishlist item
	var itemName, category, status string
	var itemPrice int64
	var defaultPotID, itemLink sql.NullString
	err = tx.QueryRowContext(ctx, `
		SELECT name, price, category, status, saving_pot_id, link 
		FROM wishlist_items 
		WHERE id = $1 AND user_id = $2
	`, id, userID).Scan(&itemName, &itemPrice, &category, &status, &defaultPotID, &itemLink)
	if err != nil {
		if err == sql.ErrNoRows {
			return ErrorResponse(c, fiber.StatusNotFound, "Item wishlist tidak ditemukan")
		}
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal memeriksa item wishlist")
	}

	if status != "aktif" {
		return ErrorResponse(c, fiber.StatusConflict, "Barang ini sudah dibeli atau dibatalkan")
	}

	// 2. Tentukan harga akhir
	finalPrice := itemPrice
	if input.PriceActual != nil && *input.PriceActual > 0 {
		finalPrice = *input.PriceActual
	}

	// 3 & 4. Validasi saldo berdasarkan sumber
	var finalPotID string
	if sumber == "pos" {
		if input.PosID != nil && strings.TrimSpace(*input.PosID) != "" {
			finalPotID = strings.TrimSpace(*input.PosID)
		} else if defaultPotID.Valid && defaultPotID.String != "" {
			finalPotID = defaultPotID.String
		} else {
			return ErrorResponse(c, fiber.StatusBadRequest, "pos_id wajib diisi untuk pembelian dari tabungan")
		}

		if _, err := uuid.Parse(finalPotID); err != nil {
			return ErrorResponse(c, fiber.StatusBadRequest, "Format pos_id tidak valid")
		}

		// Periksa pos dan saldo pos
		var archived bool
		var saldoPos int64
		err = tx.QueryRowContext(ctx, `
			SELECT 
				p.archived,
				COALESCE(SUM(CASE WHEN m.type = 'setor' THEN m.amount ELSE 0 END), 0) -
				COALESCE(SUM(CASE WHEN m.type IN ('tarik', 'pakai') THEN m.amount ELSE 0 END), 0) AS saldo
			FROM savings_pots p
			LEFT JOIN savings_movements m ON p.id = m.pot_id
			WHERE p.id = $1 AND p.user_id = $2
			GROUP BY p.id, p.archived
		`, finalPotID, userID).Scan(&archived, &saldoPos)
		if err != nil {
			if err == sql.ErrNoRows {
				return ErrorResponse(c, fiber.StatusNotFound, "Pos tabungan tidak ditemukan")
			}
			return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal memeriksa pos tabungan")
		}
		if archived {
			return ErrorResponse(c, fiber.StatusUnprocessableEntity, "Tidak dapat menggunakan uang dari pos tabungan yang sudah diarsipkan")
		}
		if finalPrice > saldoPos {
			return ErrorResponse(c, fiber.StatusUnprocessableEntity, "Saldo pos tabungan tidak cukup")
		}
	} else {
		// sumber == "bebas"
		_, _, saldoBebas, errBal := h.GetBalances(ctx, tx, userID)
		if errBal != nil {
			return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal menghitung saldo: "+errBal.Error())
		}
		if finalPrice > saldoBebas && !input.Force {
			return ErrorResponse(c, fiber.StatusUnprocessableEntity, "Saldo bebas tidak cukup")
		}
	}

	// 5. Buat transaksi keluar
	txID := uuid.New().String()
	txNote := itemName
	if input.Note != nil && strings.TrimSpace(*input.Note) != "" {
		txNote = strings.TrimSpace(*input.Note)
	}
	// Sertakan link produk di note transaksi bila ada
	if itemLink.Valid && strings.TrimSpace(itemLink.String) != "" {
		txNote = fmt.Sprintf("%s (%s)", txNote, strings.TrimSpace(itemLink.String))
	}

	_, err = tx.ExecContext(ctx, `
		INSERT INTO transactions (id, user_id, date, type, category, party, source, note, amount, created_at)
		VALUES ($1, $2, $3, 'keluar', $4, $5, '', $6, $7, now())
	`, txID, userID, txDate, category, party, txNote, finalPrice)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal membuat transaksi: "+err.Error())
	}

	// 1 baris transaction_items
	itemID := uuid.New().String()
	_, err = tx.ExecContext(ctx, `
		INSERT INTO transaction_items (id, transaction_id, name, qty, unit_price, subtotal)
		VALUES ($1, $2, $3, 1, $4, $4)
	`, itemID, txID, itemName, finalPrice)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal menyimpan rincian item: "+err.Error())
	}

	// Jika dari pos, buat movement type 'pakai'
	if sumber == "pos" {
		movID := uuid.New().String()
		_, err = tx.ExecContext(ctx, `
			INSERT INTO savings_movements (id, user_id, pot_id, type, amount, date, note, transaction_id, created_at)
			VALUES ($1, $2, $3, 'pakai', $4, $5, $6, $7, now())
		`, movID, userID, finalPotID, finalPrice, txDate, txNote, txID)
		if err != nil {
			return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal mencatat mutasi tabungan: "+err.Error())
		}
	}

	// 6. Update wishlist_items
	_, err = tx.ExecContext(ctx, `
		UPDATE wishlist_items
		SET status = 'dibeli', bought_at = $1, bought_transaction_id = $2
		WHERE id = $3 AND user_id = $4
	`, txDate, txID, id, userID)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal memperbarui status wishlist: "+err.Error())
	}

	// Hitung saldo akhir
	saldoTotal, totalTersimpan, saldoBebas, err := h.GetBalances(ctx, tx, userID)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal menghitung saldo: "+err.Error())
	}

	sisaHari := calc.SisaHariBulanIni(time.Now())
	jatahHarian := calc.CalculateJatahHarian(saldoBebas, sisaHari)

	if err := tx.Commit(); err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal menyelesaikan transaksi database")
	}

	pesan := fmt.Sprintf("Dibeli! Saldo kamu sekarang %s (saldo jajan %s).",
		calc.FormatRupiah(saldoTotal),
		calc.FormatRupiah(saldoBebas),
	)

	return c.JSON(fiber.Map{
		"item": fiber.Map{
			"id":                    id,
			"name":                  itemName,
			"price":                 finalPrice,
			"status":                "dibeli",
			"bought_at":             txDate,
			"bought_transaction_id": txID,
		},
		"transaksi": fiber.Map{
			"id":       txID,
			"amount":   finalPrice,
			"category": category,
			"date":     txDate,
		},
		"saldo_total":     saldoTotal,
		"saldo_bebas":     saldoBebas,
		"total_tersimpan": totalTersimpan,
		"jatah_harian":    jatahHarian,
		"pesan":           pesan,
	})
}

// POST /api/wishlist/:id/undo-buy
func (h *Handler) UndoBuyWishlistItem(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	id := c.Params("id")
	if _, err := uuid.Parse(id); err != nil {
		return ErrorResponse(c, fiber.StatusBadRequest, "Format ID wishlist tidak valid")
	}

	ctx := context.Background()
	tx, err := h.DB.BeginTx(ctx, nil)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal memulai transaksi database")
	}
	defer tx.Rollback()

	// Kunci baris user
	var lockedUserID string
	err = tx.QueryRowContext(ctx, "SELECT id FROM users WHERE id = $1 FOR UPDATE", userID).Scan(&lockedUserID)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal mengunci sesi pengguna")
	}

	var status string
	var boughtTxID sql.NullString
	err = tx.QueryRowContext(ctx, "SELECT status, bought_transaction_id FROM wishlist_items WHERE id = $1 AND user_id = $2", id, userID).Scan(&status, &boughtTxID)
	if err != nil {
		if err == sql.ErrNoRows {
			return ErrorResponse(c, fiber.StatusNotFound, "Item wishlist tidak ditemukan")
		}
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal memeriksa item wishlist")
	}

	if status != "dibeli" {
		return ErrorResponse(c, fiber.StatusConflict, "Item wishlist belum dibeli atau sudah dibatalkan")
	}

	if boughtTxID.Valid && boughtTxID.String != "" {
		// Hapus savings movement jika ada
		_, _ = tx.ExecContext(ctx, "DELETE FROM savings_movements WHERE transaction_id = $1 AND user_id = $2", boughtTxID.String, userID)

		// Hapus transaksi keluar
		_, err = tx.ExecContext(ctx, "DELETE FROM transactions WHERE id = $1 AND user_id = $2", boughtTxID.String, userID)
		if err != nil {
			return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal membatalkan transaksi belanja")
		}
	}

	// Kembalikan status wishlist ke 'aktif'
	_, err = tx.ExecContext(ctx, `
		UPDATE wishlist_items
		SET status = 'aktif', bought_at = NULL, bought_transaction_id = NULL
		WHERE id = $1 AND user_id = $2
	`, id, userID)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal memperbarui status wishlist")
	}

	saldoTotal, totalTersimpan, saldoBebas, err := h.GetBalances(ctx, tx, userID)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal menghitung saldo: "+err.Error())
	}

	if err := tx.Commit(); err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal menyelesaikan transaksi database")
	}

	return c.JSON(fiber.Map{
		"message":         "Pembelian wishlist berhasil dibatalkan",
		"id":              id,
		"status":          "aktif",
		"saldo_total":     saldoTotal,
		"saldo_bebas":     saldoBebas,
		"total_tersimpan": totalTersimpan,
	})
}

// GET /api/wishlist/plan
func (h *Handler) GetWishlistPlan(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	ctx := context.Background()

	_, _, saldoBebas, err := h.GetBalances(ctx, nil, userID)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal menghitung saldo: "+err.Error())
	}

	rows, err := h.DB.QueryContext(ctx, `
		SELECT id, name, price, priority
		FROM wishlist_items
		WHERE user_id = $1 AND status = 'aktif'
		ORDER BY 
			CASE priority WHEN 'tinggi' THEN 1 WHEN 'sedang' THEN 2 WHEN 'rendah' THEN 3 ELSE 4 END ASC,
			target_date ASC NULLS LAST,
			created_at DESC
	`, userID)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal mengambil rencana belanja: "+err.Error())
	}
	defer rows.Close()

	planItems := make([]calc.WishlistPlanItem, 0)
	for rows.Next() {
		var it calc.WishlistPlanItem
		if err := rows.Scan(&it.ID, &it.Name, &it.Price, &it.Priority); err == nil {
			planItems = append(planItems, it)
		}
	}

	calculatedPlan, reachableCount := calc.CalculateWishlistPlan(planItems, saldoBebas)

	return c.JSON(fiber.Map{
		"saldo_bebas_sekarang": saldoBebas,
		"total_item_aktif":     len(planItems),
		"jumlah_terjangkau":    reachableCount,
		"plan":                 calculatedPlan,
	})
}
