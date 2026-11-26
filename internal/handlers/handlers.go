package handlers

import (
	"database/sql"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"

	"kasku-backend/internal/config"
)

type Handler struct {
	DB     *sql.DB
	Config *config.Config
}

func NewHandler(db *sql.DB, cfg *config.Config) *Handler {
	return &Handler{
		DB:     db,
		Config: cfg,
	}
}

// ErrorResponse mengirim format standar JSON error
func ErrorResponse(c *fiber.Ctx, statusCode int, message string) error {
	return c.Status(statusCode).JSON(fiber.Map{
		"error": message,
	})
}

// ParseDate parsing string YYYY-MM-DD ke time.Time
func ParseDate(dateStr string) (time.Time, error) {
	return time.Parse("2006-01-02", strings.TrimSpace(dateStr))
}

// GetOpeningBalance mengambil saldo awal dari settings untuk user_id tertentu
func (h *Handler) GetOpeningBalance(userID string) (int64, error) {
	if h.DB == nil {
		return 0, nil
	}
	var valStr string
	err := h.DB.QueryRow("SELECT value FROM settings WHERE user_id = $1 AND key = 'opening_balance'", userID).Scan(&valStr)
	if err != nil {
		if err == sql.ErrNoRows {
			return 0, nil
		}
		return 0, err
	}
	val, err := strconv.ParseInt(strings.TrimSpace(valStr), 10, 64)
	if err != nil {
		return 0, nil
	}
	return val, nil
}
