package media

import (
	"bytes"
	"errors"
	"image"
	_ "image/gif"
	"image/jpeg"
	_ "image/png"
	"io"
	"net/http"

	"golang.org/x/image/draw"
	_ "golang.org/x/image/webp"
)

var (
	ErrUnsupportedFormat = errors.New("format file tidak didukung (hanya JPEG, PNG, dan WebP yang diizinkan)")
	ErrFileTooLarge      = errors.New("ukuran file melebihi batas maksimal 5 MB")
)

type ProcessedImage struct {
	Data        []byte
	ContentType string
	Width       int
	Height      int
	SizeBytes   int
}

// ValidateAndDetectFormat memeriksa magic bytes
func ValidateAndDetectFormat(data []byte) (string, error) {
	if len(data) == 0 {
		return "", errors.New("data file gambar kosong")
	}

	contentType := http.DetectContentType(data)
	switch contentType {
	case "image/jpeg", "image/png", "image/webp":
		return contentType, nil
	}

	// Cek header webp khusus jika detectContentType gagal
	if len(data) >= 12 && string(data[0:4]) == "RIFF" && string(data[8:12]) == "WEBP" {
		return "image/webp", nil
	}

	return "", ErrUnsupportedFormat
}

// ProcessAndResizeImage mendecode gambar, memperkecil sisi terpanjang ke maxDimension (misal 800px), dan encode ke JPEG quality 80
func ProcessAndResizeImage(r io.Reader, maxDimension int) (*ProcessedImage, error) {
	// Batasi pembacaan maksimal 5MB + buffer ekstra
	const maxUploadSize = 5 * 1024 * 1024
	limitedReader := io.LimitReader(r, maxUploadSize+1)

	buf := new(bytes.Buffer)
	n, err := io.Copy(buf, limitedReader)
	if err != nil {
		return nil, errors.New("gagal membaca data gambar: " + err.Error())
	}
	if n > maxUploadSize {
		return nil, ErrFileTooLarge
	}

	rawBytes := buf.Bytes()
	_, err = ValidateAndDetectFormat(rawBytes)
	if err != nil {
		return nil, err
	}

	// Decode image (otomatis membuang EXIF saat di-encode ulang)
	srcImg, _, err := image.Decode(bytes.NewReader(rawBytes))
	if err != nil {
		return nil, errors.New("gagal memproses dan membaca isi gambar: " + err.Error())
	}

	bounds := srcImg.Bounds()
	origWidth := bounds.Dx()
	origHeight := bounds.Dy()

	if origWidth <= 0 || origHeight <= 0 {
		return nil, errors.New("dimensi gambar tidak valid")
	}

	targetWidth := origWidth
	targetHeight := origHeight

	// Hitung rasio aspek jika dimensi lebih besar dari maxDimension
	if maxDimension > 0 && (origWidth > maxDimension || origHeight > maxDimension) {
		if origWidth >= origHeight {
			targetWidth = maxDimension
			targetHeight = int(float64(origHeight) * float64(maxDimension) / float64(origWidth))
		} else {
			targetHeight = maxDimension
			targetWidth = int(float64(origWidth) * float64(maxDimension) / float64(origHeight))
		}
		if targetWidth < 1 {
			targetWidth = 1
		}
		if targetHeight < 1 {
			targetHeight = 1
		}
	}

	var dstImg image.Image
	if targetWidth == origWidth && targetHeight == origHeight {
		dstImg = srcImg
	} else {
		resized := image.NewRGBA(image.Rect(0, 0, targetWidth, targetHeight))
		draw.BiLinear.Scale(resized, resized.Bounds(), srcImg, srcImg.Bounds(), draw.Over, nil)
		dstImg = resized
	}

	// Encode ke JPEG kualitas 80
	outBuf := new(bytes.Buffer)
	opts := &jpeg.Options{Quality: 80}
	if err := jpeg.Encode(outBuf, dstImg, opts); err != nil {
		return nil, errors.New("gagal mengompresi gambar ke JPEG: " + err.Error())
	}

	outBytes := outBuf.Bytes()
	return &ProcessedImage{
		Data:        outBytes,
		ContentType: "image/jpeg",
		Width:       targetWidth,
		Height:      targetHeight,
		SizeBytes:   len(outBytes),
	}, nil
}
