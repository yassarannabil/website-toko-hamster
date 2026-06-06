"use client";

import { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  ModalOverlay, AlertModal, ConfirmModal, RenameModal,
  CreateSessionModal, DuplicateSessionModal, BoxFormModal
} from './modals';

function InventoryContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionIdParam = searchParams.get('session_id');

  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [boxes, setBoxes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingBoxes, setLoadingBoxes] = useState(false);

  // Menu states
  const [openSessionMenu, setOpenSessionMenu] = useState<number | null>(null);
  const [openBoxMenu, setOpenBoxMenu] = useState<number | null>(null);
  const sessionMenuRef = useRef<HTMLDivElement>(null);
  const boxMenuRef = useRef<HTMLDivElement>(null);

  // Modal states
  const [renameSession, setRenameSession] = useState<any>(null);
  const [showCreateSession, setShowCreateSession] = useState(false);
  const [duplicateSession, setDuplicateSession] = useState<any>(null);
  const [confirmModal, setConfirmModal] = useState<{ session?: any; box?: any; type: 'toggle' | 'delete-session' | 'delete-box' } | null>(null);
  const [alertModal, setAlertModal] = useState<{ title: string; message: string; type: "error" | "success" } | null>(null);
  const [showCreateBox, setShowCreateBox] = useState(false);
  const [editBox, setEditBox] = useState<any>(null);

  // Close dropdowns on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (sessionMenuRef.current && !sessionMenuRef.current.contains(e.target as Node)) setOpenSessionMenu(null);
      if (boxMenuRef.current && !boxMenuRef.current.contains(e.target as Node)) setOpenBoxMenu(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/dashboard/sessions/');
      if (res.ok) setSessions(await res.json() || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fetchBoxes = async (sessionId: number) => {
    setLoadingBoxes(true);
    try {
      const res = await fetch(`/api/dashboard/sessions/${sessionId}/boxes/`);
      if (res.ok) setBoxes(await res.json() || []);
    } catch (e) { console.error(e); }
    finally { setLoadingBoxes(false); }
  };

  useEffect(() => { fetchSessions(); }, []);

  useEffect(() => {
    if (sessions.length > 0 && sessionIdParam) {
      const s = sessions.find(s => String(s.session_id) === sessionIdParam);
      if (s) { setSelectedSession(s); fetchBoxes(s.session_id); }
      else setSelectedSession(null);
    } else if (!sessionIdParam) { setSelectedSession(null); }
  }, [sessions, sessionIdParam]);

  const handleSessionClick = (s: any) => router.push(`/dashboard/inventory?session_id=${s.session_id}`);
  const handleBackToSessions = () => router.push('/dashboard/inventory');

  // Session actions
  const executeToggleActive = async () => {
    if (!confirmModal?.session) return;
    const s = confirmModal.session;
    const res = await fetch(`/api/dashboard/sessions/${s.session_id}/`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !s.is_active }),
    });
    if (res.ok) { setConfirmModal(null); fetchSessions(); }
    else { const err = await res.json(); setConfirmModal(null); setAlertModal({ title: "Gagal", message: err.error, type: "error" }); }
  };

  const executeDeleteSession = async () => {
    if (!confirmModal?.session) return;
    const res = await fetch(`/api/dashboard/sessions/${confirmModal.session.session_id}/`, { method: 'DELETE' });
    if (res.ok) { setConfirmModal(null); fetchSessions(); }
    else { const err = await res.json(); setConfirmModal(null); setAlertModal({ title: "Tidak Dapat Menghapus", message: err.error, type: "error" }); }
  };

  const executeDeleteBox = async () => {
    if (!confirmModal?.box) return;
    const res = await fetch(`/api/dashboard/boxes/${confirmModal.box.box_id}/`, { method: 'DELETE' });
    if (res.ok) { setConfirmModal(null); if (selectedSession) fetchBoxes(selectedSession.session_id); }
    else { const err = await res.json(); setConfirmModal(null); setAlertModal({ title: "Tidak Dapat Menghapus", message: err.error, type: "error" }); }
  };

  if (loading) return <div className="p-8 text-gray-500 font-medium">Memuat daftar sesi...</div>;

  return (
    <div className="max-w-7xl mx-auto">
      {/* ── ALL MODALS ── */}
      {showCreateSession && (
        <CreateSessionModal sessions={sessions} onClose={() => setShowCreateSession(false)}
          onSuccess={() => fetchSessions()} onError={(m) => setAlertModal({ title: "Gagal", message: m, type: "error" })} />
      )}
      {renameSession && (
        <RenameModal session={renameSession} onClose={() => setRenameSession(null)}
          onSuccess={() => fetchSessions()} onError={(m) => setAlertModal({ title: "Gagal", message: m, type: "error" })} />
      )}
      {duplicateSession && (
        <DuplicateSessionModal session={duplicateSession} onClose={() => setDuplicateSession(null)}
          onSuccess={() => fetchSessions()} onError={(m) => setAlertModal({ title: "Gagal", message: m, type: "error" })} />
      )}
      {confirmModal?.type === 'toggle' && (
        <ConfirmModal
          title={confirmModal.session.is_active ? "Nonaktifkan Sesi" : "Aktifkan Sesi"}
          message={confirmModal.session.is_active
            ? `Sesi "${confirmModal.session.nama_sesi}" akan dinonaktifkan.`
            : `Aktifkan sesi "${confirmModal.session.nama_sesi}"? Sesi lain yang sedang aktif akan otomatis dinonaktifkan.`}
          confirmLabel={confirmModal.session.is_active ? "Nonaktifkan" : "Aktifkan"}
          confirmColor={confirmModal.session.is_active ? "orange" : "green"}
          onClose={() => setConfirmModal(null)} onConfirm={executeToggleActive} />
      )}
      {confirmModal?.type === 'delete-session' && (
        <ConfirmModal title="Hapus Sesi"
          message={`Apakah Anda yakin ingin menghapus sesi "${confirmModal.session.nama_sesi}"? Aksi ini tidak bisa dibatalkan.`}
          confirmLabel="Hapus" confirmColor="red"
          onClose={() => setConfirmModal(null)} onConfirm={executeDeleteSession} />
      )}
      {confirmModal?.type === 'delete-box' && (
        <ConfirmModal title="Hapus Box"
          message={`Apakah Anda yakin ingin menghapus box "${confirmModal.box.nama_box}"? Aksi ini tidak bisa dibatalkan.`}
          confirmLabel="Hapus" confirmColor="red"
          onClose={() => setConfirmModal(null)} onConfirm={executeDeleteBox} />
      )}
      {showCreateBox && selectedSession && (
        <BoxFormModal sessionId={selectedSession.session_id} onClose={() => setShowCreateBox(false)}
          onSuccess={() => fetchBoxes(selectedSession.session_id)} onError={(m) => setAlertModal({ title: "Gagal", message: m, type: "error" })} />
      )}
      {editBox && selectedSession && (
        <BoxFormModal box={editBox} sessionId={selectedSession.session_id} onClose={() => setEditBox(null)}
          onSuccess={() => fetchBoxes(selectedSession.session_id)} onError={(m) => setAlertModal({ title: "Gagal", message: m, type: "error" })} />
      )}
      {alertModal && <AlertModal {...alertModal} onClose={() => setAlertModal(null)} />}

      {/* ── BACK BUTTON ── */}
      {selectedSession && (
        <button onClick={handleBackToSessions} className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-orange-600 mb-6 transition-colors">
          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Kembali ke Daftar Sesi
        </button>
      )}

      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Stok Live</h1>
          {selectedSession ? (
            <p className="text-gray-500 mt-2 text-sm font-medium flex items-center gap-2">
              <button onClick={handleBackToSessions} className="text-orange-600 hover:underline">Daftar Sesi</button>
              <span>/</span><span>Sesi: {selectedSession.nama_sesi}</span>
            </p>
          ) : (
            <p className="text-gray-500 mt-2 text-sm font-medium">Pilih sesi untuk melihat daftar box.</p>
          )}
        </div>
        {!selectedSession ? (
          <button onClick={() => setShowCreateSession(true)}
            className="bg-orange-600 text-white px-4 sm:px-5 py-2.5 rounded-xl font-bold hover:bg-orange-700 transition shadow-sm flex items-center gap-2 text-sm sm:text-base w-full sm:w-auto justify-center">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Buat Sesi
          </button>
        ) : (
          <button onClick={() => setShowCreateBox(true)}
            className="bg-orange-600 text-white px-4 sm:px-5 py-2.5 rounded-xl font-bold hover:bg-orange-700 transition shadow-sm flex items-center gap-2 text-sm sm:text-base w-full sm:w-auto justify-center">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Tambah Box
          </button>
        )}
      </div>

      {/* ── SESSION LIST ── */}
      {!selectedSession ? (
        sessions.length === 0 ? (
          <div className="bg-white p-10 sm:p-16 text-center rounded-2xl border border-gray-200 shadow-sm">
            <span className="text-4xl mb-4 block">📅</span>
            <p className="text-gray-500 font-medium italic">Belum ada sesi yang terdaftar.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {sessions.map((session) => (
              <div key={session.session_id}
                className="group relative flex flex-col gap-2.5 rounded-2xl border border-gray-200 bg-white p-4 sm:p-6 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-1">
                <button onClick={() => handleSessionClick(session)} className="text-left w-full">
                  <div className="flex justify-between items-start w-full pr-8">
                    <h2 className="text-xl font-bold text-gray-900">{session.nama_sesi}</h2>
                    {session.is_active && (
                      <span className="bg-green-100 text-green-700 text-[10px] font-black px-2 py-1 rounded uppercase tracking-widest shrink-0 shadow-sm">Aktif</span>
                    )}
                  </div>
                  <p className="mt-2 text-xs text-gray-400 font-medium">
                    Dibuat: {new Date(session.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </button>

                {/* Session kebab menu */}
                <div ref={openSessionMenu === session.session_id ? sessionMenuRef : null} className="absolute top-5 right-5">
                  <button onClick={(e) => { e.stopPropagation(); setOpenSessionMenu(openSessionMenu === session.session_id ? null : session.session_id); }}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 6a2 2 0 110-4 2 2 0 010 4zm0 6a2 2 0 110-4 2 2 0 010 4zm0 6a2 2 0 110-4 2 2 0 010 4z" />
                    </svg>
                  </button>
                  {openSessionMenu === session.session_id && (
                    <div className="absolute right-0 top-10 z-50 w-48 bg-white rounded-xl border border-gray-200 shadow-lg py-1.5">
                      <button onClick={(e) => { e.stopPropagation(); setOpenSessionMenu(null); setRenameSession(session); }}
                        className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition">
                        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>Ubah Nama
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); setOpenSessionMenu(null); setConfirmModal({ session, type: 'toggle' }); }}
                        className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition">
                        <span className="w-4 h-4 flex items-center justify-center">
                          <span className={`w-2.5 h-2.5 rounded-full ${session.is_active ? 'bg-gray-300' : 'bg-green-500'}`}></span>
                        </span>{session.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); setOpenSessionMenu(null); setDuplicateSession(session); }}
                        className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition">
                        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                        </svg>Duplikat Sesi
                      </button>
                      <div className="border-t border-gray-100 my-1"></div>
                      <button onClick={(e) => { e.stopPropagation(); setOpenSessionMenu(null); setConfirmModal({ session, type: 'delete-session' }); }}
                        className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>Hapus Sesi
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )

      /* ── BOX LIST ── */
      ) : loadingBoxes ? (
        <div className="p-8 text-gray-500 font-medium">Memuat katalog box...</div>
      ) : boxes.length === 0 ? (
        <div className="bg-white p-10 sm:p-16 text-center rounded-2xl border border-gray-200 shadow-sm">
          <span className="text-4xl mb-4 block">📦</span>
          <p className="text-gray-500 font-medium italic">Belum ada Box di sesi ini.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {boxes.map((box) => (
            <div key={box.box_id}
              className="group relative flex flex-col gap-2.5 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-1">
              <Link href={`/dashboard/inventory/${box.box_id}`} className="block">
                <h2 className="text-lg font-bold text-gray-900 pr-8">
                  {box.nama_box.toLowerCase() === "aksesoris" || box.spesies === "Perlengkapan" ? box.nama_box : `Box ${box.nama_box}`}
                </h2>
                {box.spesies && <p className="mt-1 text-sm font-semibold text-orange-600">{box.spesies}</p>}
                {(box.kategori_box || box.jenis_kelamin_box) ? (
                  <p className="mt-0.5 text-sm text-gray-500 leading-snug">
                    {box.kategori_box === "Mix" && box.jenis_kelamin_box === "Mix" ? "Mix" : `${box.kategori_box || ""} ${box.jenis_kelamin_box || ""}`.trim()}
                  </p>
                ) : box.kategori ? (
                  <p className="mt-1 text-sm text-gray-500 leading-snug">{box.kategori}</p>
                ) : null}
                <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center">
                  <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded">{box.jumlah_tersedia} Tersedia</span>
                  <span className="text-xs text-gray-400">Total: {box.jumlah_total}</span>
                </div>
              </Link>

              {/* Box kebab menu */}
              <div ref={openBoxMenu === box.box_id ? boxMenuRef : null} className="absolute top-4 right-4">
                <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpenBoxMenu(openBoxMenu === box.box_id ? null : box.box_id); }}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 6a2 2 0 110-4 2 2 0 010 4zm0 6a2 2 0 110-4 2 2 0 010 4zm0 6a2 2 0 110-4 2 2 0 010 4z" />
                  </svg>
                </button>
                {openBoxMenu === box.box_id && (
                  <div className="absolute right-0 top-10 z-50 w-40 bg-white rounded-xl border border-gray-200 shadow-lg py-1.5">
                    <button onClick={(e) => { e.stopPropagation(); setOpenBoxMenu(null); setEditBox(box); }}
                      className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition">
                      <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>Edit Box
                    </button>
                    <div className="border-t border-gray-100 my-1"></div>
                    <button onClick={(e) => { e.stopPropagation(); setOpenBoxMenu(null); setConfirmModal({ box, type: 'delete-box' }); }}
                      className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>Hapus Box
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function LiveInventoryPage() {
  return (
    <Suspense fallback={<div className="p-8 text-gray-500 font-medium">Memuat...</div>}>
      <InventoryContent />
    </Suspense>
  );
}
