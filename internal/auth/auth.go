package auth

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"net/mail"
	"strings"
	"time"
	"unicode"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

// Dummy hash untuk mencegah timing attack saat email tidak ditemukan
var DummyBcryptHash string

func init() {
	h, err := bcrypt.GenerateFromPassword([]byte("dummy-kasku-pwd-timing-mitigation"), 12)
	if err == nil {
		DummyBcryptHash = string(h)
	}
}

// HashPassword mengenkripsi password dengan bcrypt cost 12
func HashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), 12)
	return string(bytes), err
}

// CheckPassword membandingkan hash dan plaintext password
func CheckPassword(hash, password string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	return err == nil
}

// ValidatePassword memeriksa panjang minimal 8 karakter, serta harus mengandung huruf dan angka
func ValidatePassword(password string) error {
	if len(password) < 8 {
		return errors.New("Password minimal 8 karakter")
	}

	var hasLetter, hasDigit bool
	for _, c := range password {
		if unicode.IsLetter(c) {
			hasLetter = true
		} else if unicode.IsDigit(c) {
			hasDigit = true
		}
	}

	if !hasLetter || !hasDigit {
		return errors.New("Password wajib mengandung kombinasi huruf dan angka")
	}

	return nil
}

// ValidateEmail memeriksa format email
func ValidateEmail(email string) bool {
	cleanEmail := strings.TrimSpace(email)
	if cleanEmail == "" {
		return false
	}
	addr, err := mail.ParseAddress(cleanEmail)
	return err == nil && addr.Address == cleanEmail && strings.Contains(cleanEmail, ".")
}

// HashToken menghasilkan SHA-256 string heksadesimal dari token
func HashToken(token string) string {
	h := sha256.Sum256([]byte(token))
	return hex.EncodeToString(h[:])
}

// GenerateRefreshToken menghasilkan random string aman dan hash SHA-256-nya
func GenerateRefreshToken() (string, string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", "", fmt.Errorf("gagal menghasilkan token acak: %w", err)
	}
	rawToken := hex.EncodeToString(b)
	tokenHash := HashToken(rawToken)
	return rawToken, tokenHash, nil
}

type JWTClaims struct {
	UserID string `json:"user_id"`
	jwt.RegisteredClaims
}

// GenerateAccessToken menghasilkan JWT access token bertanda tangan HS256
func GenerateAccessToken(userID string, secret string, ttl time.Duration) (string, error) {
	now := time.Now()
	claims := JWTClaims{
		UserID: userID,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   userID,
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(ttl)),
			Issuer:    "kasku-api",
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}

// ValidateAccessToken memvalidasi JWT access token dan mengembalikan user_id
func ValidateAccessToken(tokenStr string, secret string) (string, error) {
	token, err := jwt.ParseWithClaims(tokenStr, &JWTClaims{}, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("metode signing tidak terduga: %v", t.Header["alg"])
		}
		return []byte(secret), nil
	})

	if err != nil {
		return "", err
	}

	claims, ok := token.Claims.(*JWTClaims)
	if !ok || !token.Valid {
		return "", errors.New("Token JWT tidak valid")
	}

	return claims.UserID, nil
}
