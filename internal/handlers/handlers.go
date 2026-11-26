package handlers

import (
	"database/sql"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
)

type Handler struct {
	DB *sql.DB
}

func NewHandler(db *sql.DB) *Handler {
	return &Handler{DB: db}
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

// GetOpeningBalance mengambil saldo awal dari settings
func (h *Handler) GetOpeningBalance() (int64, error) {
	var valStr string
	err := h.DB.QueryRow("SELECT value FROM settings WHERE key = 'opening_balance'").Scan(&valStr)
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
