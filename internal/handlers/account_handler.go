package handlers

import (
	"database/sql"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"

	"kasku-backend/internal/auth"
	"kasku-backend/internal/middleware"
)

type UpdateMeInput struct {
	Name string `json:"name"`
}

type ChangePasswordInput struct {
	OldPassword string `json:"old_password"`
	NewPassword string `json:"new_password"`
}

type DeleteMeInput struct {
	Password string `json:"password"`
}

// GetMe menangani GET /api/me
func (h *Handler) GetMe(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)

	var id, name, email string
	var createdAt time.Time
	err := h.DB.QueryRow("SELECT id, name, email, created_at FROM users WHERE id = $1", userID).Scan(&id, &name, &email, &createdAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return ErrorResponse(c, fiber.StatusNotFound, "Pengguna tidak ditemukan")
		}
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal mengambil data akun")
	}

	return c.JSON(fiber.Map{
		"id":         id,
		"name":       name,
		"email":      email,
		"created_at": createdAt,
	})
}

// UpdateMe menangani PUT /api/me
func (h *Handler) UpdateMe(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)

	var input UpdateMeInput
	if err := c.BodyParser(&input); err != nil {
		return ErrorResponse(c, fiber.StatusBadRequest, "Format JSON tidak valid")
	}

	name := strings.TrimSpace(input.Name)
	if name == "" {
		return ErrorResponse(c, fiber.StatusUnprocessableEntity, "Nama tidak boleh kosong")
	}

	result, err := h.DB.Exec("UPDATE users SET name = $1 WHERE id = $2", name, userID)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal memperbarui profil")
	}

	rows, _ := result.RowsAffected()
	if rows == 0 {
		return ErrorResponse(c, fiber.StatusNotFound, "Pengguna tidak ditemukan")
	}

	var email string
	_ = h.DB.QueryRow("SELECT email FROM users WHERE id = $1", userID).Scan(&email)

	return c.JSON(fiber.Map{
		"message": "Profil berhasil diperbarui",
		"user": fiber.Map{
			"id":    userID,
			"name":  name,
			"email": email,
		},
	})
}

// ChangePassword menangani PUT /api/me/password
// Cabut semua refresh token user setelah password berhasil diubah
func (h *Handler) ChangePassword(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)

	var input ChangePasswordInput
	if err := c.BodyParser(&input); err != nil {
		return ErrorResponse(c, fiber.StatusBadRequest, "Format JSON tidak valid")
	}

	var currentHash string
	err := h.DB.QueryRow("SELECT password_hash FROM users WHERE id = $1", userID).Scan(&currentHash)
	if err != nil {
		if err == sql.ErrNoRows {
			return ErrorResponse(c, fiber.StatusNotFound, "Pengguna tidak ditemukan")
		}
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal memverifikasi akun")
	}

	if !auth.CheckPassword(currentHash, input.OldPassword) {
		return ErrorResponse(c, fiber.StatusUnprocessableEntity, "Password lama salah")
	}

	if err := auth.ValidatePassword(input.NewPassword); err != nil {
		return ErrorResponse(c, fiber.StatusUnprocessableEntity, err.Error())
	}

	newHashed, err := auth.HashPassword(input.NewPassword)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal memproses password baru")
	}

	tx, err := h.DB.Begin()
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal memulai transaksi database")
	}
	defer tx.Rollback()

	_, err = tx.Exec("UPDATE users SET password_hash = $1 WHERE id = $2", newHashed, userID)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal memperbarui password")
	}

	// Cabut semua refresh token milik user ini
	_, err = tx.Exec("UPDATE refresh_tokens SET revoked = true WHERE user_id = $1", userID)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal mencabut sesi login aktif")
	}

	if err := tx.Commit(); err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal menyelesaikan perubahan password")
	}

	return c.JSON(fiber.Map{
		"message": "Password berhasil diubah. Semua sesi login lain telah dicabut.",
	})
}

// DeleteMe menangani DELETE /api/me (hapus akun dan seluruh datanya secara cascade)
func (h *Handler) DeleteMe(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)

	var input DeleteMeInput
	if err := c.BodyParser(&input); err != nil {
		return ErrorResponse(c, fiber.StatusBadRequest, "Format JSON tidak valid")
	}

	var currentHash string
	err := h.DB.QueryRow("SELECT password_hash FROM users WHERE id = $1", userID).Scan(&currentHash)
	if err != nil {
		if err == sql.ErrNoRows {
			return ErrorResponse(c, fiber.StatusNotFound, "Pengguna tidak ditemukan")
		}
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal memverifikasi akun")
	}

	if !auth.CheckPassword(currentHash, input.Password) {
		return ErrorResponse(c, fiber.StatusUnprocessableEntity, "Password salah")
	}

	// Hapus user; seluruh transaksi, item, langganan, tagihan, token akan cascade terhapus
	_, err = h.DB.Exec("DELETE FROM users WHERE id = $1", userID)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal menghapus akun dan data")
	}

	return c.JSON(fiber.Map{
		"message": "Akun dan seluruh data Anda telah berhasil dihapus",
	})
}

// LogoutAll menangani POST /api/me/logout-all (cabut semua refresh token)
func (h *Handler) LogoutAll(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)

	_, err := h.DB.Exec("UPDATE refresh_tokens SET revoked = true WHERE user_id = $1", userID)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal mencabut seluruh sesi login")
	}

	return c.JSON(fiber.Map{
		"message": "Semua sesi login berhasil dicabut",
	})
}
