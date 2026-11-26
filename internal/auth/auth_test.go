package auth_test

import (
	"testing"
	"time"

	"kasku-backend/internal/auth"
)

func TestPasswordHashingAndVerification(t *testing.T) {
	plain := "RahasiaKu123"
	hash, err := auth.HashPassword(plain)
	if err != nil {
		t.Fatalf("Gagal menghasilkan hash password: %v", err)
	}

	if hash == plain {
		t.Error("Password tidak boleh disimpan dalam bentuk teks polos")
	}

	if !auth.CheckPassword(hash, plain) {
		t.Error("Verifikasi password valid harus menghasilkan true")
	}

	if auth.CheckPassword(hash, "PasswordSalah123") {
		t.Error("Verifikasi password salah harus menghasilkan false")
	}
}

func TestPasswordValidation(t *testing.T) {
	// Password valid
	if err := auth.ValidatePassword("Katasandi1"); err != nil {
		t.Errorf("Password 'Katasandi1' seharusnya valid, tapi error: %v", err)
	}

	// Password terlalu pendek (< 8)
	if err := auth.ValidatePassword("Kata1"); err == nil {
		t.Error("Password kurang dari 8 karakter harus ditolak")
	}

	// Password hanya huruf (tanpa angka)
	if err := auth.ValidatePassword("Katasandisaja"); err == nil {
		t.Error("Password tanpa angka harus ditolak")
	}

	// Password hanya angka (tanpa huruf)
	if err := auth.ValidatePassword("123456789"); err == nil {
		t.Error("Password tanpa huruf harus ditolak")
	}
}

func TestEmailValidation(t *testing.T) {
	validEmails := []string{
		"user@example.com",
		"afriza.dwi@domain.co.id",
		"test+label@gmail.com",
	}
	for _, em := range validEmails {
		if !auth.ValidateEmail(em) {
			t.Errorf("Email '%s' seharusnya valid", em)
		}
	}

	invalidEmails := []string{
		"invalid-email",
		"user@",
		"@domain.com",
		"user@domain",
		"",
	}
	for _, em := range invalidEmails {
		if auth.ValidateEmail(em) {
			t.Errorf("Email '%s' seharusnya tidak valid", em)
		}
	}
}

func TestTokenGenerationAndValidation(t *testing.T) {
	secret := "kasku_jwt_secret_key_minimum_32_characters_random_string"
	userID := "user-uuid-123456"

	// 1. Access Token
	token, err := auth.GenerateAccessToken(userID, secret, 15*time.Minute)
	if err != nil {
		t.Fatalf("Gagal membuat access token: %v", err)
	}

	parsedID, err := auth.ValidateAccessToken(token, secret)
	if err != nil {
		t.Fatalf("Gagal memvalidasi access token: %v", err)
	}
	if parsedID != userID {
		t.Errorf("Ekspektasi user_id %s, didapat %s", userID, parsedID)
	}

	// 2. Refresh Token
	rawToken, tokenHash, err := auth.GenerateRefreshToken()
	if err != nil {
		t.Fatalf("Gagal membuat refresh token: %v", err)
	}
	if rawToken == "" || tokenHash == "" {
		t.Error("Refresh token dan hash tidak boleh kosong")
	}

	// Pastikan HashToken deterministik
	if auth.HashToken(rawToken) != tokenHash {
		t.Error("HashToken harus menghasilkan hash SHA-256 yang identik")
	}
}

func TestRateLimiter(t *testing.T) {
	limiter := auth.NewRateLimiter()
	key := "127.0.0.1:test@example.com"

	// Boleh 5x
	for i := 0; i < 5; i++ {
		if !limiter.Allow(key, 5, 100*time.Millisecond) {
			t.Errorf("Percobaan ke-%d seharusnya diizinkan", i+1)
		}
		limiter.RecordFailure(key, 100*time.Millisecond)
	}

	// Percobaan ke-6 harus ditolak
	if limiter.Allow(key, 5, 100*time.Millisecond) {
		t.Error("Percobaan setelah batas maksimal harus ditolak")
	}

	// Reset
	limiter.Reset(key)
	if !limiter.Allow(key, 5, 100*time.Millisecond) {
		t.Error("Setelah reset, seharusnya diizinkan kembali")
	}
}
