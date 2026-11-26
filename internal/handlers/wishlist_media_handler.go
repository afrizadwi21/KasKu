package handlers

import (
	"context"
	"database/sql"
	"fmt"
	"io"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	"kasku-backend/internal/media"
	"kasku-backend/internal/middleware"
)

// In-memory rate limiter khusus fetch-link: 20 per menit per user
type fetchLimiter struct {
	sync.Mutex
	counts map[string][]time.Time
}

var globalFetchLimiter = &fetchLimiter{
	counts: make(map[string][]time.Time),
}

func (fl *fetchLimiter) Allow(userID string) bool {
	fl.Lock()
	defer fl.Unlock()

	now := time.Now()
	cutoff := now.Add(-1 * time.Minute)

	var valid []time.Time
	for _, t := range fl.counts[userID] {
		if t.After(cutoff) {
			valid = append(valid, t)
		}
	}

	if len(valid) >= 20 {
		fl.counts[userID] = valid
		return false
	}

	valid = append(valid, now)
	fl.counts[userID] = valid
	return true
}

// POST /api/wishlist/fetch-link  body {url}
func (h *Handler) FetchLinkMetadata(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)

	if !globalFetchLimiter.Allow(userID) {
		return ErrorResponse(c, fiber.StatusTooManyRequests, "Terlalu banyak permintaan pengambilan link (maksimal 20 per menit)")
	}

	type FetchInput struct {
		URL string `json:"url"`
	}

	var input FetchInput
	if err := c.BodyParser(&input); err != nil {
		return ErrorResponse(c, fiber.StatusBadRequest, "Format JSON tidak valid")
	}

	rawURL := strings.TrimSpace(input.URL)
	if rawURL == "" {
		return ErrorResponse(c, fiber.StatusUnprocessableEntity, "URL tidak boleh kosong")
	}

	parsedURL, err := media.ValidateURLFormat(rawURL)
	if err != nil {
		return ErrorResponse(c, fiber.StatusUnprocessableEntity, err.Error())
	}

	client := media.NewSSRFSafeHTTPClient(8*time.Second, false)
	req, err := http.NewRequestWithContext(context.Background(), "GET", parsedURL.String(), nil)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal membuat permintaan HTTP")
	}

	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
	req.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
	req.Header.Set("Accept-Language", "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7")

	resp, err := client.Do(req)
	site := media.DetectSite(rawURL)
	if err != nil {
		return c.JSON(media.LinkMetadata{
			OK:        false,
			Situs:     site,
			LinkAsli:  rawURL,
			LinkAkhir: rawURL,
			Pesan:     "Tidak bisa mengambil data otomatis dari link ini. Isi nama, harga, dan foto secara manual.",
		})
	}
	defer resp.Body.Close()

	finalURL := resp.Request.URL.String()
	site = media.DetectSite(finalURL)

	// Jika halaman diblokir atau error (403/429/login)
	if resp.StatusCode == 403 || resp.StatusCode == 429 || resp.StatusCode >= 500 {
		return c.JSON(media.LinkMetadata{
			OK:        false,
			Situs:     site,
			LinkAsli:  rawURL,
			LinkAkhir: finalURL,
			Pesan:     "Tidak bisa mengambil data otomatis dari link ini (diblokir atau butuh login). Isi nama, harga, dan foto secara manual.",
		})
	}

	// Batasi ukuran membaca HTML 2 MB
	const maxHTMLSize = 2 * 1024 * 1024
	limitedBody := io.LimitReader(resp.Body, maxHTMLSize)

	meta := media.ParseHTMLMetadata(limitedBody, rawURL, finalURL)
	return c.JSON(meta)
}

