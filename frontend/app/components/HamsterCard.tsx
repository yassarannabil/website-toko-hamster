"use client";

import { useState } from "react";
import type { HamsterItem } from "../data/hamsters";
import { WHATSAPP_NUMBER, getRelativeMediaUrl } from "../data/hamsters";

function formatRupiah(n: number | string): string {
  const num = typeof n === "string" ? parseFloat(n) : n;
  // Format manual agar konsisten antara server (Node.js) dan client (browser HP)
  // Intl.NumberFormat menghasilkan "Rp 175.000" di server tapi "Rp175.000" di Safari
  const formatted = Math.round(num).toLocaleString("id-ID").replace(/,/g, ".");
  return `Rp ${formatted}`;
}

function getDisplayId(item: HamsterItem): string {
  return item.kode_hamster || `HAM-${item.inventory_id}`;
}

export default function HamsterCard({ item, isAdminView = false }: { item: HamsterItem, isAdminView?: boolean }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const sold = item.status_ketersediaan === "Terjual";
  const hold = item.status_ketersediaan === "Hold";
  const hidden = item.status_ketersediaan === "Disembunyikan";
  const unavailable = sold || hold || hidden;
  const displayId = getDisplayId(item);
  const hasVideo = !!item.video_file;

  const waText = encodeURIComponent(
    `Halo min, apakah hamster ${displayId} (${item.varian}) masih tersedia?`
  );
  const waLink = `https://wa.me/${WHATSAPP_NUMBER}?text=${waText}`;

  // Clean variant name for accessories (Remove "Perlengkapan - " prefix)
  const cleanVarian = item.varian.startsWith("Perlengkapan - ") 
    ? item.varian.replace("Perlengkapan - ", "") 
    : item.varian;

  return (
    <article
      id={`card-${displayId}`}
      className={`group relative flex flex-col overflow-hidden rounded-2xl bg-surface-card shadow-sm border border-brand-100/60 transition-all duration-300 ${
        (unavailable && !isAdminView)
          ? "grayscale opacity-75"
          : "hover:shadow-xl hover:shadow-brand-200/40 hover:-translate-y-1"
      }`}
    >
      {/* Status Badge */}
      <div className="absolute top-3 left-3 z-10">
        <span
          className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold tracking-wide backdrop-blur-sm ${
            sold
              ? "bg-red-500/90 text-white"
              : hold
              ? "bg-orange-500/90 text-white"
              : hidden
              ? "bg-gray-500/90 text-white"
              : "bg-emerald-500/90 text-white"
          }`}
        >
          <span
            className={`inline-block h-1.5 w-1.5 rounded-full ${
              sold ? "bg-red-200" : hold ? "bg-orange-200" : hidden ? "bg-gray-300" : "bg-white animate-pulse"
            }`}
          />
          {sold ? "Terjual" : hold ? "Dipesan" : hidden ? "Disembunyikan" : "Tersedia"}
        </span>
      </div>

      {/* ──── Media Area: Foto / Video (1:1) ──── */}
      <div className="relative aspect-square overflow-hidden bg-surface-muted">
        {isPlaying && item.video_file && !isAdminView ? (
          <>
            {/* Loading spinner — tampil saat video masih dimuat dari Cloudinary */}
            {isLoading && (
              <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/70">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/30 border-t-white" />
              </div>
            )}
            {/* Video Player */}
            <video
              src={getRelativeMediaUrl(item.video_file) || ""}
              controls
              autoPlay
              muted
              playsInline
              className="absolute inset-0 h-full w-full object-contain bg-black"
              onLoadStart={() => setIsLoading(true)}
              onCanPlay={() => setIsLoading(false)}
              onEnded={() => setIsPlaying(false)}
            />
          </>
        ) : (
          <>
            {/* Foto Preview */}
            {item.foto_preview ? (
              <img
                src={getRelativeMediaUrl(item.foto_preview) || ""}
                alt={`${item.varian} — ${displayId}`}
                loading="lazy"
                className={`absolute inset-0 h-full w-full object-contain bg-surface-muted transition-transform duration-500 ${
                  (unavailable && !isAdminView) ? "" : "group-hover:scale-105"
                }`}
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-surface-muted text-text-muted">
                <span className="text-4xl">🐹</span>
                <span className="text-xs font-medium">Belum ada foto</span>
              </div>
            )}

            {/* ▶ Play Button Overlay */}
            {hasVideo && !unavailable && !isAdminView && (
              <button
                onClick={() => { setIsLoading(true); setIsPlaying(true); }}
                aria-label="Putar video"
                className="absolute inset-0 z-[5] flex items-center justify-center bg-black/0 transition-colors duration-200 hover:bg-black/20 group/play"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm shadow-xl transition-all duration-200 group-hover/play:scale-110 group-hover/play:bg-black/70 sm:h-16 sm:w-16">
                  <svg
                    className="ml-1 h-6 w-6 sm:h-7 sm:w-7"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </button>
            )}
          </>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-3 p-4 sm:p-5">
        {/* Kode Hamster */}
        <div>
          <p className="text-[11px] font-bold text-brand-500 tracking-[0.15em] uppercase">
            {displayId}
          </p>
          <h2 className="mt-1 text-base font-bold text-text-primary leading-snug line-clamp-2 sm:text-lg">
            {cleanVarian}
          </h2>
        </div>

        {/* Details Chips */}
        <div className="flex flex-wrap gap-2">
          {item.jenis_kelamin && item.jenis_kelamin !== "Netral / Tidak Ada" && item.jenis_kelamin !== "Belum Diketahui" && (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-surface-muted px-2.5 py-1 text-xs font-medium text-text-secondary">
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
              {item.jenis_kelamin}
            </span>
          )}
          
          {item.usia_bulan && (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-surface-muted px-2.5 py-1 text-xs font-medium text-text-secondary">
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              {item.usia_bulan} Bulan
            </span>
          )}

          {item.jenis_bulu && !item.jenis_bulu.includes("Tidak Ada") && (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-surface-muted px-2.5 py-1 text-xs font-medium text-text-secondary">
              ✨ {item.jenis_bulu}
            </span>
          )}
        </div>
        
        {/* Catatan Kondisi Fisik */}
        {item.kondisi_fisik && item.kondisi_fisik.trim() !== "" && (
          <div className="text-[11px] bg-amber-50/70 text-amber-800 border border-amber-100/80 rounded-xl p-2.5 leading-relaxed font-medium flex items-start gap-1.5 mt-0.5">
            <span className="text-sm leading-none flex-shrink-0 select-none">📢</span>
            <div className="flex-1">
              <span className="font-extrabold block text-[10px] uppercase tracking-wider text-amber-600 mb-0.5">Kondisi Fisik:</span>
              {item.kondisi_fisik}
            </div>
          </div>
        )}

        {/* Price */}
        <p
          className={`text-xl font-extrabold tracking-tight sm:text-2xl ${
            (unavailable && !isAdminView) ? "text-sold-gray line-through" : "text-brand-600"
          }`}
        >
          {formatRupiah(item.harga_display)}
        </p>

        {/* CTA */}
        {isAdminView ? (
          <button
            disabled
            className={`mt-auto flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold border ${
              sold 
                ? "bg-red-50 border-red-200 text-red-600" 
                : hold 
                ? "bg-orange-50 border-orange-200 text-orange-600" 
                : hidden
                ? "bg-gray-100 border-gray-300 text-gray-500"
                : "bg-emerald-50 border-emerald-200 text-emerald-600"
            }`}
          >
            {sold ? "Telah Terjual" : hold ? "Sedang Dipesan" : hidden ? "Disembunyikan" : "Tersedia"}
          </button>
        ) : unavailable ? (
          <button
            disabled
            className="mt-auto flex w-full items-center justify-center gap-2 rounded-xl bg-gray-200 py-3 text-sm font-semibold text-gray-500 cursor-not-allowed"
          >
            {sold ? "Telah Terjual" : "Sedang Dipesan"}
          </button>
        ) : (
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-auto flex w-full items-center justify-center gap-2 rounded-xl bg-wa-green py-3 text-sm font-bold text-white shadow-md shadow-wa-green/30 transition-all duration-200 hover:bg-wa-green-hover hover:shadow-lg hover:shadow-wa-green/40 active:scale-[0.97]"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Pesan via WhatsApp
          </a>
        )}
      </div>
    </article>
  );
}
