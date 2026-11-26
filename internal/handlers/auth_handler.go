package handlers

import (
	"database/sql"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	"kasku-backend/internal/auth"
)

type RegisterInput struct {
	Name     string `json:"name"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

type LoginInput struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type RefreshInput struct {
	RefreshToken string `json:"refresh_token"`
}

type UserResponse struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	Email string `json:"email"`
}

type AuthResponse struct {
	AccessToken  string       `json:"access_token"`
	RefreshToken string       `json:"refresh_token"`
	ExpiresIn    int64        `json:"expires_in"` // detik
	User         UserResponse `json:"user"`
}

// Register menangani POST /auth/register
func (h *Handler) Register(c *fiber.Ctx) error {
	ip := c.IP()
	if !auth.RegisterLimiter.Allow(ip, 10, time.Hour) {
		return ErrorResponse(c, fiber.StatusTooManyRequests, "Terlalu banyak permintaan registrasi. Silakan coba lagi nanti.")
	}

	if h.Config != nil && !h.Config.AllowRegistration {
		return ErrorResponse(c, fiber.StatusForbidden, "Registrasi ditutup")
	}

	var input RegisterInput
	if err := c.BodyParser(&input); err != nil {
		return ErrorResponse(c, fiber.StatusBadRequest, "Format JSON tidak valid")
	}

	name := strings.TrimSpace(input.Name)
	if name == "" {
		return ErrorResponse(c, fiber.StatusUnprocessableEntity, "Nama tidak boleh kosong")
	}

	email := strings.ToLower(strings.TrimSpace(input.Email))
	if !auth.ValidateEmail(email) {
		return ErrorResponse(c, fiber.StatusUnprocessableEntity, "Format email tidak valid")
	}

	if err := auth.ValidatePassword(input.Password); err != nil {
		return ErrorResponse(c, fiber.StatusUnprocessableEntity, err.Error())
	}

	// Cek apakah email sudah terdaftar
	var exists bool
	err := h.DB.QueryRow("SELECT true FROM users WHERE lower(email) = $1", email).Scan(&exists)
	if err == nil && exists {
		return ErrorResponse(c, fiber.StatusUnprocessableEntity, "Email sudah terdaftar")
	}

	hashedPassword, err := auth.HashPassword(input.Password)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal memproses password")
	}

	newUserID := uuid.New().String()
	now := time.Now()

	// Mulai DB transaction untuk membuat user, setting default, dan token awal
	tx, err := h.DB.Begin()
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal memulai transaksi database")
	}
	defer tx.Rollback()

	_, err = tx.Exec(`
		INSERT INTO users (id, email, name, password_hash, created_at)
		VALUES ($1, $2, $3, $4, $5)
	`, newUserID, email, name, hashedPassword, now)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal mendaftarkan user")
	}

	// Setting default opening_balance = 0
	_, err = tx.Exec(`
		INSERT INTO settings (user_id, key, value)
		VALUES ($1, 'opening_balance', '0')
		ON CONFLICT (user_id, key) DO NOTHING
	`, newUserID)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal mengatur saldo awal pengguna")
	}

	// Generate Access Token & Refresh Token
	accessTTL := 15 * time.Minute
	refreshTTL := 720 * time.Hour
	jwtSecret := "default-secret-change-in-env-file-32chars"
	if h.Config != nil {
		accessTTL = h.Config.AccessTTL
		refreshTTL = h.Config.RefreshTTL
		jwtSecret = h.Config.JWTSecret
	}

	accessToken, err := auth.GenerateAccessToken(newUserID, jwtSecret, accessTTL)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal membuat access token")
	}

	rawRefreshToken, refreshTokenHash, err := auth.GenerateRefreshToken()
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal membuat refresh token")
	}

	userAgent := c.Get("User-Agent")
	refreshExpiresAt := now.Add(refreshTTL)

	_, err = tx.Exec(`
		INSERT INTO refresh_tokens (user_id, token_hash, expires_at, revoked, created_at, user_agent)
		VALUES ($1, $2, $3, false, $4, $5)
	`, newUserID, refreshTokenHash, refreshExpiresAt, now, userAgent)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal menyimpan refresh token")
	}

	if err := tx.Commit(); err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal menyelesaikan proses registrasi")
	}

	auth.RegisterLimiter.RecordFailure(ip, time.Hour)

	return c.Status(fiber.StatusCreated).JSON(AuthResponse{
		AccessToken:  accessToken,
		RefreshToken: rawRefreshToken,
		ExpiresIn:    int64(accessTTL.Seconds()),
		User: UserResponse{
			ID:    newUserID,
			Name:  name,
			Email: email,
		},
	})
}

// Login menangani POST /auth/login
func (h *Handler) Login(c *fiber.Ctx) error {
	var input LoginInput
	if err := c.BodyParser(&input); err != nil {
		return ErrorResponse(c, fiber.StatusBadRequest, "Format JSON tidak valid")
	}

	ip := c.IP()
	email := strings.ToLower(strings.TrimSpace(input.Email))
	rateKey := ip + ":" + email

	if !auth.LoginLimiter.Allow(rateKey, 5, 15*time.Minute) {
		return ErrorResponse(c, fiber.StatusTooManyRequests, "Terlalu banyak percobaan login yang gagal. Silakan coba lagi setelah 15 menit.")
	}

	var userID, name, passwordHash string
	err := h.DB.QueryRow("SELECT id, name, password_hash FROM users WHERE lower(email) = $1", email).Scan(&userID, &name, &passwordHash)
	if err != nil {
		if err == sql.ErrNoRows {
			// Cegah timing attack dengan tetap menjalankan bcrypt compare
			_ = auth.CheckPassword(auth.DummyBcryptHash, input.Password)
			auth.LoginLimiter.RecordFailure(rateKey, 15*time.Minute)
			return ErrorResponse(c, fiber.StatusUnauthorized, "Email atau password salah")
		}
		return ErrorResponse(c, fiber.StatusInternalServerError, "Terjadi kesalahan pada server")
	}

	if !auth.CheckPassword(passwordHash, input.Password) {
		auth.LoginLimiter.RecordFailure(rateKey, 15*time.Minute)
		return ErrorResponse(c, fiber.StatusUnauthorized, "Email atau password salah")
	}

	// Login berhasil, reset catatan kegagalan rate limit
	auth.LoginLimiter.Reset(rateKey)

	accessTTL := 15 * time.Minute
	refreshTTL := 720 * time.Hour
	jwtSecret := "default-secret-change-in-env-file-32chars"
	if h.Config != nil {
		accessTTL = h.Config.AccessTTL
		refreshTTL = h.Config.RefreshTTL
		jwtSecret = h.Config.JWTSecret
	}

	accessToken, err := auth.GenerateAccessToken(userID, jwtSecret, accessTTL)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal membuat access token")
	}

	rawRefreshToken, refreshTokenHash, err := auth.GenerateRefreshToken()
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal membuat refresh token")
	}

	userAgent := c.Get("User-Agent")
	now := time.Now()
	refreshExpiresAt := now.Add(refreshTTL)

	_, err = h.DB.Exec(`
		INSERT INTO refresh_tokens (user_id, token_hash, expires_at, revoked, created_at, user_agent)
		VALUES ($1, $2, $3, false, $4, $5)
	`, userID, refreshTokenHash, refreshExpiresAt, now, userAgent)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal menyimpan refresh token")
	}

	return c.JSON(AuthResponse{
		AccessToken:  accessToken,
		RefreshToken: rawRefreshToken,
		ExpiresIn:    int64(accessTTL.Seconds()),
		User: UserResponse{
			ID:    userID,
			Name:  name,
			Email: email,
		},
	})
}

// RefreshToken menangani POST /auth/refresh
func (h *Handler) RefreshToken(c *fiber.Ctx) error {
	var input RefreshInput
	if err := c.BodyParser(&input); err != nil {
		return ErrorResponse(c, fiber.StatusBadRequest, "Format JSON tidak valid")
	}

	rawToken := strings.TrimSpace(input.RefreshToken)
	if rawToken == "" {
		return ErrorResponse(c, fiber.StatusBadRequest, "Refresh token wajib disediakan")
	}

	tokenHash := auth.HashToken(rawToken)

	var tokenID, userID string
	var expiresAt time.Time
	var revoked bool

	err := h.DB.QueryRow(`
		SELECT id, user_id, expires_at, revoked 
		FROM refresh_tokens 
		WHERE token_hash = $1
	`, tokenHash).Scan(&tokenID, &userID, &expiresAt, &revoked)

	if err != nil {
		if err == sql.ErrNoRows {
			return ErrorResponse(c, fiber.StatusUnauthorized, "Refresh token tidak valid atau telah kedaluwarsa")
		}
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal memverifikasi refresh token")
	}

	// Deteksi Token Reuse: jika token yang sudah dicabut digunakan kembali, cabut SEMUA token user ini
	if revoked {
		_, _ = h.DB.Exec("UPDATE refresh_tokens SET revoked = true WHERE user_id = $1", userID)
		return ErrorResponse(c, fiber.StatusUnauthorized, "Sesi tidak valid terdeteksi, semua sesi telah dicabut. Silakan login kembali")
	}

	if time.Now().After(expiresAt) {
		return ErrorResponse(c, fiber.StatusUnauthorized, "Refresh token telah kedaluwarsa, silakan login lagi")
	}

	// Ambil data user
	var name, email string
	err = h.DB.QueryRow("SELECT name, email FROM users WHERE id = $1", userID).Scan(&name, &email)
	if err != nil {
		return ErrorResponse(c, fiber.StatusUnauthorized, "Pengguna tidak ditemukan")
	}

	// Rotasi: cabut refresh token lama, terbitkan pasangan token baru dalam transaksi DB
	tx, err := h.DB.Begin()
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal memulai transaksi database")
	}
	defer tx.Rollback()

	_, err = tx.Exec("UPDATE refresh_tokens SET revoked = true WHERE id = $1", tokenID)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal mencabut refresh token lama")
	}

	accessTTL := 15 * time.Minute
	refreshTTL := 720 * time.Hour
	jwtSecret := "default-secret-change-in-env-file-32chars"
	if h.Config != nil {
		accessTTL = h.Config.AccessTTL
		refreshTTL = h.Config.RefreshTTL
		jwtSecret = h.Config.JWTSecret
	}

	newAccessToken, err := auth.GenerateAccessToken(userID, jwtSecret, accessTTL)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal membuat access token baru")
	}

	newRawRefreshToken, newRefreshTokenHash, err := auth.GenerateRefreshToken()
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal membuat refresh token baru")
	}

	now := time.Now()
	newExpiresAt := now.Add(refreshTTL)
	userAgent := c.Get("User-Agent")

	_, err = tx.Exec(`
		INSERT INTO refresh_tokens (user_id, token_hash, expires_at, revoked, created_at, user_agent)
		VALUES ($1, $2, $3, false, $4, $5)
	`, userID, newRefreshTokenHash, newExpiresAt, now, userAgent)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal menyimpan refresh token baru")
	}

	if err := tx.Commit(); err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal menyelesaikan rotasi token")
	}

	return c.JSON(AuthResponse{
		AccessToken:  newAccessToken,
		RefreshToken: newRawRefreshToken,
		ExpiresIn:    int64(accessTTL.Seconds()),
		User: UserResponse{
			ID:    userID,
			Name:  name,
			Email: email,
		},
	})
}

// Logout menangani POST /auth/logout (cabut token tersebut)
func (h *Handler) Logout(c *fiber.Ctx) error {
	var input RefreshInput
	if err := c.BodyParser(&input); err != nil {
		return ErrorResponse(c, fiber.StatusBadRequest, "Format JSON tidak valid")
	}

	rawToken := strings.TrimSpace(input.RefreshToken)
	if rawToken != "" {
		tokenHash := auth.HashToken(rawToken)
		_, _ = h.DB.Exec("UPDATE refresh_tokens SET revoked = true WHERE token_hash = $1", tokenHash)
	}

	return c.JSON(fiber.Map{
		"message": "Berhasil logout",
	})
}
