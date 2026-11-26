package media

import (
	"encoding/json"
	"fmt"
	"html"
	"io"
	"net/url"
	"regexp"
	"strconv"
	"strings"

	golangnethtml "golang.org/x/net/html"
)

type LinkMetadata struct {
	OK             bool   `json:"ok"`
	Situs          string `json:"situs"`
	LinkAsli       string `json:"link_asli"`
	LinkAkhir      string `json:"link_akhir"`
	Nama           string `json:"nama"`
	Harga          *int64 `json:"harga"`
	GambarKandidat string `json:"gambar_kandidat"`
	Pesan          string `json:"pesan"`
}

// DetectSite mendeteksi nama platform e-commerce dari URL/domain
func DetectSite(rawURL string) string {
	u, err := url.Parse(rawURL)
	if err != nil {
		return "lainnya"
	}
	host := strings.ToLower(u.Hostname())
	switch {
	case strings.Contains(host, "shopee") || strings.Contains(host, "shp.ee"):
		return "shopee"
	case strings.Contains(host, "tokopedia") || strings.Contains(host, "tokopedia.link"):
		return "tokopedia"
	case strings.Contains(host, "lazada"):
		return "lazada"
	case strings.Contains(host, "tiktok"):
		return "tiktokshop"
	case strings.Contains(host, "blibli"):
		return "blibli"
	case strings.Contains(host, "bukalapak"):
		return "bukalapak"
	default:
		return "lainnya"
	}
}

// NormalizePriceRupiah membersihkan string harga ke format int64 bulat rupiah
func NormalizePriceRupiah(rawPrice string) *int64 {
	clean := strings.TrimSpace(rawPrice)
	if clean == "" {
		return nil
	}

	// Jika memuat simbol mata uang asing seperti USD, $, EUR, SGD selain IDR/Rp -> tolak
	upper := strings.ToUpper(clean)
	if strings.Contains(upper, "USD") || strings.Contains(upper, "SGD") || strings.Contains(upper, "EUR") || strings.Contains(upper, "$") {
		return nil
	}

	// Buang "Rp", "IDR", dan spasi
	upper = strings.ReplaceAll(upper, "RP", "")
	upper = strings.ReplaceAll(upper, "IDR", "")
	upper = strings.TrimSpace(upper)

	// Format desimal seperti "1250000.00" -> ambil sebelum desimal
	if idx := strings.Index(upper, "."); idx != -1 && len(upper)-idx == 3 {
		// Kemungkinan dua digit desimal .00
		upper = upper[:idx]
	} else if idx := strings.Index(upper, ","); idx != -1 && len(upper)-idx == 3 {
		// Kemungkinan dua digit desimal ,00
		upper = upper[:idx]
	}

	// Hapus semua karakter non-digit
	re := regexp.MustCompile(`[^\d]`)
	digits := re.ReplaceAllString(upper, "")
	if digits == "" {
		return nil
	}

	val, err := strconv.ParseInt(digits, 10, 64)
	if err != nil || val <= 0 {
		return nil
	}
	return &val
}

// CleanText membersihkan tag HTML, kontrol karakter, dan memotong maks 200 karakter
func CleanText(raw string) string {
	decoded := html.UnescapeString(raw)
	// Hapus tag HTML jika ada
	reHTML := regexp.MustCompile(`<[^>]*>`)
	cleaned := reHTML.ReplaceAllString(decoded, "")

	// Hapus newline berlebih dan kontrol karakter
	cleaned = strings.ReplaceAll(cleaned, "\n", " ")
	cleaned = strings.ReplaceAll(cleaned, "\r", " ")
	cleaned = strings.ReplaceAll(cleaned, "\t", " ")
	cleaned = strings.TrimSpace(cleaned)

	// Potong maksimal 200 karakter
	runes := []rune(cleaned)
	if len(runes) > 200 {
		runes = runes[:200]
	}
	return string(runes)
}

