/**
 * TypeScript interfaces matching the Django DRF serializer responses.
 */

/* ── Box (from BoxSerializer) ── */
export interface BoxItem {
  box_id: number;
  nama_box: string;
  kategori: string;
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
  jenis_kelamin: "Jantan" | "Betina" | "Belum Diketahui";
  usia_bulan: string;
  grade_corak: "S+" | "A" | "B" | "C";
  kondisi_fisik: string;
  foto_preview: string | null;
  video_file: string | null;
  harga_display: string;
  status_ketersediaan: "Tersedia" | "Terjual" | "Hold";
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export const WHATSAPP_NUMBER = "6281230134185";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
