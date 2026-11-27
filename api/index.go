package handler

import (
	"net/http"
	"sync"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/adaptor"

	"kasku-backend/internal/app"
)

var (
	initOnce   sync.Once
	cachedApp  *fiber.App
	initErr    error
	httpBridge http.HandlerFunc
)

// Handler menangani seluruh request Vercel Serverless Functions menuju Fiber app KasKu
func Handler(w http.ResponseWriter, r *http.Request) {
	initOnce.Do(func() {
		fiberApp, _, _, _, err := app.NewApp()
		if err != nil {
			initErr = err
			return
		}
		cachedApp = fiberApp
		httpBridge = adaptor.FiberApp(cachedApp)
	})

	if initErr != nil {
		http.Error(w, "Konfigurasi backend gagal: "+initErr.Error(), http.StatusInternalServerError)
		return
	}

	httpBridge(w, r)
}
