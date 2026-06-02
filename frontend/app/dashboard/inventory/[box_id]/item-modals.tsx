"use client";

import { useState, useEffect, useRef } from 'react';
import { ModalOverlay, ConfirmModal, AlertModal } from '../modals';

// ── Edit Item Modal ──
const KELAMIN_OPTS = ["Jantan", "Betina", "Belum Diketahui"];
const GRADE_OPTS = ["S+", "A", "B", "C"];
const USIA_OPTS = ["1.0","1.5","2.0","2.5","3.0","3.5","4.0","4.5","5.0","5.5","6.0"];

export function EditItemModal({ item, variants, onClose, onSuccess }: {
  item: any; variants: any[]; onClose: () => void; onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    variant_id: String(item.variant_id || ""),
    jenis_kelamin: item.jenis_kelamin || "Belum Diketahui",
    usia_bulan: item.usia_bulan ? String(item.usia_bulan) : "",
    grade_corak: item.grade_corak || "",
    harga_display: String(item.harga_display || ""),
    kondisi_fisik: item.kondisi_fisik || "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true); setError("");
    try {
      const res = await fetch(`/api/dashboard/items/${item.inventory_id}/`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          variant_id: Number(form.variant_id) || undefined,
          jenis_kelamin: form.jenis_kelamin,
          usia_bulan: form.usia_bulan || null,
          grade_corak: form.grade_corak || null,
          harga_display: Number(form.harga_display) || 0,
          kondisi_fisik: form.kondisi_fisik,
        }),
      });
      if (res.ok) { onSuccess(); onClose(); }
      else { const err = await res.json(); setError(err.error || "Gagal menyimpan."); }
    } catch { setError("Kesalahan koneksi."); }
    finally { setSubmitting(false); }
  };

  const inputCls = "w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition text-gray-900 font-medium text-sm bg-white";

  return (
    <ModalOverlay>
      <form onSubmit={handleSubmit}>
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">Edit Item</h3>
          <p className="text-sm text-gray-500 mb-4">Kode: <strong>{item.kode_hamster}</strong></p>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Varian</label>
              <select value={form.variant_id} onChange={e => setForm({...form, variant_id: e.target.value})} className={inputCls}>
                <option value="">— Pilih Varian —</option>
                {variants.map(v => <option key={v.variant_id} value={v.variant_id}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Harga Display (Rp)</label>
              <input type="number" value={form.harga_display} onChange={e => setForm({...form, harga_display: e.target.value})} className={inputCls} min={0} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Jenis Kelamin</label>
                <select value={form.jenis_kelamin} onChange={e => setForm({...form, jenis_kelamin: e.target.value})} className={inputCls}>
                  {KELAMIN_OPTS.map(k => <option key={k} value={k}>{k}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Usia (Bulan)</label>
                <select value={form.usia_bulan} onChange={e => setForm({...form, usia_bulan: e.target.value})} className={inputCls}>
                  <option value="">—</option>
                  {USIA_OPTS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Grade Corak</label>
              <select value={form.grade_corak} onChange={e => setForm({...form, grade_corak: e.target.value})} className={inputCls}>
                <option value="">—</option>
                {GRADE_OPTS.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Kondisi Fisik</label>
              <textarea value={form.kondisi_fisik} onChange={e => setForm({...form, kondisi_fisik: e.target.value})} className={inputCls + " resize-none"} rows={2} />
            </div>
          </div>
          {error && <p className="mt-3 text-sm text-red-600 font-medium">{error}</p>}
        </div>
        <div className="flex gap-3 px-6 pb-6">
          <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 text-sm font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition">Batal</button>
          <button type="submit" disabled={submitting} className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-orange-600 hover:bg-orange-700 rounded-xl transition disabled:opacity-50">
            {submitting ? "Menyimpan..." : "Simpan"}
          </button>
        </div>
      </form>
    </ModalOverlay>
  );
}

// ── Move Box Modal ──
export function MoveBoxModal({ item, boxes, onClose, onSuccess }: {
  item: any; boxes: any[]; onClose: () => void; onSuccess: () => void;
}) {
  const [selectedBoxId, setSelectedBoxId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const otherBoxes = boxes.filter(b => b.box_id !== item.box_id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBoxId) { setError("Pilih box tujuan."); return; }
    setSubmitting(true); setError("");
    try {
      const res = await fetch(`/api/dashboard/items/${item.inventory_id}/`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ box_id: Number(selectedBoxId) }),
      });
      if (res.ok) { onSuccess(); onClose(); }
      else { const err = await res.json(); setError(err.error || "Gagal memindahkan."); }
    } catch { setError("Kesalahan koneksi."); }
    finally { setSubmitting(false); }
  };

  return (
    <ModalOverlay>
      <form onSubmit={handleSubmit}>
        <div className="p-6">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">Pindah Box</h3>
          <p className="text-sm text-gray-500 mb-4">Pindahkan <strong>{item.kode_hamster}</strong> ke box lain.</p>
          {otherBoxes.length === 0 ? (
            <p className="text-sm text-gray-500 italic">Tidak ada box lain di sesi ini.</p>
          ) : (
            <div className="space-y-2">
              {otherBoxes.map(b => (
                <label key={b.box_id} className={`flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition ${selectedBoxId === String(b.box_id) ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <input type="radio" name="box" value={b.box_id} checked={selectedBoxId === String(b.box_id)} onChange={() => setSelectedBoxId(String(b.box_id))} className="accent-blue-600 w-4 h-4" />
                  <div>
                    <div className="text-sm font-bold text-gray-900">Box {b.nama_box}</div>
                    <div className="text-xs text-gray-500">{b.spesies || ""} {b.kategori_box || ""}</div>
                  </div>
                </label>
              ))}
            </div>
          )}
          {error && <p className="mt-3 text-sm text-red-600 font-medium">{error}</p>}
        </div>
        <div className="flex gap-3 px-6 pb-6">
          <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 text-sm font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition">Batal</button>
          <button type="submit" disabled={submitting || otherBoxes.length === 0} className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition disabled:opacity-50">
            {submitting ? "Memindahkan..." : "Pindahkan"}
          </button>
        </div>
      </form>
    </ModalOverlay>
  );
}

// ── Upload Media Modal ──
export function UploadMediaModal({ item, onClose, onSuccess }: {
  item: any; onClose: () => void; onSuccess: () => void;
}) {
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState("");

  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setFotoFile(f);
    setFotoPreview(f ? URL.createObjectURL(f) : null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fotoFile && !videoFile) { setError("Pilih setidaknya satu file."); return; }
    setSubmitting(true); setError(""); setProgress("Mengupload...");

    try {
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
      if (!cloudName || !uploadPreset) throw new Error("Konfigurasi Cloudinary tidak ditemukan.");

      let fotoUrl = null, videoUrl = null;

      const uploadToCloud = async (file: File) => {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("upload_preset", uploadPreset);
        const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, { method: "POST", body: fd });
        if (!res.ok) throw new Error("Upload gagal");
        return (await res.json()).secure_url;
      };

      if (fotoFile) { setProgress("Mengupload foto..."); fotoUrl = await uploadToCloud(fotoFile); }
      if (videoFile) { setProgress("Mengupload video..."); videoUrl = await uploadToCloud(videoFile); }

      setProgress("Menyimpan ke database...");
      const res = await fetch(`/api/dashboard/inventory/${item.inventory_id}/upload/`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ foto_url: fotoUrl, video_url: videoUrl }),
      });
      if (res.ok) { onSuccess(); onClose(); }
      else { const err = await res.json(); setError(err.error || "Gagal menyimpan."); }
    } catch (e: any) { setError(e.message || "Kesalahan upload."); }
    finally { setSubmitting(false); setProgress(""); }
  };

  return (
    <ModalOverlay>
      <form onSubmit={handleSubmit}>
        <div className="p-6">
          <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">Ganti Foto/Video</h3>
          <p className="text-sm text-gray-500 mb-4">Upload media baru untuk <strong>{item.kode_hamster}</strong>.</p>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase mb-1.5">Foto</label>
              <input type="file" accept="image/*" onChange={handleFotoChange} className="text-sm text-gray-600" />
              {fotoPreview && <img src={fotoPreview} className="mt-2 w-24 h-24 object-cover rounded-xl border" alt="preview" />}
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase mb-1.5">Video</label>
              <input type="file" accept="video/*" onChange={e => setVideoFile(e.target.files?.[0] || null)} className="text-sm text-gray-600" />
            </div>
          </div>
          {progress && <p className="mt-3 text-sm text-blue-600 font-medium">{progress}</p>}
          {error && <p className="mt-3 text-sm text-red-600 font-medium">{error}</p>}
        </div>
        <div className="flex gap-3 px-6 pb-6">
          <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 text-sm font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition">Batal</button>
          <button type="submit" disabled={submitting} className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl transition disabled:opacity-50">
            {submitting ? "Mengupload..." : "Upload"}
          </button>
        </div>
      </form>
    </ModalOverlay>
  );
}

// ── Item Kebab Menu Component ──
export function ItemKebabMenu({ item, variants, boxes, onRefresh, onAlert }: {
  item: any; variants: any[]; boxes: any[];
  onRefresh: () => void;
  onAlert: (a: { title: string; message: string; type: "error" | "success" }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [modal, setModal] = useState<"edit" | "move" | "upload" | "delete" | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const canToggleStatus = item.status_ketersediaan === "Tersedia" || item.status_ketersediaan === "Disembunyikan";
  const isHidden = item.status_ketersediaan === "Disembunyikan";

  const handleToggleStatus = async () => {
    setOpen(false);
    const newStatus = isHidden ? "Tersedia" : "Disembunyikan";
    try {
      const res = await fetch(`/api/dashboard/items/${item.inventory_id}/`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status_ketersediaan: newStatus }),
      });
      if (res.ok) onRefresh();
      else { const err = await res.json(); onAlert({ title: "Gagal", message: err.error, type: "error" }); }
    } catch { onAlert({ title: "Gagal", message: "Kesalahan koneksi.", type: "error" }); }
  };

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/dashboard/items/${item.inventory_id}/`, { method: 'DELETE' });
      if (res.ok) { setModal(null); onRefresh(); }
      else { const err = await res.json(); setModal(null); onAlert({ title: "Gagal", message: err.error, type: "error" }); }
    } catch { setModal(null); onAlert({ title: "Gagal", message: "Kesalahan koneksi.", type: "error" }); }
  };

  return (
    <>
      <div ref={menuRef} className="absolute top-3 right-3 z-20">
        <button onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
          className="p-1.5 rounded-lg bg-white/80 backdrop-blur-sm text-gray-500 hover:text-gray-800 hover:bg-white shadow-sm transition">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zm0 6a2 2 0 110-4 2 2 0 010 4zm0 6a2 2 0 110-4 2 2 0 010 4z" />
          </svg>
        </button>
        {open && (
          <div className="absolute right-0 top-9 z-50 w-48 bg-white rounded-xl border border-gray-200 shadow-lg py-1.5">
            {canToggleStatus && (
              <button onClick={handleToggleStatus}
                className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition">
                {isHidden ? (
                  <><span className="w-4 h-4 flex items-center justify-center"><span className="w-2.5 h-2.5 rounded-full bg-green-500"></span></span>Tampilkan</>
                ) : (
                  <><span className="w-4 h-4 flex items-center justify-center"><span className="w-2.5 h-2.5 rounded-full bg-gray-400"></span></span>Sembunyikan</>
                )}
              </button>
            )}
            <button onClick={() => { setOpen(false); setModal("edit"); }}
              className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition">
              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>Edit Item
            </button>
            <button onClick={() => { setOpen(false); setModal("upload"); }}
              className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition">
              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>Ganti Foto/Video
            </button>
            <button onClick={() => { setOpen(false); setModal("move"); }}
              className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition">
              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>Pindah Box
            </button>
            <div className="border-t border-gray-100 my-1"></div>
            <button onClick={() => { setOpen(false); setModal("delete"); }}
              className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>Hapus Item
            </button>
          </div>
        )}
      </div>

      {/* Modals */}
      {modal === "edit" && <EditItemModal item={item} variants={variants} onClose={() => setModal(null)} onSuccess={onRefresh} />}
      {modal === "upload" && <UploadMediaModal item={item} onClose={() => setModal(null)} onSuccess={onRefresh} />}
      {modal === "move" && <MoveBoxModal item={item} boxes={boxes} onClose={() => setModal(null)} onSuccess={onRefresh} />}
      {modal === "delete" && (
        <ConfirmModal title="Hapus Item" message={`Hapus item "${item.kode_hamster}"? Aksi ini tidak bisa dibatalkan.`}
          confirmLabel="Hapus" confirmColor="red" onClose={() => setModal(null)} onConfirm={handleDelete} />
      )}
    </>
  );
}