// Helper untuk menyimpan gambar olahan ke tabel wishlist_images (maks 200 per user)
func (h *Handler) saveWishlistImage(ctx context.Context, userID string, processed *media.ProcessedImage) (string, error) {
	// Cek kuota penyimpanan: maksimal 200 gambar per pengguna
	var currentCount int
	err := h.DB.QueryRowContext(ctx, "SELECT COUNT(*) FROM wishlist_images WHERE user_id = $1", userID).Scan(&currentCount)
	if err != nil {
		return "", err
	}
	if currentCount >= 200 {
		return "", fiber.NewError(fiber.StatusUnprocessableEntity, "Batas kuota penyimpanan foto tercapai (maksimal 200 gambar per akun)")
	}

	newID := uuid.New().String()
	_, err = h.DB.ExecContext(ctx, `
		INSERT INTO wishlist_images (id, user_id, content_type, data, width, height, size_bytes, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, now())
	`, newID, userID, processed.ContentType, processed.Data, processed.Width, processed.Height, processed.SizeBytes)
	if err != nil {
		return "", err
	}
	return newID, nil
}

// POST /api/wishlist/images  (multipart/form-data, field "file")
func (h *Handler) UploadWishlistImage(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)

	fileHeader, err := c.FormFile("file")
	if err != nil {
		return ErrorResponse(c, fiber.StatusBadRequest, "File gambar wajib diunggah (field 'file')")
	}

	if fileHeader.Size > 5*1024*1024 {
		return ErrorResponse(c, fiber.StatusUnprocessableEntity, "Ukuran file melebihi batas maksimal 5 MB")
	}

	file, err := fileHeader.Open()
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal membuka file yang diunggah")
	}
	defer file.Close()

	processed, err := media.ProcessAndResizeImage(file, 800)
	if err != nil {
		return ErrorResponse(c, fiber.StatusUnprocessableEntity, err.Error())
	}

	ctx := context.Background()
	imageID, err := h.saveWishlistImage(ctx, userID, processed)
	if err != nil {
		if fErr, ok := err.(*fiber.Error); ok {
			return ErrorResponse(c, fErr.Code, fErr.Message)
		}
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal menyimpan gambar: "+err.Error())
	}

	baseURL := c.BaseURL()
	jwtSecret := ""
	if h.Config != nil {
		jwtSecret = h.Config.JWTSecret
	}
	fotoURL := media.GenerateSignedImageURL(baseURL, imageID, jwtSecret, 1*time.Hour)

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"image_id":   imageID,
		"foto_url":   fotoURL,
		"width":      processed.Width,
		"height":     processed.Height,
		"size_bytes": processed.SizeBytes,
	})
}

// POST /api/wishlist/images/from-url  body {url}
func (h *Handler) UploadWishlistImageFromURL(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)

	type URLInput struct {
		URL string `json:"url"`
	}

	var input URLInput
	if err := c.BodyParser(&input); err != nil {
		return ErrorResponse(c, fiber.StatusBadRequest, "Format JSON tidak valid")
	}

	rawURL := strings.TrimSpace(input.URL)
	if rawURL == "" {
		return ErrorResponse(c, fiber.StatusUnprocessableEntity, "URL gambar tidak boleh kosong")
	}

	parsedURL, err := media.ValidateURLFormat(rawURL)
	if err != nil {
		return ErrorResponse(c, fiber.StatusUnprocessableEntity, "URL gambar tidak aman atau tidak valid: "+err.Error())
	}

	client := media.NewSSRFSafeHTTPClient(8*time.Second, false)
	req, err := http.NewRequestWithContext(context.Background(), "GET", parsedURL.String(), nil)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal menyiapkan pengunduhan gambar")
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")

	resp, err := client.Do(req)
	if err != nil {
		return ErrorResponse(c, fiber.StatusUnprocessableEntity, "Gagal mengunduh gambar dari URL: "+err.Error())
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return ErrorResponse(c, fiber.StatusUnprocessableEntity, fmt.Sprintf("Gagal mengunduh gambar, server merespons kode status %d", resp.StatusCode))
	}

	processed, err := media.ProcessAndResizeImage(resp.Body, 800)
	if err != nil {
		return ErrorResponse(c, fiber.StatusUnprocessableEntity, "Gagal memproses gambar yang diunduh: "+err.Error())
	}

	ctx := context.Background()
	imageID, err := h.saveWishlistImage(ctx, userID, processed)
	if err != nil {
		if fErr, ok := err.(*fiber.Error); ok {
			return ErrorResponse(c, fErr.Code, fErr.Message)
		}
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal menyimpan gambar: "+err.Error())
	}

	baseURL := c.BaseURL()
	jwtSecret := ""
	if h.Config != nil {
		jwtSecret = h.Config.JWTSecret
	}
	fotoURL := media.GenerateSignedImageURL(baseURL, imageID, jwtSecret, 1*time.Hour)

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"image_id":   imageID,
		"foto_url":   fotoURL,
		"width":      processed.Width,
		"height":     processed.Height,
		"size_bytes": processed.SizeBytes,
	})
}

