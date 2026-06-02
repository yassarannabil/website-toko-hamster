"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toBlob } from 'html-to-image';

export default function InvoiceGeneratorPage() {
  const [inventory, setInventory] = useState<any[]>([]);
  const [couriers, setCouriers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Form State
  const [wa, setWa] = useState('');
  const [qtyPacking, setQtyPacking] = useState(1);
  const [ongkir, setOngkir] = useState<number | string>('');
  const [kurirId, setKurirId] = useState('');
  const [estimasi, setEstimasi] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isFreePacking, setIsFreePacking] = useState(false);

  // Selected Hamsters Set
  const [selectedHamsters, setSelectedHamsters] = useState<Set<number>>(new Set());

  // UI State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copyStatus, setCopyStatus] = useState('');

  const canvasRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [invRes, curRes] = await Promise.all([
          fetch('/api/dashboard/inventory/'),
          fetch('/api/dashboard/couriers/')
        ]);

        if (invRes.ok) setInventory(await invRes.json());
        if (curRes.ok) setCouriers(await curRes.json());
      } catch (e) {
        console.error('Failed to fetch data', e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleCourierChange = (e: any) => {
    const id = e.target.value;
    setKurirId(id);
    const selected = couriers.find(c => c.pk.toString() === id);
    if (selected && selected.estimasi_default_hari) {
      setEstimasi(selected.estimasi_default_hari.toString());
    } else {
      setEstimasi('');
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const terms = searchTerm.split(',').map(t => t.trim().toUpperCase()).filter(t => t);
      if (terms.length === 0) return;

      let foundCount = 0;
      let lastFoundId: number | null = null;
      const notFound: string[] = [];
      const newSelected = new Set(selectedHamsters);

      terms.forEach(term => {
        const searchCode = term.startsWith('HAM-') ? term : `HAM-${term}`;
        const hamster = inventory.find(h => h.kode_hamster.toUpperCase() === searchCode);
        if (hamster) {
          if (newSelected.has(hamster.inventory_id)) {
            newSelected.delete(hamster.inventory_id);
          } else {
            newSelected.add(hamster.inventory_id);
          }
          foundCount++;
          lastFoundId = hamster.inventory_id;
        } else {
          notFound.push(term);
        }
      });

      setSelectedHamsters(newSelected);

      if (foundCount > 0) {
        setSearchTerm('');
        // Auto-scroll to the last found hamster
        if (lastFoundId !== null) {
          setTimeout(() => {
            const el = document.getElementById(`hamster-item-${lastFoundId}`);
            if (el && listRef.current) {
              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }, 50);
        }
      }
      if (notFound.length > 0) alert(`Kode tidak ditemukan: ${notFound.join(', ')}`);
    }
  };

  const formatRupiah = (num: number) => num.toLocaleString('id-ID');

  const safeOngkir = typeof ongkir === 'number' ? ongkir : (parseInt(String(ongkir)) || 0);
  const safeQtyPacking = parseInt(String(qtyPacking)) || 1;

  const selectedHamsterObjects = inventory.filter(h => selectedHamsters.has(h.inventory_id));
  const totalHamster = selectedHamsterObjects.reduce((sum, h) => sum + Number(h.harga_display), 0);
  const totalPacking = isFreePacking ? 0 : (safeQtyPacking * 10000);
  const totalOngkir = safeOngkir * (safeQtyPacking > 0 ? safeQtyPacking : 1);
  const grandTotal = totalHamster + totalPacking + totalOngkir;

  const getKurirText = () => {
    if (!kurirId) return "Ongkir";
    const selected = couriers.find(c => c.pk.toString() === kurirId);
    if (!selected) return "Ongkir";
    let text = `${selected.nama_kurir} ${selected.jenis_layanan}`;
    if (estimasi) text += ` (est. ${estimasi} hari)`;
    return text;
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedHamsters.size === 0) {
      alert("Pilih minimal 1 hamster!");
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Capture Image
      if (canvasRef.current) {
        const blob = await toBlob(canvasRef.current, { 
          pixelRatio: 3, 
          backgroundColor: "#ffffff",
          fontEmbedCSS: "",
        });
        if (blob) {
          try {
            const item = new ClipboardItem({ "image/png": blob });
            await navigator.clipboard.write([item]);
            setCopyStatus("📸 Gambar Tersalin!");
            setTimeout(() => setCopyStatus(''), 3000);
          } catch (err) {
            console.error("Clipboard err", err);
          }
        }
      }

      // 2. Submit to API
      const payload = {
        nomor_wa: wa,
        qty_packing: safeQtyPacking,
        biaya_ongkir: safeOngkir,
        kurir_id: kurirId,
        estimasi_hari: estimasi,
        hamsters: Array.from(selectedHamsters),
        is_free_packing: isFreePacking
      };

      const res = await fetch('/api/dashboard/invoice/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        router.push('/dashboard/transactions');
      } else {
        alert("Gagal menyimpan transaksi.");
      }
    } catch (e) {
      console.error(e);
      alert("Terjadi kesalahan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div>Memuat data...</div>;

  return (
    <div className="flex flex-col gap-6 max-w-6xl">
      <Link href="/dashboard/transactions" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-orange-600 transition-colors w-fit">
        <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Kembali ke Daftar Pesanan
      </Link>


      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
        {/* Form Kiri */}
        <div className="flex-1 bg-white p-5 sm:p-8 rounded-xl shadow-sm border border-gray-200">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Pembuatan Invoice & Tagihan</h2>
          <p className="text-gray-500 mb-6 sm:mb-8 text-sm sm:text-base">Pilih hamster, atur biaya, lalu salin hasilnya sebagai gambar cantik.</p>

          <form onSubmit={handleFormSubmit}>
            <div className="mb-5">
              <label className="block font-semibold text-gray-700 mb-2">Nomor WA Customer</label>
              <input type="text" className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition"
                value={wa} onChange={e => setWa(e.target.value)} required placeholder="081234567890" />
            </div>

            <div className="flex flex-col sm:flex-row gap-4 mb-5">
              <div className="flex-1">
                <label className="block font-semibold text-gray-700 mb-2">Jumlah Box Packing</label>
                <input type="number" className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                  value={qtyPacking} onChange={e => setQtyPacking(parseInt(e.target.value) || 1)} min="1" required />
                <div className="flex items-center gap-2 mt-1.5">
                  <input 
                    type="checkbox" 
                    id="freePacking" 
                    className="w-3.5 h-3.5 accent-emerald-600"
                    checked={isFreePacking}
                    onChange={e => setIsFreePacking(e.target.checked)}
                  />
                  <label htmlFor="freePacking" className="text-[11px] font-bold text-emerald-600 cursor-pointer uppercase tracking-tight">Gratis Packing?</label>
                </div>
              </div>
              <div className="flex-1">
                <label className="block font-semibold text-gray-700 mb-2">Biaya Ongkir (Per KG)</label>
                <input type="number" className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                  value={ongkir} onChange={e => setOngkir(e.target.value === '' ? '' : parseInt(e.target.value) || 0)} min="0" step="1" required placeholder="Contoh: 18000" />
              </div>
            </div>

            <div className="mb-5">
              <label className="block font-semibold text-gray-700 mb-2">Kurir / Ekspedisi</label>
              <div className="flex flex-col sm:flex-row gap-3">
                <select className="flex-2 w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none bg-white"
                  value={kurirId} onChange={handleCourierChange} required>
                  <option value="">-- Pilih Kurir --</option>
                  {couriers.map(c => (
                    <option key={c.pk} value={c.pk}>{c.nama_kurir} {c.jenis_layanan}</option>
                  ))}
                </select>
                <input type="number" className="flex-1 w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                  value={estimasi} onChange={e => setEstimasi(e.target.value)} placeholder="Est. hari" min="1" required />
              </div>
            </div>

            <div className="mt-8">
              <label className="block font-semibold text-gray-700 mb-2">Pilih Hamster (Akan di Hold)</label>
              <input type="text" className="w-full px-4 py-3 border-2 border-blue-400 rounded-lg focus:border-blue-600 outline-none font-bold mb-3 placeholder-gray-400"
                value={searchTerm} onChange={e => setSearchTerm(e.target.value)} onKeyDown={handleSearchKeyDown}
                placeholder="Ketik Kode & Enter (misal: A-6, A-5)" />

              <div ref={listRef} className="max-h-80 overflow-y-auto border border-gray-200 rounded-lg p-2 bg-gray-50">
                {inventory.length === 0 ? (
                  <div className="p-4 text-center text-gray-500 italic">Tidak ada hamster "Tersedia".</div>
                ) : inventory.map(item => {
                  const isSelected = selectedHamsters.has(item.inventory_id);
                  return (
                    <label key={item.inventory_id} id={`hamster-item-${item.inventory_id}`} className={`flex items-center p-3 border mb-2 rounded-lg cursor-pointer transition ${isSelected ? 'bg-green-100 border-green-500' : 'bg-white border-gray-200 hover:bg-gray-100'}`}>
                      <input type="checkbox" className="mr-4 w-5 h-5 cursor-pointer accent-green-600"
                        checked={isSelected}
                        onChange={() => {
                          const newSelected = new Set(selectedHamsters);
                          if (isSelected) newSelected.delete(item.inventory_id);
                          else newSelected.add(item.inventory_id);
                          setSelectedHamsters(newSelected);
                        }} />
                      <div className="flex-1 text-sm">
                        <strong>{item.kode_hamster}</strong> - {item.spesies} ({item.varian_warna})<br />
                        <span className="text-gray-500">{item.jenis_kelamin} | {item.usia_bulan} bln</span>
                      </div>
                      <div className="font-bold text-green-600">Rp {formatRupiah(item.harga_display)}</div>
                    </label>
                  );
                })}
              </div>
            </div>

            <button type="submit" disabled={isSubmitting} className={`w-full py-4 mt-6 rounded-lg text-white font-bold text-lg shadow-md transition ${isSubmitting ? 'bg-gray-400' : 'bg-orange-600 hover:bg-orange-700'}`}>
              {isSubmitting ? "⏳ Memproses..." : "Simpan & Salin Invoice"}
            </button>
          </form>
        </div>

        {/* Preview Kanan */}
        <div className="w-full lg:w-[400px] flex flex-col items-center lg:sticky lg:top-8">
          <h3 className="text-lg font-bold text-gray-800 mb-6">Preview Invoice Gambar</h3>

          {copyStatus && <div className="mb-4 text-green-600 font-bold bg-green-100 px-4 py-2 rounded-full">{copyStatus}</div>}

          <div ref={canvasRef} style={{ background: '#ffffff', width: '100%', padding: '32px', borderRadius: '16px', position: 'relative', overflow: 'hidden', fontFamily: 'system-ui, -apple-system, sans-serif', border: '1px solid #f3f4f6', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '8px', background: 'linear-gradient(to right, #f97316, #fb923c, #fbbf24)' }}></div>

            <div style={{ textAlign: 'center', borderBottom: '2px dashed #e5e7eb', paddingBottom: '20px', marginBottom: '20px', marginTop: '8px' }}>
              <h2 style={{ margin: 0, color: '#ea580c', fontSize: '24px', fontWeight: 900, letterSpacing: '0.05em' }}>NOSKA HAMSTER</h2>
              <p style={{ marginTop: '4px', fontSize: '11px', color: '#6b7280', fontWeight: 700, letterSpacing: '0.15em' }}>INVOICE PEMBELIAN</p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '24px', color: '#4b5563' }}>
              <span>{new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              <span style={{ fontWeight: 700, color: '#111827' }}>{wa || "Customer"}</span>
            </div>

            <div style={{ minHeight: '100px', marginBottom: '24px' }}>
              {selectedHamsterObjects.length === 0 && (
                <div style={{ textAlign: 'center', color: '#9ca3af', fontStyle: 'italic', padding: '16px 0', fontSize: '14px' }}>Belum ada pesanan...</div>
              )}
              {selectedHamsterObjects.map(h => (
                <div key={h.inventory_id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '16px' }}>
                  <div style={{ flex: 1, paddingRight: '16px' }}>
                    <div style={{ fontWeight: 700, color: '#111827' }}>{h.kode_hamster}</div>
                    <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px', lineHeight: 1.3 }}>{h.spesies} - {h.varian_warna} - {h.jenis_kelamin} - {h.usia_bulan} bln</div>
                  </div>
                  <div style={{ fontWeight: 700, color: '#374151', whiteSpace: 'nowrap' }}>Rp {formatRupiah(Number(h.harga_display))}</div>
                </div>
              ))}

              {safeQtyPacking > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', paddingTop: '4px', marginBottom: '16px' }}>
                  <div style={{ color: '#4b5563' }}>Packing {safeQtyPacking} box</div>
                  <div style={{ fontWeight: 700, color: isFreePacking ? '#10b981' : '#374151' }}>
                    {isFreePacking ? 'GRATIS' : `Rp ${formatRupiah(totalPacking)}`}
                  </div>
                </div>
              )}

              {(totalOngkir > 0 || kurirId) && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', paddingTop: '4px' }}>
                  <div style={{ color: '#4b5563' }}>Ongkir {getKurirText()}</div>
                  <div style={{ fontWeight: 700, color: '#374151' }}>{totalOngkir > 0 ? `Rp ${formatRupiah(totalOngkir)}` : <span style={{ color: '#9ca3af', fontWeight: 400, fontSize: '11px' }}>(Belum dihitung)</span>}</div>
                </div>
              )}
            </div>

            <div style={{ borderTop: '2px dashed #e5e7eb', paddingTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '15px', fontWeight: 900, color: '#1f2937' }}>TOTAL</span>
              <span style={{ fontSize: '20px', fontWeight: 900, color: '#ea580c' }}>Rp {formatRupiah(grandTotal)}</span>
            </div>

            <div style={{ textAlign: 'center', marginTop: '32px', fontSize: '11px', color: '#9ca3af' }}>
              Terima kasih telah berbelanja di Noska Hamster! 🐹
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
