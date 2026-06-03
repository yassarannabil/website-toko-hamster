import Link from "next/link";
import Footer from "../components/Footer";
import type { BoxItem, PaginatedResponse } from "../data/hamsters";
import { API_BASE_URL } from "../data/hamsters";

async function getBoxes(): Promise<BoxItem[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/boxes/`, {
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data: PaginatedResponse<BoxItem> = await res.json();
    return data.results;
  } catch {
    return [];
  }
}

/** Single unified border color for all box cards */
const BOX_BORDER = "border-amber-200";

export default async function KatalogPage() {
  const boxes = await getBoxes();

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {/* ───── Header ───── */}
      <header className="relative overflow-hidden bg-gradient-to-br from-brand-800 via-brand-700 to-brand-600">
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-brand-500/20 blur-3xl" />

        <div className="relative mx-auto max-w-5xl px-4 py-10 sm:py-14">
          <div className="text-center">
            <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl lg:text-4xl">
              Katalog Live
            </h1>
            <p className="mx-auto mt-2 max-w-md text-sm text-brand-100/80 sm:text-base">
              Pilih box untuk melihat koleksi hamster di dalamnya
            </p>
          </div>
        </div>

        <svg
          className="absolute bottom-0 left-0 w-full text-surface"
          viewBox="0 0 1440 60"
          preserveAspectRatio="none"
          fill="currentColor"
        >
          <path d="M0,40 C360,80 720,0 1080,40 C1260,60 1380,50 1440,40 L1440,60 L0,60 Z" />
        </svg>
      </header>

      {/* ───── Box Grid ───── */}
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:py-12">
        {boxes.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
            {boxes.map((box) => {
              return (
                <Link
                  key={box.box_id}
                  href={`/katalog/${box.box_id}`}
                  className={`group relative flex flex-col gap-2.5 rounded-2xl border ${BOX_BORDER} bg-surface-card p-4 shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1 active:scale-[0.98] sm:p-5`}
                >

                  {/* Info */}
                  <div>
                    <h2 className="text-lg font-bold text-text-primary">
                      {box.nama_box.toLowerCase() === "aksesoris" || box.spesies === "Perlengkapan" 
                        ? box.nama_box 
                        : `Box ${box.nama_box}`}
                    </h2>
                    
                    {/* Baris 2: Spesies */}
                    {box.spesies && (
                      <p className="mt-1 text-sm font-semibold text-brand-600">
                        {box.spesies}
                      </p>
                    )}
                    
                    {/* Baris 3: Kategori & Jenis Kelamin (atau Fallback) */}
                    {(box.kategori_box || box.jenis_kelamin_box) ? (
                      <p className="mt-0.5 text-sm text-text-secondary leading-snug">
                        {box.kategori_box === "Mix" && box.jenis_kelamin_box === "Mix"
                          ? "Mix"
                          : `${box.kategori_box || ""} ${box.jenis_kelamin_box || ""}`.trim()
                        }
                      </p>
                    ) : box.kategori ? (
                      <p className="mt-1 text-sm text-text-secondary leading-snug">
                        {box.kategori}
                      </p>
                    ) : null}
                  </div>

                  {/* Arrow */}
                  <div className="absolute top-5 right-5 text-text-muted transition-transform duration-200 group-hover:translate-x-1">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <span className="text-5xl">📦</span>
            <p className="mt-4 text-lg font-semibold text-text-secondary">
              Stok belum disiapkan
            </p>
            <p className="mt-1 text-sm text-text-muted">
              Silakan tunggu hingga admin telah menyiapkan stok hamster.
            </p>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