// GET /img/wishlist/{image_id}?exp=&sig=  (Publik, URL Bertanda Tangan)
func (h *Handler) GetSignedWishlistImage(c *fiber.Ctx) error {
	imageID := c.Params("image_id")
	if _, err := uuid.Parse(imageID); err != nil {
		return ErrorResponse(c, fiber.StatusBadRequest, "Format image_id tidak valid")
	}

	exp := c.Query("exp")
	sig := c.Query("sig")
	if exp == "" || sig == "" {
		return ErrorResponse(c, fiber.StatusForbidden, "Akses gambar membutuhkan tanda tangan url (?exp=...&sig=...)")
	}

	jwtSecret := ""
	if h.Config != nil {
		jwtSecret = h.Config.JWTSecret
	}

	if !media.VerifyImageSignature(imageID, exp, sig, jwtSecret) {
		return ErrorResponse(c, fiber.StatusForbidden, "Tautan gambar tidak valid atau sudah kedaluwarsa")
	}

	var contentType string
	var data []byte
	err := h.DB.QueryRow("SELECT content_type, data FROM wishlist_images WHERE id = $1", imageID).Scan(&contentType, &data)
	if err != nil {
		if err == sql.ErrNoRows {
			return ErrorResponse(c, fiber.StatusNotFound, "Gambar tidak ditemukan")
		}
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal mengambil data gambar")
	}

	c.Set("Content-Type", contentType)
	c.Set("Cache-Control", "private, max-age=3600")
	c.Set("X-Content-Type-Options", "nosniff")
	return c.Send(data)
}

// DELETE /api/wishlist/images/:image_id
func (h *Handler) DeleteWishlistImage(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	imageID := c.Params("image_id")
	if _, err := uuid.Parse(imageID); err != nil {
		return ErrorResponse(c, fiber.StatusBadRequest, "Format image_id tidak valid")
	}

	ctx := context.Background()
	// Set image_id item terkait menjadi null
	_, _ = h.DB.ExecContext(ctx, "UPDATE wishlist_items SET image_id = NULL WHERE image_id = $1 AND user_id = $2", imageID, userID)

	res, err := h.DB.ExecContext(ctx, "DELETE FROM wishlist_images WHERE id = $1 AND user_id = $2", imageID, userID)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal menghapus gambar: "+err.Error())
	}
	rowsAffected, _ := res.RowsAffected()
	if rowsAffected == 0 {
		return ErrorResponse(c, fiber.StatusNotFound, "Gambar tidak ditemukan")
	}

	return c.JSON(fiber.Map{
		"message": "Gambar berhasil dihapus",
	})
}

// CleanOrphanImages membersihkan gambar yatim yang tidak terhubung dan berusia > 24 jam
func (h *Handler) CleanOrphanImages() (int64, error) {
	if h.DB == nil {
		return 0, nil
	}
	res, err := h.DB.Exec(`
		DELETE FROM wishlist_images
		WHERE id NOT IN (SELECT image_id FROM wishlist_items WHERE image_id IS NOT NULL)
		  AND created_at < now() - interval '24 hours'
	`)
	if err != nil {
		return 0, err
	}
	return res.RowsAffected()
}
