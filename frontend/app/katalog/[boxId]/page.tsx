import Link from "next/link";
import HamsterCard from "../../components/HamsterCard";
import Footer from "../../components/Footer";
import type { HamsterItem, BoxItem, PaginatedResponse } from "../../data/hamsters";
import { API_BASE_URL } from "../../data/hamsters";

async function getBoxItems(boxId: string): Promise<HamsterItem[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/boxes/${boxId}/items/`, {
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data: PaginatedResponse<HamsterItem> = await res.json();
    return data.results;
  } catch {
    return [];
  }
}

async function getBoxInfo(boxId: string): Promise<BoxItem | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/boxes/`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data: PaginatedResponse<BoxItem> = await res.json();
    return data.results.find((b) => String(b.box_id) === boxId) || null;
  } catch {
    return null;
  }
}

export default async function BoxDetailPage({
  params,
}: {
  params: Promise<{ boxId: string }>;
}) {
  const { boxId } = await params;
  const [items, boxInfo] = await Promise.all([
    getBoxItems(boxId),
    getBoxInfo(boxId),
  ]);

  const available = items.filter((h) => h.status_ketersediaan === "Tersedia").length;
  const sold = items.filter((h) => h.status_ketersediaan === "Terjual").length;

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {/* ───── Header ───── */}
      <header className="relative overflow-hidden bg-gradient-to-br from-brand-800 via-brand-700 to-brand-600">
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-brand-500/20 blur-3xl" />

        <div className="relative mx-auto max-w-5xl px-4 py-10 sm:py-14">
          {/* Back */}
          <Link
            href="/katalog"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-white/70 transition-colors hover:text-white mb-6"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Kembali ke Katalog
          </Link>

          <div className="text-center">
            <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
              Box {boxInfo?.nama_box || boxId}
            </h1>
            {boxInfo?.kategori && (
              <p className="mx-auto mt-2 text-sm text-brand-100/80 sm:text-base">
                {boxInfo.kategori}
              </p>
            )}
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

      {/* ───── Hamster Grid ───── */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:py-12">
        {items.length > 0 ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 sm:gap-6">
            {items.map((item) => (
              <HamsterCard key={item.inventory_id} item={item} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <span className="text-5xl">🐹</span>
            <p className="mt-4 text-lg font-semibold text-text-secondary">
              Box ini masih kosong
            </p>
            <p className="mt-1 text-sm text-text-muted">
              Hamster akan segera ditambahkan oleh admin.
            </p>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
