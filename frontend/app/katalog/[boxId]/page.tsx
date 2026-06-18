import Link from "next/link";
import HamsterCard from "../../components/HamsterCard";
import Footer from "../../components/Footer";
import PageHeader from "../../components/PageHeader";
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
      <PageHeader 
        title={boxInfo?.nama_box?.toLowerCase() === "aksesoris" || boxInfo?.spesies === "Perlengkapan" 
                ? boxInfo.nama_box 
                : `Box ${boxInfo?.nama_box || boxId}`}
        subtitle={boxInfo?.kategori || undefined}
        backButton
      />

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
            <span className="text-5xl"></span>
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
