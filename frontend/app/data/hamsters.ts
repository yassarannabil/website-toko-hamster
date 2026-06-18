/**
 * TypeScript interfaces matching the Django DRF serializer responses.
 */

/* ── Box (from BoxSerializer) ── */
export interface BoxItem {
  box_id: number;
  nama_box: string;
  kategori: string;
  spesies: string | null;
  kategori_box: string | null;
  jenis_kelamin_box: string | null;
  urutan: number;
  jumlah_tersedia: number;
  jumlah_total: number;
}

/* ── Hamster (from LiveInventorySerializer) ── */
export interface HamsterItem {
  inventory_id: number;
  kode_hamster: string | null;
  varian: string;
  spesies: string;
  varian_warna: string;
  jenis_bulu: string;
  is_satin: boolean;
  box_id: number;
  box_nama: string;
  jenis_kelamin: "Jantan" | "Betina" | "Belum Diketahui" | "Netral / Tidak Ada";
  usia_bulan: string;
  grade_corak: "S+" | "A" | "B" | "C";
  kondisi_fisik: string;
  foto_preview: string | null;
  video_file: string | null;
  harga_display: string;
  status_ketersediaan: "Tersedia" | "Terjual" | "Hold" | "Disembunyikan";
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export const WHATSAPP_NUMBER = "6281230134185";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

/**
 * Ensures media URLs fetched via Server Components (which come with 127.0.0.1 domain)
 * are converted to relative paths so they pass through the Next.js Ngrok Proxy for end-users.
 * If Cloudinary is used, it injects auto-compression parameters.
 */
export function getRelativeMediaUrl(url: string | null): string | null {
  if (!url) return null;
  
  // Jika URL mengarah ke Cloudinary, tambahkan auto-kompresi canggih!
  if (url.includes("res.cloudinary.com") && url.includes("/upload/")) {
    // Paksa HTTPS untuk menghindari Mixed Content Block di Ngrok
    const secureUrl = url.replace("http://", "https://");
    
    // Hindari double optimization jika URL sudah mengandung transformasi
    if (secureUrl.includes("q_auto")) return secureUrl;
    
    // Jika file ini adalah video, PAKSA ubah menjadi format MP4 (f_mp4)
    // iPhone merekam dengan format MOV (QuickTime) yang sering tidak bisa diputar langsung di browser
    if (secureUrl.includes("/video/upload/")) {
      return secureUrl.replace("/upload/", "/upload/f_mp4,q_auto,w_800/");
    }

    // Jika gambar, gunakan f_auto (webp otomatis)
    return secureUrl.replace("/upload/", "/upload/f_auto,q_auto,w_800/");
  }

  // If the url starts with http://127.0.0.1:8000, strip it to make it relative
  return url.replace("http://127.0.0.1:8000", "");
}
