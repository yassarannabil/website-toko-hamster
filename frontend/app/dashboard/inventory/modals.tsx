"use client";

import { useState, useEffect, useRef } from 'react';

// ── Shared Modal Overlay ──
export function ModalOverlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-md overflow-hidden">
        {children}
      </div>
    </div>
  );
}

// ── Alert Modal ──
export function AlertModal({ title, message, type, onClose }: {
  title: string; message: string; type: "error" | "success"; onClose: () => void;
}) {
  const isError = type === "error";
  return (
    <ModalOverlay>
      <div className="p-6">
        <div className={`w-12 h-12 ${isError ? 'bg-red-100' : 'bg-green-100'} rounded-xl flex items-center justify-center mb-4`}>
          <svg className={`w-6 h-6 ${isError ? 'text-red-600' : 'text-green-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d={isError ? "M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" : "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"} />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-1">{title}</h3>
        <p className="text-sm text-gray-500 leading-relaxed">{message}</p>
      </div>
      <div className="px-6 pb-6">
        <button onClick={onClose} className={`w-full px-4 py-2.5 text-sm font-bold text-white ${isError ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'} rounded-xl transition`}>
          OK
        </button>
      </div>
    </ModalOverlay>
  );
}

// ── Confirm Modal ──
export function ConfirmModal({ title, message, confirmLabel, confirmColor, onClose, onConfirm }: {
  title: string; message: string; confirmLabel: string;
  confirmColor: "orange" | "red" | "green";
  onClose: () => void; onConfirm: () => Promise<void> | void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const colorMap = {
    orange: { bg: "bg-orange-100", icon: "text-orange-600", btn: "bg-orange-600 hover:bg-orange-700" },
    red: { bg: "bg-red-100", icon: "text-red-600", btn: "bg-red-600 hover:bg-red-700" },
    green: { bg: "bg-green-100", icon: "text-green-600", btn: "bg-green-600 hover:bg-green-700" },
  };
  const colors = colorMap[confirmColor];
  const iconPaths: Record<string, string> = {
    orange: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z",
    red: "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16",
    green: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
  };
  const handleConfirm = async () => {
    setSubmitting(true);
    try { await onConfirm(); } finally { setSubmitting(false); }
  };
  return (
    <ModalOverlay>
      <div className="p-6">
        <div className={`w-12 h-12 ${colors.bg} rounded-xl flex items-center justify-center mb-4`}>
          <svg className={`w-6 h-6 ${colors.icon}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d={iconPaths[confirmColor]} />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-1">{title}</h3>
        <p className="text-sm text-gray-500 leading-relaxed">{message}</p>
      </div>
      <div className="flex gap-3 px-6 pb-6">
        <button onClick={onClose} className="flex-1 px-4 py-2.5 text-sm font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition">Batal</button>
        <button onClick={handleConfirm} disabled={submitting} className={`flex-1 px-4 py-2.5 text-sm font-bold text-white ${colors.btn} rounded-xl transition disabled:opacity-50`}>
          {submitting ? "Memproses..." : confirmLabel}
        </button>
      </div>
    </ModalOverlay>
  );
}

// ── Rename Session Modal ──
export function RenameModal({ session, onClose, onSuccess, onError }: {
  session: any; onClose: () => void; onSuccess: () => void; onError: (msg: string) => void;
}) {
  const [name, setName] = useState(session.nama_sesi);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.select(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || name === session.nama_sesi) { onClose(); return; }
    setSubmitting(true); setError("");
    try {
      const res = await fetch(`/api/dashboard/sessions/${session.session_id}/`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nama_sesi: name.trim() }),
      });
      if (res.ok) { onSuccess(); onClose(); }
      else { const err = await res.json(); setError(err.error || "Gagal."); }
    } catch { setError("Kesalahan koneksi."); }
    finally { setSubmitting(false); }
  };

  return (
    <ModalOverlay>
      <form onSubmit={handleSubmit}>
        <div className="p-6">
          <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">Ubah Nama Sesi</h3>
          <p className="text-sm text-gray-500 mb-4">Masukkan nama baru untuk sesi ini.</p>
          <input ref={inputRef} type="text" value={name} onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition text-gray-900 font-medium"
            placeholder="Nama sesi..." autoFocus />
          {error && <p className="mt-2 text-sm text-red-600 font-medium">{error}</p>}
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

// ── Create Session Modal ──
export function CreateSessionModal({ sessions, onClose, onSuccess, onError }: {
  sessions: any[]; onClose: () => void; onSuccess: () => void; onError: (msg: string) => void;
}) {
  const generateDefaultName = () => {
    const today = new Date();
    const base = today.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    const existing = sessions.filter(s => s.nama_sesi === base || s.nama_sesi.startsWith(base + " - "));
    if (existing.length === 0) return base;
    return `${base} - ${existing.length + 1}`;
  };

  const [name, setName] = useState(generateDefaultName());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.select(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError("Nama sesi tidak boleh kosong."); return; }
    setSubmitting(true); setError("");
    try {
      const res = await fetch('/api/dashboard/sessions/', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nama_sesi: name.trim() }),
      });
      if (res.ok) { onSuccess(); onClose(); }
      else { const err = await res.json(); setError(err.error || "Gagal membuat sesi."); }
    } catch { setError("Kesalahan koneksi."); }
    finally { setSubmitting(false); }
  };

  return (
    <ModalOverlay>
      <form onSubmit={handleSubmit}>
        <div className="p-6">
          <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">Buat Sesi Baru</h3>
          <p className="text-sm text-gray-500 mb-4">Masukkan nama untuk sesi live baru.</p>
          <input ref={inputRef} type="text" value={name} onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition text-gray-900 font-medium"
            placeholder="Nama sesi..." autoFocus />
          {error && <p className="mt-2 text-sm text-red-600 font-medium">{error}</p>}
        </div>
        <div className="flex gap-3 px-6 pb-6">
          <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 text-sm font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition">Batal</button>
          <button type="submit" disabled={submitting} className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-green-600 hover:bg-green-700 rounded-xl transition disabled:opacity-50">
            {submitting ? "Membuat..." : "Buat Sesi"}
          </button>
        </div>
      </form>
    </ModalOverlay>
  );
}

// ── Duplicate Session Modal ──
export function DuplicateSessionModal({ session, onClose, onSuccess, onError }: {
  session: any; onClose: () => void; onSuccess: () => void; onError: (msg: string) => void;
}) {
  const [mode, setMode] = useState<"all" | "available_only">("all");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true); setError("");
    try {
      const res = await fetch(`/api/dashboard/sessions/${session.session_id}/duplicate/`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode }),
      });
      if (res.ok) { onSuccess(); onClose(); }
      else { const err = await res.json(); setError(err.error || "Gagal menduplikasi sesi."); }
    } catch { setError("Kesalahan koneksi."); }
    finally { setSubmitting(false); }
  };

  return (
    <ModalOverlay>
      <form onSubmit={handleSubmit}>
        <div className="p-6">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">Duplikat Sesi</h3>
          <p className="text-sm text-gray-500 mb-4">Pilih item mana yang ingin diduplikasi dari sesi <strong>"{session.nama_sesi}"</strong>.</p>
          
          <div className="space-y-3">
            <label className={`flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition ${mode === 'all' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
              <input type="radio" name="mode" checked={mode === 'all'} onChange={() => setMode('all')} className="accent-blue-600 w-4 h-4" />
              <div>
                <div className="text-sm font-bold text-gray-900">Duplikat semua item</div>
                <div className="text-xs text-gray-500">Termasuk item Terjual dan Hold</div>
              </div>
            </label>
            <label className={`flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition ${mode === 'available_only' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
              <input type="radio" name="mode" checked={mode === 'available_only'} onChange={() => setMode('available_only')} className="accent-blue-600 w-4 h-4" />
              <div>
                <div className="text-sm font-bold text-gray-900">Duplikat item Tersedia saja</div>
                <div className="text-xs text-gray-500">Hanya item dengan status "Tersedia"</div>
              </div>
            </label>
          </div>
          {error && <p className="mt-3 text-sm text-red-600 font-medium">{error}</p>}
        </div>
        <div className="flex gap-3 px-6 pb-6">
          <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 text-sm font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition">Batal</button>
          <button type="submit" disabled={submitting} className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition disabled:opacity-50">
            {submitting ? "Menduplikasi..." : "Duplikat"}
          </button>
        </div>
      </form>
    </ModalOverlay>
  );
}

// ── Box Form Modal (Create & Edit) ──
const SPESIES_OPTIONS = ["Syrian", "Campbell", "Winter White", "Roborovski", "Mix", "Perlengkapan"];
const KATEGORI_OPTIONS = ["Siapan", "Anakan", "Indukan", "Mix"];
const KELAMIN_OPTIONS = ["Jantan", "Betina", "Mix"];

export function BoxFormModal({ box, sessionId, onClose, onSuccess, onError }: {
  box?: any; sessionId: number; onClose: () => void; onSuccess: () => void; onError: (msg: string) => void;
}) {
  const isEdit = !!box;
  const [form, setForm] = useState({
    nama_box: box?.nama_box || "",
    spesies: box?.spesies || "",
    kategori_box: box?.kategori_box || "",
    jenis_kelamin_box: box?.jenis_kelamin_box || "",
    urutan: box?.urutan ?? 0,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nama_box.trim()) { setError("Nama box tidak boleh kosong."); return; }
    setSubmitting(true); setError("");
    
    const url = isEdit ? `/api/dashboard/boxes/${box.box_id}/` : `/api/dashboard/sessions/${sessionId}/boxes/`;
    const method = isEdit ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, nama_box: form.nama_box.trim() }),
      });
      if (res.ok) { onSuccess(); onClose(); }
      else { const err = await res.json(); setError(err.error || "Gagal."); }
    } catch { setError("Kesalahan koneksi."); }
    finally { setSubmitting(false); }
  };

  const selectClass = "w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition text-gray-900 font-medium bg-white appearance-none";

  return (
    <ModalOverlay>
      <form onSubmit={handleSubmit}>
        <div className="p-6">
          <div className={`w-12 h-12 ${isEdit ? 'bg-orange-100' : 'bg-green-100'} rounded-xl flex items-center justify-center mb-4`}>
            <svg className={`w-6 h-6 ${isEdit ? 'text-orange-600' : 'text-green-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d={isEdit ? "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" : "M12 4v16m8-8H4"} />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">{isEdit ? 'Edit Box' : 'Tambah Box Baru'}</h3>
          <p className="text-sm text-gray-500 mb-4">{isEdit ? 'Ubah informasi box ini.' : 'Isi detail box baru untuk sesi ini.'}</p>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase mb-1.5">Nama Box *</label>
              <input type="text" value={form.nama_box} onChange={(e) => setForm({ ...form, nama_box: e.target.value })}
                className={selectClass} placeholder="Contoh: A, B, C..." autoFocus />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase mb-1.5">Spesies</label>
              <select value={form.spesies} onChange={(e) => setForm({ ...form, spesies: e.target.value })} className={selectClass}>
                <option value="">— Pilih Spesies —</option>
                {SPESIES_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1.5">Kategori</label>
                <select value={form.kategori_box} onChange={(e) => setForm({ ...form, kategori_box: e.target.value })} className={selectClass}>
                  <option value="">— Pilih —</option>
                  {KATEGORI_OPTIONS.map(k => <option key={k} value={k}>{k}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1.5">Jenis Kelamin</label>
                <select value={form.jenis_kelamin_box} onChange={(e) => setForm({ ...form, jenis_kelamin_box: e.target.value })} className={selectClass}>
                  <option value="">— Pilih —</option>
                  {KELAMIN_OPTIONS.map(k => <option key={k} value={k}>{k}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase mb-1.5">Urutan Tampil</label>
              <input type="number" value={form.urutan} onChange={(e) => setForm({ ...form, urutan: parseInt(e.target.value) || 0 })}
                className={selectClass} min={0} />
            </div>
          </div>
          {error && <p className="mt-3 text-sm text-red-600 font-medium">{error}</p>}
        </div>
        <div className="flex gap-3 px-6 pb-6">
          <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 text-sm font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition">Batal</button>
          <button type="submit" disabled={submitting} className={`flex-1 px-4 py-2.5 text-sm font-bold text-white ${isEdit ? 'bg-orange-600 hover:bg-orange-700' : 'bg-green-600 hover:bg-green-700'} rounded-xl transition disabled:opacity-50`}>
            {submitting ? "Menyimpan..." : (isEdit ? "Simpan" : "Tambah Box")}
          </button>
        </div>
      </form>
    </ModalOverlay>
  );
}
