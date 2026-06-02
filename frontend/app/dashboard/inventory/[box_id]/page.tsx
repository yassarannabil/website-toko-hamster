"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import HamsterCard from '../../../components/HamsterCard';
import { ItemKebabMenu } from './item-modals';
import { AlertModal } from '../modals';

interface VariantOption {
  variant_id: number;
  label: string;
  spesies: string;
  varian_warna: string;
  jenis_bulu: string;
  is_satin: boolean;
}

export default function BoxInventoryPage() {
  const params = useParams();
  const boxId = params.box_id;
  
  const [inventory, setInventory] = useState<any[]>([]);
  const [boxInfo, setBoxInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sessionBoxes, setSessionBoxes] = useState<any[]>([]);
  const [alertModal, setAlertModal] = useState<{ title: string; message: string; type: "error" | "success" } | null>(null);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [variants, setVariants] = useState<VariantOption[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [fotoPreviewUrl, setFotoPreviewUrl] = useState<string | null>(null);
  const [pendingUploads, setPendingUploads] = useState(0);
  const uploadQueueRef = useRef<Array<{ itemId: number; kode: string; foto: File | null; video: File | null }>>([])
  const isUploadingRef = useRef(false);

  // Form state
  const [formData, setFormData] = useState({
    variant_id: "",
    jenis_kelamin: "Belum Diketahui",
    usia_bulan: "",
    grade_corak: "",
    harga_display: "",
    kondisi_fisik: "",
  });

  const fetchInventory = async () => {
    try {
      const res = await fetch(`/api/dashboard/boxes/${boxId}/items/`);
      if (res.ok) {
        const data = await res.json();
        setInventory(data.results || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchBoxInfo = async () => {
    try {
      const res = await fetch('/api/boxes/');
      if (res.ok) {
        const data = await res.json();
        const found = (data.results || []).find((b: any) => String(b.box_id) === String(boxId));
        if (found) setBoxInfo(found);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchVariants = async () => {
    try {
      const res = await fetch('/api/dashboard/variants/');
      if (res.ok) {
        const data = await res.json();
        setVariants(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (boxId) {
      fetchBoxInfo();
      fetchInventory();
      fetchVariants();
    }
  }, [boxId]);

  // Fetch boxes for the same session (for Move Box)
  useEffect(() => {
    if (boxInfo?.session) {
      fetch(`/api/dashboard/sessions/${boxInfo.session}/boxes/`)
        .then(r => r.ok ? r.json() : [])
        .then(d => setSessionBoxes(d || []))
        .catch(() => {});
    }
  }, [boxInfo]);

  const openModal = () => {
    fetchVariants();
    setFormData({
      variant_id: "",
      jenis_kelamin: "Belum Diketahui",
      usia_bulan: "",
      grade_corak: "",
      harga_display: "",
      kondisi_fisik: "",
    });
    setSuccessMsg("");
    setFotoFile(null);
    setVideoFile(null);
    setFotoPreviewUrl(null);
    setShowModal(true);
  };

  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setFotoFile(file);
    if (file) {
      setFotoPreviewUrl(URL.createObjectURL(file));
    } else {
      setFotoPreviewUrl(null);
    }
  };

  // Sequential upload processor
  const processUploadQueue = async () => {
    if (isUploadingRef.current) return;
    isUploadingRef.current = true;

    while (uploadQueueRef.current.length > 0) {
      const job = uploadQueueRef.current[0];
      try {
        let fotoPublicId = null;
        let videoPublicId = null;

        const uploadToCloudinary = async (file: File) => {
          const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
          const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
          if (!cloudName || !uploadPreset) throw new Error("Konfigurasi Cloudinary tidak ditemukan di frontend.");
          
          const formData = new FormData();
          formData.append("file", file);
          formData.append("upload_preset", uploadPreset);

          console.log(`Mengupload file ke Cloudinary (${file.name})...`);
          const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
            method: "POST",
            body: formData,
          });
          
          if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`Cloudinary error: ${res.status} ${errorText}`);
          }
          
          const data = await res.json();
          return data.secure_url;
        };

        if (job.foto) {
          fotoPublicId = await uploadToCloudinary(job.foto);
        }
        if (job.video) {
          videoPublicId = await uploadToCloudinary(job.video);
        }

        console.log(`Menyimpan tautan media ${job.kode} ke database...`);
        const res = await fetch(`/api/dashboard/inventory/${job.itemId}/upload/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
              foto_url: fotoPublicId,
              video_url: videoPublicId
          })
        });

        if (!res.ok) {
          const rawText = await res.text().catch(() => "");
          let errData: any = {};
          try { errData = JSON.parse(rawText); } catch { }
          
          console.error(`Simpan link gagal untuk ${job.kode}:`, { status: res.status, text: rawText });
          alert(`Gagal menyimpan link media untuk ${job.kode}. [Status: ${res.status}] Error: ${errData.error || rawText || res.statusText || 'Unknown Error'}`);
        } else {
          console.log(`Upload success for ${job.kode}`);
          setSuccessMsg(`${job.kode} — media berhasil diupload!`);
        }
      } catch (err: any) {
        console.error(`Kesalahan upload ${job.kode}:`, err);
        alert(`Gagal memproses media untuk ${job.kode}. Pesan: ${err.message}`);
      }
      
      uploadQueueRef.current.shift();
      setPendingUploads(uploadQueueRef.current.length);
      fetchInventory();
      
      // Small delay between uploads to avoid proxy congestion
      if (uploadQueueRef.current.length > 0) {
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    isUploadingRef.current = false;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSuccessMsg("");

    try {
      // Step 1: Create item (JSON, no files — instant)
      const res = await fetch('/api/dashboard/inventory/add/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          box_id: Number(boxId),
          variant_id: Number(formData.variant_id),
          jenis_kelamin: formData.jenis_kelamin,
          usia_bulan: formData.usia_bulan || null,
          grade_corak: formData.grade_corak || null,
          harga_display: Number(formData.harga_display) || 0,
          kondisi_fisik: formData.kondisi_fisik,
        }),
      });

      if (res.ok) {
        const result = await res.json();
        const hasFiles = !!(fotoFile || videoFile);
        setSuccessMsg(`${result.kode_hamster || 'Item'} berhasil ditambahkan!`);
        
        // Step 2: Queue file upload (sequential, non-blocking)
        if (hasFiles) {
          uploadQueueRef.current.push({
            itemId: result.inventory_id,
            kode: result.kode_hamster || 'Item',
            foto: fotoFile,
            video: videoFile,
          });
          setPendingUploads(uploadQueueRef.current.length);
          processUploadQueue();
        }

        // Reset form immediately
        setFormData({
          variant_id: "",
          jenis_kelamin: "Belum Diketahui",
          usia_bulan: "",
          grade_corak: "",
          harga_display: "",
          kondisi_fisik: "",
        });
        setFotoFile(null);
        setVideoFile(null);
        setFotoPreviewUrl(null);
        const fotoInput = document.getElementById('foto-input') as HTMLInputElement;
        const videoInput = document.getElementById('video-input') as HTMLInputElement;
        if (fotoInput) fotoInput.value = '';
        if (videoInput) videoInput.value = '';
        fetchInventory();
      } else {
        const err = await res.json();
        alert(err.error || "Gagal menambahkan item.");
      }
    } catch {
      alert("Terjadi kesalahan koneksi.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-8 text-gray-500 font-medium">Memuat hamster di dalam box...</div>;

  return (
    <div className="max-w-7xl mx-auto">
      {alertModal && <AlertModal {...alertModal} onClose={() => setAlertModal(null)} />}
      <Link 
        href={boxInfo ? `/dashboard/inventory?session_id=${boxInfo.session}` : "/dashboard/inventory"} 
        className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-orange-600 mb-6 transition-colors"
      >
        <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Kembali ke Daftar Box
      </Link>

      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 sm:mb-8">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">
            {boxInfo
              ? (boxInfo.nama_box.toLowerCase() === "aksesoris" || boxInfo.spesies === "Perlengkapan"
                  ? boxInfo.nama_box
                  : `Box ${boxInfo.nama_box}`)
              : `Box ${boxId}`}
          </h2>
          <p className="text-gray-500 mt-2 text-sm font-medium">Menampilkan seluruh hamster di dalam box ini.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={openModal}
            className="bg-orange-600 text-white px-4 sm:px-5 py-2.5 rounded-xl font-bold hover:bg-orange-700 transition shadow-sm flex items-center gap-2 text-sm sm:text-base w-full sm:w-auto justify-center"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Tambah Item
          </button>

        </div>
      </div>

      {inventory.length === 0 ? (
        <div className="bg-white p-10 sm:p-16 text-center rounded-2xl border border-gray-200 shadow-sm">
          <span className="text-4xl mb-4 block">🐹</span>
          <p className="text-gray-500 font-medium italic">Tidak ada hamster di dalam box ini.</p>
          <button
            onClick={openModal}
            className="mt-4 inline-flex items-center gap-2 bg-orange-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-orange-700 transition"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Tambah Item Pertama
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {inventory.map((item) => (
            <div key={item.inventory_id} className="relative">
              <HamsterCard item={item} isAdminView={true} />
              <ItemKebabMenu
                item={item}
                variants={variants}
                boxes={sessionBoxes}
                onRefresh={fetchInventory}
                onAlert={setAlertModal}
              />
            </div>
          ))}
        </div>
      )}

      {/* ───── Modal Tambah Item ───── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-xl font-bold text-gray-900">Tambah Item ke Box</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Success message */}
            {successMsg && (
              <div className="mx-6 mt-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2">
                <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {successMsg}
              </div>
            )}

            {/* Pending Uploads Banner */}
            {pendingUploads > 0 && (
              <div className="mx-6 mt-4 bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-3">
                <div className="h-4 w-4 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin flex-shrink-0" />
                <span>Sedang mengupload media untuk {pendingUploads} item terakhir...</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Varian */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Varian Genetik *</label>
                <select
                  required
                  value={formData.variant_id}
                  onChange={(e) => setFormData({ ...formData, variant_id: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                >
                  <option value="">-- Pilih Varian --</option>
                  {variants.map((v) => (
                    <option key={v.variant_id} value={v.variant_id}>
                      {v.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Jenis Kelamin */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Jenis Kelamin</label>
                <select
                  value={formData.jenis_kelamin}
                  onChange={(e) => setFormData({ ...formData, jenis_kelamin: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                >
                  <option value="Jantan">Jantan</option>
                  <option value="Betina">Betina</option>
                  <option value="Belum Diketahui">Belum Diketahui</option>
                </select>
              </div>

              {/* Row: Usia + Grade */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Usia (Bulan)</label>
                  <select
                    value={formData.usia_bulan}
                    onChange={(e) => setFormData({ ...formData, usia_bulan: e.target.value })}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                  >
                    <option value="">-- Opsional --</option>
                    {[1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0, 5.5, 6.0].map((u) => (
                      <option key={u} value={u.toFixed(1)}>{u.toFixed(1)} Bulan</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Grade Corak</label>
                  <select
                    value={formData.grade_corak}
                    onChange={(e) => setFormData({ ...formData, grade_corak: e.target.value })}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                  >
                    <option value="">-- Opsional --</option>
                    <option value="S+">S+</option>
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="C">C</option>
                  </select>
                </div>
              </div>

              {/* Harga */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Harga Display (Rp) *</label>
                <input
                  type="number"
                  required
                  min={0}
                  placeholder="Contoh: 175000"
                  value={formData.harga_display}
                  onChange={(e) => setFormData({ ...formData, harga_display: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                />
              </div>

              {/* Kondisi Fisik */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Kondisi Fisik</label>
                <textarea
                  rows={2}
                  placeholder="Catatan kondisi (opsional)"
                  value={formData.kondisi_fisik}
                  onChange={(e) => setFormData({ ...formData, kondisi_fisik: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none resize-none"
                />
              </div>

              {/* Foto Preview */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Foto Preview</label>
                <div className="flex items-center gap-4">
                  <label className="cursor-pointer flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-gray-300 hover:border-orange-400 hover:bg-orange-50 transition text-sm text-gray-600">
                    <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                    </svg>
                    {fotoFile ? fotoFile.name : "Pilih Foto..."}
                    <input
                      id="foto-input"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFotoChange}
                    />
                  </label>
                  {fotoPreviewUrl && (
                    <img src={fotoPreviewUrl} alt="Preview" className="h-16 w-16 rounded-lg object-cover border border-gray-200" />
                  )}
                </div>
              </div>

              {/* Video */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Video</label>
                <label className="cursor-pointer flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-gray-300 hover:border-orange-400 hover:bg-orange-50 transition text-sm text-gray-600">
                  <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25z" />
                  </svg>
                  {videoFile ? videoFile.name : "Pilih Video..."}
                  <input
                    id="video-input"
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                  />
                </label>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-orange-600 text-white py-3 rounded-xl font-bold hover:bg-orange-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    "Simpan"
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-6 py-3 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition"
                >
                  Tutup
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
