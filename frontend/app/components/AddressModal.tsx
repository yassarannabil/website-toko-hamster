"use client";

import { useState, useEffect } from "react";
import { getToken } from "../utils/auth";
import { API_BASE_URL } from "../data/hamsters";

interface Region {
  id: number;
  name: string;
}

export interface SavedAddress {
  address_id: number;
  label: string;
  nama_penerima: string;
  nomor_wa: string;
  detail: string;
  kelurahan: string;
  kecamatan: string;
  kota: string;
  provinsi: string;
  kode_pos: string;
  destination_id: string;
  is_default: boolean;
}

interface AddressModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (address: SavedAddress) => void;
  currentAddressId?: number | null;
}

export default function AddressModal({ isOpen, onClose, onSelect, currentAddressId }: AddressModalProps) {
  const [view, setView] = useState<"list" | "form">("list");
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(true);

  // Form state
  const [editAddressId, setEditAddressId] = useState<number | null>(null);
  const [label, setLabel] = useState("Rumah");
  const [namaPenerima, setNamaPenerima] = useState("");
  const [nomorWa, setNomorWa] = useState("");
  const [detailAlamat, setDetailAlamat] = useState("");

  // Cascading wilayah
  const [provinces, setProvinces] = useState<Region[]>([]);
  const [cities, setCities] = useState<Region[]>([]);
  const [districts, setDistricts] = useState<Region[]>([]);
  const [subdistricts, setSubdistricts] = useState<Region[]>([]);

  const [selectedProvId, setSelectedProvId] = useState("");
  const [selectedCityId, setSelectedCityId] = useState("");
  const [selectedDistId, setSelectedDistId] = useState("");
  const [selectedSubdistId, setSelectedSubdistId] = useState("");

  const [selectedProvName, setSelectedProvName] = useState("");
  const [selectedCityName, setSelectedCityName] = useState("");
  const [selectedDistName, setSelectedDistName] = useState("");
  const [selectedSubdistName, setSelectedSubdistName] = useState("");

  const [loadingProv, setLoadingProv] = useState(false);
  const [loadingCity, setLoadingCity] = useState(false);
  const [loadingDist, setLoadingDist] = useState(false);
  const [loadingSubdist, setLoadingSubdist] = useState(false);
  const [saving, setSaving] = useState(false);

  // Fetch saved addresses
  const fetchAddresses = () => {
    setLoadingAddresses(true);
    fetch(`${API_BASE_URL}/api/auth/addresses/`, {
      headers: { "Authorization": `Token ${getToken()}` }
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setAddresses(data);
        setLoadingAddresses(false);
      })
      .catch(() => setLoadingAddresses(false));
  };

  useEffect(() => {
    if (isOpen) {
      fetchAddresses();
      setView("list");
      resetForm();
    }
  }, [isOpen]);

  // Fetch provinces when switching to form view
  useEffect(() => {
    if (view === "form" && provinces.length === 0) {
      setLoadingProv(true);
      fetch("/api/ongkir/provinces/")
        .then(res => res.json())
        .then(data => {
          const allowedProvIds = [5, 10, 11, 12, 15, 18, 19];
          const filtered = (data.data || []).filter((p: Region) => allowedProvIds.includes(Number(p.id)));
          setProvinces(filtered.sort((a: Region, b: Region) => a.name.localeCompare(b.name)));
          setLoadingProv(false);
        })
        .catch(() => setLoadingProv(false));

      // Pre-fill from user profile ONLY if it's a new address (no editAddressId)
      if (!editAddressId) {
        fetch(`${API_BASE_URL}/api/auth/profile/`, {
          headers: { "Authorization": `Token ${getToken()}` }
        })
          .then(res => res.json())
          .then(data => {
            if (data.nama && !namaPenerima) setNamaPenerima(data.nama);
            if (data.wa && !nomorWa) setNomorWa(data.wa);
          })
          .catch(() => {});
      }
    }
  }, [view, editAddressId]);

  // Cascading: fetch cities
  useEffect(() => {
    if (!selectedProvId) { setCities([]); return; }
    setLoadingCity(true);
    setSelectedCityId(""); setSelectedCityName(""); setCities([]);
    setSelectedDistId(""); setSelectedDistName(""); setDistricts([]);
    setSelectedSubdistId(""); setSelectedSubdistName(""); setSubdistricts([]);

    fetch(`/api/ongkir/cities/${selectedProvId}/`)
      .then(res => res.json())
      .then(data => {
        setCities((data.data || []).sort((a: Region, b: Region) => a.name.localeCompare(b.name)));
        setLoadingCity(false);
      })
      .catch(() => setLoadingCity(false));
  }, [selectedProvId]);

  // Cascading: fetch districts
  useEffect(() => {
    if (!selectedCityId) { setDistricts([]); return; }
    setLoadingDist(true);
    setSelectedDistId(""); setSelectedDistName(""); setDistricts([]);
    setSelectedSubdistId(""); setSelectedSubdistName(""); setSubdistricts([]);

    fetch(`/api/ongkir/districts/${selectedCityId}/`)
      .then(res => res.json())
      .then(data => {
        setDistricts((data.data || []).sort((a: Region, b: Region) => a.name.localeCompare(b.name)));
        setLoadingDist(false);
      })
      .catch(() => setLoadingDist(false));
  }, [selectedCityId]);

  // Cascading: fetch subdistricts
  useEffect(() => {
    if (!selectedDistId) { setSubdistricts([]); return; }
    setLoadingSubdist(true);
    setSelectedSubdistId(""); setSelectedSubdistName(""); setSubdistricts([]);

    fetch(`/api/ongkir/subdistricts/${selectedDistId}/`)
      .then(res => res.json())
      .then(data => {
        setSubdistricts((data.data || []).sort((a: Region, b: Region) => a.name.localeCompare(b.name)));
        setLoadingSubdist(false);
      })
      .catch(() => setLoadingSubdist(false));
  }, [selectedDistId]);

  const resetForm = () => {
    setEditAddressId(null);
    setLabel("Rumah"); setNamaPenerima(""); setNomorWa(""); setDetailAlamat("");
    setSelectedProvId(""); setSelectedCityId(""); setSelectedDistId(""); setSelectedSubdistId("");
    setSelectedProvName(""); setSelectedCityName(""); setSelectedDistName(""); setSelectedSubdistName("");
    setCities([]); setDistricts([]); setSubdistricts([]);
  };

  const handleEditClick = (addr: SavedAddress) => {
    setEditAddressId(addr.address_id);
    setLabel(addr.label);
    setNamaPenerima(addr.nama_penerima);
    setNomorWa(addr.nomor_wa);
    setDetailAlamat(addr.detail);
    
    // We only set the names. The IDs are left empty to trigger the user to select from scratch if they want to change location.
    setSelectedProvName(addr.provinsi);
    setSelectedCityName(addr.kota);
    setSelectedDistName(addr.kecamatan);
    setSelectedSubdistName(addr.kelurahan);
    setSelectedSubdistId(addr.destination_id);
    
    setView("form");
  };

  const handleSaveAddress = async () => {
    if (!namaPenerima || !nomorWa || !detailAlamat || !selectedProvName || !selectedCityName) {
      alert("Mohon lengkapi data alamat.");
      return;
    }
    setSaving(true);
    try {
      const payload: any = {
        label,
        nama_penerima: namaPenerima,
        nomor_wa: nomorWa,
        detail: detailAlamat,
        provinsi: selectedProvName,
        kota: selectedCityName,
        kecamatan: selectedDistName,
        kelurahan: selectedSubdistName,
        destination_id: selectedSubdistId,
      };

      let method = "POST";
      if (editAddressId) {
        payload.address_id = editAddressId;
        method = "PUT";
      } else {
        payload.is_default = addresses.length === 0; // First address is default
      }

      const res = await fetch(`${API_BASE_URL}/api/auth/addresses/`, {
        method,
        headers: {
          "Authorization": `Token ${getToken()}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan alamat.");

      if (!editAddressId) {
        // Auto-select the newly created address
        onSelect(data);
        onClose();
      } else {
        // If editing the currently selected address, update the parent state
        if (currentAddressId === editAddressId) {
          onSelect(data);
        }
        // Go back to list
        setView("list");
        fetchAddresses();
      }
      resetForm();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAddress = async () => {
    if (!editAddressId) return;
    if (!confirm("Hapus alamat ini?")) return;
    
    setSaving(true);
    try {
      await fetch(`${API_BASE_URL}/api/auth/addresses/`, {
        method: "DELETE",
        headers: {
          "Authorization": `Token ${getToken()}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ address_id: editAddressId })
      });
      
      setView("list");
      fetchAddresses();
      resetForm();
    } catch (err) {
      alert("Gagal menghapus alamat.");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const selectClass = "w-full px-3 py-2.5 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-[#ea8b3a] outline-none text-sm transition-colors disabled:opacity-40";
  const inputClass = "w-full px-3 py-2.5 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-[#ea8b3a] outline-none text-sm transition-colors";

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative bg-white w-full max-w-lg max-h-[90vh] rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col animate-in slide-in-from-bottom duration-300"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            {view === "form" && (
              <button onClick={() => { setView("list"); resetForm(); }} className="p-1 -ml-1 hover:bg-gray-100 rounded-lg transition-colors">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              </button>
            )}
            <h2 className="text-lg font-bold text-gray-900">
              {view === "list" ? "Pilih Alamat" : (editAddressId ? "Ubah Alamat" : "Tambah Alamat Baru")}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {view === "list" ? (
            <>
              {loadingAddresses ? (
                <div className="py-12 text-center text-gray-400 animate-pulse">Memuat alamat...</div>
              ) : addresses.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="text-5xl mb-3"></div>
                  <p className="text-gray-500 text-sm mb-1">Belum ada alamat tersimpan.</p>
                  <p className="text-gray-400 text-xs">Tambahkan alamat pengiriman baru.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {addresses.map(addr => (
                    <div
                      key={addr.address_id}
                      onClick={() => { onSelect(addr); onClose(); }}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all group ${currentAddressId === addr.address_id ? 'border-[#ea8b3a] bg-orange-50/40' : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50/50'}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-gray-900 text-sm">{addr.nama_penerima}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-semibold">{addr.label}</span>
                            {addr.is_default && <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#ea8b3a] text-white font-bold">Utama</span>}
                          </div>
                          <p className="text-xs text-gray-500 mb-0.5">{addr.nomor_wa}</p>
                          <p className="text-xs text-gray-600 leading-relaxed">{addr.detail}, {addr.kelurahan}, {addr.kecamatan}, {addr.kota}, {addr.provinsi}</p>
                        </div>
                        <div className="flex items-center gap-3 ml-3 flex-shrink-0">
                          <button
                            onClick={e => { e.stopPropagation(); handleEditClick(addr); }}
                            className="text-xs font-bold text-[#ea8b3a] hover:underline px-2 py-1"
                          >
                            Ubah
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            /* ADD/EDIT ADDRESS FORM */
            <div className="space-y-4">
              {/* Info Banner */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2.5">
                <div className="text-amber-600 mt-0.5 flex-shrink-0">
                  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  <strong>Penting:</strong> Saat ini kami hanya melayani pengiriman area <strong>Jawa & Bali</strong> untuk menjamin keselamatan hamster.
                </p>
              </div>

              {/* Label */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Label Alamat</label>
                <div className="flex gap-2">
                  {["Rumah", "Kantor", "Toko"].map(l => (
                    <button key={l} type="button" onClick={() => setLabel(l)} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${label === l ? 'bg-[#ea8b3a] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{l}</button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Nama Penerima</label>
                  <input type="text" value={namaPenerima} onChange={e => setNamaPenerima(e.target.value)} className={inputClass} placeholder="Nama lengkap" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">No. WhatsApp</label>
                  <input type="text" value={nomorWa} onChange={e => setNomorWa(e.target.value)} className={inputClass} placeholder="0812xxxxxx" />
                </div>
              </div>

              {editAddressId && !selectedProvId && (
                <div className="text-[11px] bg-gray-50 border border-gray-100 p-3 rounded-xl text-gray-500 leading-relaxed">
                  <span className="font-bold text-gray-700 block mb-1">Lokasi saat ini:</span>
                  {selectedProvName}, {selectedCityName}, {selectedDistName}, {selectedSubdistName}
                  <div className="mt-1.5 text-[#ea8b3a] font-semibold">Pilih ulang provinsi di bawah ini jika ingin mengubah lokasi.</div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Provinsi</label>
                  <select value={selectedProvId} onChange={e => { setSelectedProvId(e.target.value); const p = provinces.find(x => String(x.id) === e.target.value); setSelectedProvName(p?.name || ""); }} disabled={loadingProv} className={selectClass}>
                    <option value="">{loadingProv ? "Memuat..." : "Pilih Provinsi..."}</option>
                    {provinces.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Kota / Kabupaten</label>
                  <select value={selectedCityId} onChange={e => { setSelectedCityId(e.target.value); const c = cities.find(x => String(x.id) === e.target.value); setSelectedCityName(c?.name || ""); }} disabled={!selectedProvId || loadingCity} className={selectClass}>
                    <option value="">{loadingCity ? "Memuat..." : "Pilih Kota..."}</option>
                    {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Kecamatan</label>
                  <select value={selectedDistId} onChange={e => { setSelectedDistId(e.target.value); const d = districts.find(x => String(x.id) === e.target.value); setSelectedDistName(d?.name || ""); }} disabled={!selectedCityId || loadingDist} className={selectClass}>
                    <option value="">{loadingDist ? "Memuat..." : "Pilih Kecamatan..."}</option>
                    {districts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Kelurahan</label>
                  <select value={selectedSubdistId} onChange={e => { setSelectedSubdistId(e.target.value); const s = subdistricts.find(x => String(x.id) === e.target.value); setSelectedSubdistName(s?.name || ""); }} disabled={!selectedDistId || loadingSubdist} className={selectClass}>
                    <option value="">{loadingSubdist ? "Memuat..." : "Pilih Kelurahan..."}</option>
                    {subdistricts.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Detail Alamat (Jalan, No Rumah, Patokan)</label>
                <textarea value={detailAlamat} onChange={e => setDetailAlamat(e.target.value)} rows={2} className={inputClass} placeholder="Contoh: Jl. Sudirman No 10, rumah pagar hitam dekat masjid"></textarea>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex-shrink-0">
          {view === "list" ? (
            <button
              onClick={() => setView("form")}
              className="w-full py-3 bg-[#ea8b3a] text-white font-bold rounded-xl hover:bg-[#dc7030] transition-colors active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Tambah Alamat Baru
            </button>
          ) : (
            <div className="flex gap-3">
              {editAddressId && (
                <button
                  onClick={handleDeleteAddress}
                  disabled={saving}
                  className="w-1/3 py-3 bg-red-50 text-red-600 font-bold rounded-xl hover:bg-red-100 transition-colors disabled:opacity-50 active:scale-[0.98]"
                >
                  Hapus
                </button>
              )}
              <button
                onClick={handleSaveAddress}
                disabled={saving || !namaPenerima || !nomorWa || !detailAlamat || !selectedCityName}
                className={`${editAddressId ? 'w-2/3' : 'w-full'} py-3 bg-[#ea8b3a] text-white font-bold rounded-xl hover:bg-[#dc7030] transition-colors disabled:opacity-50 active:scale-[0.98]`}
              >
                {saving ? "Menyimpan..." : "Simpan Alamat"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
