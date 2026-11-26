package auth

import (
	"sync"
	"time"
)

type rateRecord struct {
	count     int
	resetTime time.Time
}

type RateLimiter struct {
	mu      sync.Mutex
	records map[string]*rateRecord
}

var (
	// Limiter untuk login: maks 5 percobaan gagal per 15 menit per IP + email
	LoginLimiter = NewRateLimiter()
	// Limiter untuk registrasi: maks 10 registrasi per jam per IP
	RegisterLimiter = NewRateLimiter()
)

func NewRateLimiter() *RateLimiter {
	rl := &RateLimiter{
		records: make(map[string]*rateRecord),
	}
	// Background cleanup routine
	go rl.cleanupRoutine()
	return rl
}

func (rl *RateLimiter) cleanupRoutine() {
	ticker := time.NewTicker(5 * time.Minute)
	for range ticker.C {
		rl.mu.Lock()
		now := time.Now()
		for k, v := range rl.records {
			if now.After(v.resetTime) {
				delete(rl.records, k)
			}
		}
		rl.mu.Unlock()
	}
}

// Allow memeriksa apakah key masih dalam batas limit
func (rl *RateLimiter) Allow(key string, maxAttempts int, window time.Duration) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()
	rec, exists := rl.records[key]
	if !exists || now.After(rec.resetTime) {
		return true
	}

	return rec.count < maxAttempts
}

// RecordFailure mencatat percobaan gagal untuk key
func (rl *RateLimiter) RecordFailure(key string, window time.Duration) {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()
	rec, exists := rl.records[key]
	if !exists || now.After(rec.resetTime) {
		rl.records[key] = &rateRecord{
			count:     1,
			resetTime: now.Add(window),
		}
		return
	}

	rec.count++
}

// Reset menghapus catatan rate limit (misalnya saat login berhasil)
func (rl *RateLimiter) Reset(key string) {
	rl.mu.Lock()
	defer rl.mu.Unlock()
	delete(rl.records, key)
}
