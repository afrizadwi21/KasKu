package media

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"net"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"syscall"
	"time"
)

var (
	ErrPrivateIP        = errors.New("akses ke alamat IP internal/privat ditolak demi keamanan (SSRF protection)")
	ErrInvalidScheme    = errors.New("hanya skema http dan https yang didukung")
	ErrInvalidPort      = errors.New("hanya port 80 dan 443 yang diizinkan")
	ErrCredentialsInURL = errors.New("URL tidak boleh memuat kredensial pengguna (user:pass)")
	ErrTooManyRedirects = errors.New("terlalu banyak pengalihan (maksimal 5 redirect)")
	ErrResponseTooLarge = errors.New("ukuran respons melebihi batas yang diizinkan")
)

// Daftar rentang IP privat / loopback / link-local / cloud metadata (RFC 1918, RFC 3927, RFC 4193, loopback, dsb.)
var privateCIDRs = []*net.IPNet{
	mustParseCIDR("0.0.0.0/8"),
	mustParseCIDR("10.0.0.0/8"),
	mustParseCIDR("100.64.0.0/10"), // Shared Address Space (Carrier-grade NAT)
	mustParseCIDR("127.0.0.0/8"),    // Loopback IPv4
	mustParseCIDR("169.254.0.0/16"), // Link-local IPv4 / Cloud Metadata (169.254.169.254)
	mustParseCIDR("172.16.0.0/12"),  // Private IPv4 Class B
	mustParseCIDR("192.0.0.0/24"),   // IETF Protocol Assignments
	mustParseCIDR("192.0.2.0/24"),   // Documentation (TEST-NET-1)
	mustParseCIDR("192.88.99.0/24"), // 6to4 Relay Anycast
	mustParseCIDR("192.168.0.0/16"), // Private IPv4 Class C
	mustParseCIDR("198.18.0.0/15"),  // Benchmarking
	mustParseCIDR("198.51.100.0/24"),// Documentation (TEST-NET-2)
	mustParseCIDR("203.0.113.0/24"), // Documentation (TEST-NET-3)
	mustParseCIDR("224.0.0.0/4"),    // Multicast
	mustParseCIDR("240.0.0.0/4"),    // Reserved
	mustParseCIDR("255.255.255.255/32"),
	mustParseCIDR("::/128"),         // Unspecified IPv6
	mustParseCIDR("::1/128"),        // Loopback IPv6
	mustParseCIDR("fc00::/7"),       // Unique Local Address (ULA) IPv6
	mustParseCIDR("fe80::/10"),      // Link-local Unicast IPv6
}

func mustParseCIDR(s string) *net.IPNet {
	_, ipnet, err := net.ParseCIDR(s)
	if err != nil {
		panic(err)
	}
	return ipnet
}

// IsPrivateIP memeriksa apakah IP masuk dalam kategori privat, loopback, link-local, atau multicast
func IsPrivateIP(ip net.IP) bool {
	if ip == nil {
		return true
	}
	// Periksa standar library flag
	if ip.IsLoopback() || ip.IsLinkLocalUnicast() || ip.IsLinkLocalMulticast() || ip.IsPrivate() || ip.IsUnspecified() {
		return true
	}
	for _, cidr := range privateCIDRs {
		if cidr.Contains(ip) {
			return true
		}
	}
	return false
}

// ValidateURLFormat memeriksa skema, port, dan larangan userinfo
func ValidateURLFormat(rawURL string) (*url.URL, error) {
	if len(rawURL) > 2048 {
		return nil, errors.New("panjang URL melebihi batas maksimal 2048 karakter")
	}

	parsed, err := url.Parse(rawURL)
	if err != nil {
		return nil, errors.New("format URL tidak valid: " + err.Error())
	}

	scheme := strings.ToLower(parsed.Scheme)
	if scheme != "http" && scheme != "https" {
		return nil, ErrInvalidScheme
	}

	if parsed.User != nil {
		return nil, ErrCredentialsInURL
	}

	host := parsed.Hostname()
	if strings.TrimSpace(host) == "" {
		return nil, errors.New("nama host pada URL tidak boleh kosong")
	}

	portStr := parsed.Port()
	if portStr != "" {
		port, err := strconv.Atoi(portStr)
		if err != nil || (port != 80 && port != 443) {
			return nil, ErrInvalidPort
		}
	}

	// Cek jika hostname langsung berupa IP literal
	if ip := net.ParseIP(host); ip != nil {
		if IsPrivateIP(ip) {
			return nil, ErrPrivateIP
		}
	}

	return parsed, nil
}

// NewSSRFSafeHTTPClient membuat http.Client dengan timeout dan dialer yang mengecek IP sebelum connect (mencegah DNS rebinding)
func NewSSRFSafeHTTPClient(timeout time.Duration, allowLocalTest bool) *http.Client {
	dialer := &net.Dialer{
		Timeout:   timeout,
		KeepAlive: 30 * time.Second,
		Control: func(network, address string, c syscall.RawConn) error {
			if allowLocalTest {
				// Izinkan untuk testing menggunakan httptest.Server (127.0.0.1)
				return nil
			}
			host, _, err := net.SplitHostPort(address)
			if err != nil {
				return err
			}
			ip := net.ParseIP(host)
			if ip != nil && IsPrivateIP(ip) {
				return ErrPrivateIP
			}
			return nil
		},
	}

	transport := &http.Transport{
		Proxy:                 http.ProxyFromEnvironment,
		DialContext:           dialer.DialContext,
		ForceAttemptHTTP2:     true,
		MaxIdleConns:          50,
		IdleConnTimeout:       30 * time.Second,
		TLSHandshakeTimeout:   5 * time.Second,
		ExpectContinueTimeout: 1 * time.Second,
	}

	client := &http.Client{
		Timeout:   timeout,
		Transport: transport,
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			if len(via) >= 5 {
				return ErrTooManyRedirects
			}
			if !allowLocalTest {
				if _, err := ValidateURLFormat(req.URL.String()); err != nil {
					return err
				}
				// Validasi DNS target redirect
				ips, err := net.LookupIP(req.URL.Hostname())
				if err != nil {
					return errors.New("gagal meresolusi domain redirect: " + err.Error())
				}
				for _, ip := range ips {
					if IsPrivateIP(ip) {
						return ErrPrivateIP
					}
				}
			}
			return nil
		},
	}

	return client
}

// GenerateSignedImageURL membuat signature HMAC-SHA256 untuk URL gambar publik yang aman
func GenerateSignedImageURL(baseURL string, imageID string, secret string, ttl time.Duration) string {
	exp := time.Now().Add(ttl).Unix()
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(fmt.Sprintf("%s:%d", imageID, exp)))
	sig := hex.EncodeToString(mac.Sum(nil))

	baseURL = strings.TrimRight(baseURL, "/")
	return fmt.Sprintf("%s/img/wishlist/%s?exp=%d&sig=%s", baseURL, imageID, exp, sig)
}

// VerifyImageSignature memverifikasi tanda tangan URL gambar
func VerifyImageSignature(imageID string, expStr string, sig string, secret string) bool {
	exp, err := strconv.ParseInt(expStr, 10, 64)
	if err != nil {
		return false
	}
	if time.Now().Unix() > exp {
		return false // Kedaluwarsa
	}

	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(fmt.Sprintf("%s:%d", imageID, exp)))
	expectedSig := hex.EncodeToString(mac.Sum(nil))

	return hmac.Equal([]byte(sig), []byte(expectedSig))
}
