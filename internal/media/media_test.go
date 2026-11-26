package media_test

import (
	"bytes"
	"image"
	"image/color"
	"image/jpeg"
	"image/png"
	"net/http"
	"strings"
	"testing"
	"time"

	"kasku-backend/internal/media"
)

func TestMetadataParser(t *testing.T) {
	// 1. Uji JSON-LD Product
	htmlJSONLD := `
	<!DOCTYPE html>
	<html>
	<head>
		<title>Halaman Produk Dummy</title>
		<script type="application/ld+json">
		{
			"@context": "https://schema.org/",
			"@type": "Product",
			"name": "Headset Gaming Stereo Bass",
			"image": "https://images.tokopedia.net/img/dummy.jpg",
			"offers": {
				"@type": "Offer",
				"priceCurrency": "IDR",
				"price": "1250000.00"
			}
		}
		</script>
	</head>
	<body></body>
	</html>
	`

	meta1 := media.ParseHTMLMetadata(strings.NewReader(htmlJSONLD), "https://tokopedia.com/item/123", "https://tokopedia.com/item/123")
	if !meta1.OK {
		t.Fatalf("Ekspektasi parser JSON-LD sukses, didapat pesan: %s", meta1.Pesan)
	}
	if meta1.Nama != "Headset Gaming Stereo Bass" {
		t.Errorf("Nama salah: %s", meta1.Nama)
	}
	if meta1.Harga == nil || *meta1.Harga != 1250000 {
		t.Errorf("Harga salah: %v", meta1.Harga)
	}
	if meta1.GambarKandidat != "https://images.tokopedia.net/img/dummy.jpg" {
		t.Errorf("Gambar salah: %s", meta1.GambarKandidat)
	}
	if meta1.Situs != "tokopedia" {
		t.Errorf("Situs salah: %s", meta1.Situs)
	}

	// 2. Uji Open Graph Fallback
	htmlOG := `
	<!DOCTYPE html>
	<html>
	<head>
		<meta property="og:title" content="Mouse Wireless Murah &amp; Bagus" />
		<meta property="og:image" content="https://cf.shopee.co.id/file/sample.png" />
		<meta property="og:price:amount" content="Rp 85.000" />
	</head>
	<body></body>
	</html>
	`
	meta2 := media.ParseHTMLMetadata(strings.NewReader(htmlOG), "https://s.shopee.co.id/xyz", "https://shopee.co.id/product/123")
	if !meta2.OK {
		t.Fatalf("Ekspektasi parser OG sukses")
	}
	if meta2.Nama != "Mouse Wireless Murah & Bagus" {
		t.Errorf("Nama OG salah: %s", meta2.Nama)
	}
	if meta2.Harga == nil || *meta2.Harga != 85000 {
		t.Errorf("Harga OG salah: %v", meta2.Harga)
	}
	if meta2.Situs != "shopee" {
		t.Errorf("Situs OG salah: %s", meta2.Situs)
	}

	// 3. Normalisasi Harga
	prices := map[string]*int64{
		"Rp 1.250.000": func(v int64) *int64 { return &v }(1250000),
		"1250000.00":   func(v int64) *int64 { return &v }(1250000),
		"IDR 85,000":   func(v int64) *int64 { return &v }(85000),
		"USD 100":      nil,
		"Gratis":       nil,
	}
	for raw, expected := range prices {
		res := media.NormalizePriceRupiah(raw)
		if expected == nil {
			if res != nil {
				t.Errorf("Ekspektasi nil untuk '%s', didapat %v", raw, *res)
			}
		} else {
			if res == nil || *res != *expected {
				t.Errorf("Ekspektasi %d untuk '%s', didapat %v", *expected, raw, res)
			}
		}
	}
}