// ParseHTMLMetadata mengekstrak data JSON-LD, Open Graph, dan Meta tags dari body HTML
func ParseHTMLMetadata(r io.Reader, originalURL, finalURL string) LinkMetadata {
	site := DetectSite(finalURL)
	meta := LinkMetadata{
		OK:        false,
		Situs:     site,
		LinkAsli:  originalURL,
		LinkAkhir: finalURL,
		Pesan:     "Tidak bisa mengambil data otomatis dari link ini. Isi nama, harga, dan foto secara manual.",
	}

	doc, err := golangnethtml.Parse(r)
	if err != nil {
		return meta
	}

	var jsonLDs []string
	var ogTitle, ogImage, ogPrice string
	var metaTitle, titleTag, metaDesc string

	var traverse func(*golangnethtml.Node)
	traverse = func(n *golangnethtml.Node) {
		if n.Type == golangnethtml.ElementNode {
			switch strings.ToLower(n.Data) {
			case "script":
				for _, attr := range n.Attr {
					if strings.ToLower(attr.Key) == "type" && strings.ToLower(attr.Val) == "application/ld+json" {
						if n.FirstChild != nil && n.FirstChild.Type == golangnethtml.TextNode {
							jsonLDs = append(jsonLDs, n.FirstChild.Data)
						}
					}
				}
			case "meta":
				var prop, name, content string
				for _, attr := range n.Attr {
					k := strings.ToLower(attr.Key)
					switch k {
					case "property":
						prop = strings.ToLower(attr.Val)
					case "name":
						name = strings.ToLower(attr.Val)
					case "content":
						content = attr.Val
					}
				}
				if prop == "og:title" && ogTitle == "" {
					ogTitle = content
				} else if prop == "og:image" && ogImage == "" {
					ogImage = content
				} else if (prop == "og:price:amount" || prop == "product:price:amount") && ogPrice == "" {
					ogPrice = content
				} else if name == "title" && metaTitle == "" {
					metaTitle = content
				} else if name == "description" && metaDesc == "" {
					metaDesc = content
				}
			case "title":
				if n.FirstChild != nil && n.FirstChild.Type == golangnethtml.TextNode && titleTag == "" {
					titleTag = n.FirstChild.Data
				}
			}
		}
		for c := n.FirstChild; c != nil; c = c.NextSibling {
			traverse(c)
		}
	}
	traverse(doc)

	var extractedName string
	var extractedPrice *int64
	var extractedImage string

	// 1. Ekstrak dari JSON-LD schema.org Product
	for _, rawJSON := range jsonLDs {
		var item map[string]interface{}
		if err := json.Unmarshal([]byte(rawJSON), &item); err == nil {
			if parseProductJSONLD(item, &extractedName, &extractedPrice, &extractedImage) {
				break
			}
		} else {
			// Cek kemungkinan array json-ld
			var itemArr []map[string]interface{}
			if err := json.Unmarshal([]byte(rawJSON), &itemArr); err == nil {
				for _, it := range itemArr {
					if parseProductJSONLD(it, &extractedName, &extractedPrice, &extractedImage) {
						break
					}
				}
			}
		}
	}

	// 2. Fallback ke Open Graph jika belum terisi
	if extractedName == "" && ogTitle != "" {
		extractedName = ogTitle
	}
	if extractedImage == "" && ogImage != "" {
		extractedImage = ogImage
	}
	if extractedPrice == nil && ogPrice != "" {
		extractedPrice = NormalizePriceRupiah(ogPrice)
	}

	// 3. Fallback ke <title> dan meta description
	if extractedName == "" {
		if titleTag != "" {
			extractedName = titleTag
		} else if metaTitle != "" {
			extractedName = metaTitle
		} else if metaDesc != "" {
			extractedName = metaDesc
		}
	}

	// Bersihkan hasil
	extractedName = CleanText(extractedName)

	if extractedName != "" || extractedPrice != nil || extractedImage != "" {
		meta.OK = true
		meta.Nama = extractedName
		meta.Harga = extractedPrice
		meta.GambarKandidat = extractedImage
		meta.Pesan = "Berhasil mengambil saran metadata dari link."
	}

	return meta
}

func parseProductJSONLD(item map[string]interface{}, name *string, price **int64, img *string) bool {
	t, ok := item["@type"].(string)
	if !ok || !strings.EqualFold(t, "Product") {
		return false
	}

	if *name == "" {
		if n, ok := item["name"].(string); ok {
			*name = n
		}
	}

	if *img == "" {
		if im, ok := item["image"].(string); ok {
			*img = im
		} else if imList, ok := item["image"].([]interface{}); ok && len(imList) > 0 {
			if im0, ok := imList[0].(string); ok {
				*img = im0
			}
		}
	}

	if *price == nil {
		if offers, ok := item["offers"].(map[string]interface{}); ok {
			if p, exists := offers["price"]; exists {
				*price = NormalizePriceRupiah(fmt.Sprintf("%v", p))
			} else if lp, exists := offers["lowPrice"]; exists {
				*price = NormalizePriceRupiah(fmt.Sprintf("%v", lp))
			}
		}
	}

	return *name != "" || *price != nil
}
