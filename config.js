// Konfigurasi URL API Backend
// Otomatis mendeteksi: Jika diakses di lokal (XAMPP) gunakan IP lokal,
// jika di Cloudflare Pages gunakan '/api' (Cloudflare Pages Function).
const isLocal = window.location.hostname === 'localhost' || 
                window.location.hostname === '127.0.0.1' || 
                window.location.hostname.startsWith('192.168.');

window.CONFIG = {
  // API URL otomatis menyesuaikan lingkungan
  API_BASE_URL: isLocal 
    ? 'http://192.168.100.14/stockopname/api' 
    : '/api',

  CAFE_NAME: 'Uleni Donuts & Cafe Kudus',
};