func TestSSRFProtection(t *testing.T) {
	// Tes validasi URL lokal / privat yang harus ditolak
	blockedURLs := []string{
		"http://127.0.0.1:8080/test",
		"http://localhost:8080/test",
		"http://169.254.169.254/latest/meta-data/",
		"http://10.0.0.1/admin",
		"http://192.168.1.1/",
		"http://172.16.0.1/",
		"http://0.0.0.0/",
		"http://user:pass@example.com/",
		"ftp://example.com/file",
		"http://example.com:8080/",
	}

	for _, u := range blockedURLs {
		_, err := media.ValidateURLFormat(u)
		if err == nil {
			t.Errorf("URL berbahaya '%s' seharusnya ditolak oleh ValidateURLFormat", u)
		}
	}

	// Tes client SSRF-safe menolak target privat
	client := media.NewSSRFSafeHTTPClient(2*time.Second, false)
	req, _ := http.NewRequest("GET", "http://127.0.0.1:80/", nil)
	_, err := client.Do(req)
	if err == nil {
		t.Errorf("Request ke 127.0.0.1 seharusnya diblokir oleh client SSRF")
	}
}

func TestImageProcessingAndResizing(t *testing.T) {
	// Buat gambar PNG buatan berukuran 1200x600 (sisi terpanjang 1200 > 800)
	img := image.NewRGBA(image.Rect(0, 0, 1200, 600))
	for x := 0; x < 1200; x++ {
		for y := 0; y < 600; y++ {
			img.Set(x, y, color.RGBA{R: 255, G: 0, B: 0, A: 255})
		}
	}

	buf := new(bytes.Buffer)
	if err := png.Encode(buf, img); err != nil {
		t.Fatalf("Gagal encode dummy PNG: %v", err)
	}

	// 1. Uji resize sisi terpanjang ke 800
	processed, err := media.ProcessAndResizeImage(buf, 800)
	if err != nil {
		t.Fatalf("Gagal memproses gambar: %v", err)
	}

	if processed.Width != 800 || processed.Height != 400 {
		t.Errorf("Ekspektasi dimensi 800x400, didapat %dx%d", processed.Width, processed.Height)
	}
	if processed.ContentType != "image/jpeg" {
		t.Errorf("Ekspektasi content-type image/jpeg, didapat %s", processed.ContentType)
	}

	// Verifikasi hasil decode adalah JPEG valid
	decodedJPEG, err := jpeg.Decode(bytes.NewReader(processed.Data))
	if err != nil {
		t.Fatalf("Hasil olahan bukan JPEG yang valid: %v", err)
	}
	if decodedJPEG.Bounds().Dx() != 800 {
		t.Errorf("Ekspektasi lebar JPEG 800, didapat %d", decodedJPEG.Bounds().Dx())
	}

	// 2. Uji penolakan file palsu (bukan gambar)
	fakeImg := bytes.NewReader([]byte("bukan gambar beneran tapi teks biasa"))
	_, err = media.ProcessAndResizeImage(fakeImg, 800)
	if err == nil {
		t.Errorf("File palsu harus ditolak")
	}
}

func TestSignedImageURL(t *testing.T) {
	secret := "supersecretjwtkeythatisover32characterslong123456"
	imageID := "123e4567-e89b-12d3-a456-426614174000"

	urlStr := media.GenerateSignedImageURL("http://localhost:8080", imageID, secret, 1*time.Hour)
	if !strings.Contains(urlStr, "/img/wishlist/"+imageID) {
		t.Errorf("URL tidak memuat path gambar yang benar: %s", urlStr)
	}

	// Ekstrak exp dan sig dari URL
	parts := strings.Split(urlStr, "?")
	if len(parts) != 2 {
		t.Fatalf("Format URL salah: %s", urlStr)
	}
	params := strings.Split(parts[1], "&")
	var exp, sig string
	for _, p := range params {
		kv := strings.Split(p, "=")
		if kv[0] == "exp" {
			exp = kv[1]
		} else if kv[0] == "sig" {
			sig = kv[1]
		}
	}

	// 1. Verifikasi benar
	if !media.VerifyImageSignature(imageID, exp, sig, secret) {
		t.Errorf("Tanda tangan valid harus diverifikasi true")
	}

	// 2. Signature salah
	if media.VerifyImageSignature(imageID, exp, "sig_palsu_123", secret) {
		t.Errorf("Signature salah harus ditolak")
	}

	// 3. Kedaluwarsa
	pastExp := "1000000000" // tahun 2001
	if media.VerifyImageSignature(imageID, pastExp, sig, secret) {
		t.Errorf("Signature kedaluwarsa harus ditolak")
	}
}
