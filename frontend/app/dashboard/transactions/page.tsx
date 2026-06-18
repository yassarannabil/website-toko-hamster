"use client";

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { toBlob } from 'html-to-image';
import { jsPDF } from 'jspdf';
import Link from 'next/link';

function TabManager({ setActiveTab }: { setActiveTab: (tab: string) => void }) {
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab');
  useEffect(() => {
    if (tab) {
      setActiveTab(tab);
    }
  }, [tab, setActiveTab]);
  return null;
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [couriers, setCouriers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchTransactions = async () => {
    try {
      const res = await fetch('/api/dashboard/transactions/');
      if (res.ok) {
        setTransactions(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchCouriers = async () => {
    try {
      const res = await fetch('/api/dashboard/couriers/');
      if (res.ok) {
        setCouriers(await res.json());
      }
    } catch (e) {
      console.error('Failed to fetch couriers', e);
    }
  };

  const getStatusBadge = (trx: any) => {
    if (trx.status_pembayaran === 'LUNAS' && !trx.nomor_resi) {
      if (!trx.tanggal_kirim) {
        if (!trx.sudah_video_packing) {
          return { text: 'TUNDA', className: 'bg-red-50 text-red-600 border-red-100' };
        } else {
          return { text: 'SIAP KIRIM', className: 'bg-blue-50 text-blue-600 border-blue-100' };
        }
      }
      const now = new Date();
      const shipDate = new Date(trx.tanggal_kirim);
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const shippingDay = new Date(shipDate.getFullYear(), shipDate.getMonth(), shipDate.getDate());
      const diffDays = Math.ceil((shippingDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      const isReady = diffDays <= 0 || (diffDays === 1 && now.getHours() >= 12);

      if (!trx.sudah_video_packing) {
        if (isReady) {
          return { text: 'SIAP PACKING', className: 'bg-blue-50 text-blue-600 border-blue-100' };
        } else {
          return { text: 'TUNDA', className: 'bg-red-50 text-red-600 border-red-100' };
        }
      } else {
        return { text: 'SIAP KIRIM', className: 'bg-blue-50 text-blue-600 border-blue-100' };
      }
    }

    switch (trx.status_pembayaran) {
      case 'DP':
        return { text: 'DP', className: 'bg-amber-50 text-amber-600 border-amber-100' };
      case 'CANCELLED':
        return { text: 'BATAL', className: 'bg-red-50 text-red-600 border-red-100' };
      case 'SAMPAI':
        return { text: 'SELESAI', className: 'bg-emerald-50 text-emerald-600 border-emerald-100' };
      case 'GARANSI':
        return { text: 'KLAIM GARANSI', className: 'bg-red-50 text-red-600 border-red-100' };
      case 'REFUNDED':
        return { text: 'REFUNDED', className: 'bg-emerald-50 text-emerald-600 border-emerald-100' };
      case 'DIKIRIM':
        return { text: 'PERJALANAN', className: 'bg-purple-50 text-purple-600 border-purple-100' };
      case 'LUNAS':
        return { text: 'LUNAS', className: 'bg-green-50 text-green-600 border-green-100' };
      default:
        return { text: trx.status_pembayaran, className: 'bg-orange-50 text-orange-600 border-orange-100' };
    }
  };

  // State untuk Custom Modal Konfirmasi
  const [confirmModal, setConfirmModal] = useState<{ id: number, status: string } | null>(null);
  const [dpAmount, setDpAmount] = useState<string>("");
  const [trackingNumber, setTrackingNumber] = useState<string>("");
  const [shippingDate, setShippingDate] = useState<string>("");
  const [refundAmount, setRefundAmount] = useState<string>("");
  const [refundProof, setRefundProof] = useState<File | null>(null);
  const [isUploadingRefund, setIsUploadingRefund] = useState(false);
  const refundFileInputRef = useRef<HTMLInputElement>(null);
  const [cancellationReason, setCancellationReason] = useState<string>("");
  const [manualReason, setManualReason] = useState<string>("");
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal untuk preview bukti refund
  const [previewModal, setPreviewModal] = useState<{ show: boolean, url: string, type: string }>({ show: false, url: "", type: "image" });
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [manualPaymentMethod, setManualPaymentMethod] = useState<string>("");

  // State untuk Tab
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      if (tabParam) return tabParam;
    }
    return "siap-packing"; // Default ke Siap Packing agar fokus kerja
  });

  // State untuk Modal Konfirmasi Sampai
  const [arrivalModal, setArrivalModal] = useState<any | null>(null);
  const [viewAddressTrx, setViewAddressTrx] = useState<any | null>(null);
  const [selectedTrxDetail, setSelectedTrxDetail] = useState<any | null>(null);
  const [warrantyMode, setWarrantyMode] = useState(false);
  const [selectedHamsters, setSelectedHamsters] = useState<number[]>([]);
  const [printBulkModal, setPrintBulkModal] = useState<boolean>(false);
  const [selectedPrintSize, setSelectedPrintSize] = useState<'100x150' | '78x100'>('78x100');
  const modalRef = useRef<HTMLDivElement>(null);

  // State untuk Edit Transaksi
  const [isEditingTrx, setIsEditingTrx] = useState(false);
  const [editWa, setEditWa] = useState('');
  const [editNamaCustomer, setEditNamaCustomer] = useState('');
  const [editNomorResi, setEditNomorResi] = useState('');
  const [editNamaPenerima, setEditNamaPenerima] = useState('');
  const [editNomorPenerima, setEditNomorPenerima] = useState('');
  const [editDetailAlamat, setEditDetailAlamat] = useState('');
  const [editKelurahan, setEditKelurahan] = useState('');
  const [editKecamatan, setEditKecamatan] = useState('');
  const [editKota, setEditKota] = useState('');
  const [editProvinsi, setEditProvinsi] = useState('');
  const [editKodePos, setEditKodePos] = useState('');
  const [editKurirId, setEditKurirId] = useState('');
  const [editEstimasi, setEditEstimasi] = useState('');
  const [editKurirManualText, setEditKurirManualText] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const showDataPelangganEdit = selectedTrxDetail ? !['SAMPAI', 'REFUNDED', 'CANCELLED'].includes(selectedTrxDetail.status_pembayaran) : false;
  const showAlamatEdit = selectedTrxDetail ? (selectedTrxDetail.alamat_lengkap && !['DIKIRIM', 'SAMPAI', 'REFUNDED', 'CANCELLED', 'GARANSI'].includes(selectedTrxDetail.status_pembayaran)) : false;
  const showKurirSelectEdit = selectedTrxDetail ? !['DIKIRIM', 'SAMPAI', 'REFUNDED', 'CANCELLED', 'GARANSI'].includes(selectedTrxDetail.status_pembayaran) : false;
  const showNomorResiEdit = selectedTrxDetail ? ['DIKIRIM', 'SAMPAI', 'REFUNDED', 'GARANSI'].includes(selectedTrxDetail.status_pembayaran) : false;

  useEffect(() => {
    if (selectedTrxDetail) {
      setEditWa(selectedTrxDetail.nomor_wa || '');
      setEditNamaCustomer(selectedTrxDetail.nama_customer || '');
      setEditNomorResi(selectedTrxDetail.nomor_resi || '');
      const addr = selectedTrxDetail.alamat_data;
      if (addr) {
        setEditNamaPenerima(addr.nama_penerima || '');
        setEditNomorPenerima(addr.nomor_wa || '');
        setEditDetailAlamat(addr.detail || '');
        setEditKelurahan(addr.kelurahan || '');
        setEditKecamatan(addr.kecamatan || '');
        setEditKota(addr.kota || '');
        setEditProvinsi(addr.provinsi || '');
        setEditKodePos(addr.kode_pos || '');
      } else {
        setEditNamaPenerima('');
        setEditNomorPenerima('');
        setEditDetailAlamat('');
        setEditKelurahan('');
        setEditKecamatan('');
        setEditKota('');
        setEditProvinsi('');
        setEditKodePos('');
      }

      // Match the existing keterangan_kurir to a courier from the master list
      const rawKurir = selectedTrxDetail.keterangan_kurir || '';
      if (!rawKurir) {
        setEditKurirId('');
        setEditEstimasi('');
        setEditKurirManualText('');
      } else {
        const matched = couriers.find(c => {
          const fullCourierName = `${c.nama_kurir} ${c.jenis_layanan}`.toLowerCase();
          return rawKurir.toLowerCase().includes(fullCourierName);
        });

        if (matched) {
          setEditKurirId(matched.pk.toString());
          const matchDays = rawKurir.match(/\((\d+)\s*hari\)/i) || rawKurir.match(/(\d+)\s*hari/i);
          if (matchDays) {
            setEditEstimasi(matchDays[1]);
          } else {
            setEditEstimasi(matched.estimasi_default_hari ? matched.estimasi_default_hari.toString() : '');
          }
          setEditKurirManualText('');
        } else {
          setEditKurirId('manual');
          setEditEstimasi('');
          setEditKurirManualText(rawKurir);
        }
      }
    } else {
      setIsEditingTrx(false);
    }
  }, [selectedTrxDetail, couriers]);

  const handleEditCourierChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setEditKurirId(id);
    if (id === 'manual') {
      setEditEstimasi('');
      setEditKurirManualText(selectedTrxDetail?.keterangan_kurir || '');
    } else if (id) {
      const selected = couriers.find(c => c.pk.toString() === id);
      if (selected && selected.estimasi_default_hari) {
        setEditEstimasi(selected.estimasi_default_hari.toString());
      } else {
        setEditEstimasi('');
      }
      setEditKurirManualText('');
    } else {
      setEditEstimasi('');
      setEditKurirManualText('');
    }
  };

  const handleSaveTrxEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTrxDetail) return;
    setIsSavingEdit(true);

    let keteranganKurirPayload = '';
    if (editKurirId === 'manual') {
      keteranganKurirPayload = editKurirManualText;
    } else if (editKurirId) {
      const selectedCourierObj = couriers.find(c => c.pk.toString() === editKurirId);
      if (selectedCourierObj) {
        keteranganKurirPayload = `${selectedCourierObj.nama_kurir} ${selectedCourierObj.jenis_layanan}`;
        if (editEstimasi) {
          keteranganKurirPayload += ` (${editEstimasi} hari)`;
        }
      }
    }

    try {
      const payload = {
        nomor_wa: editWa,
        nama_customer: editNamaCustomer,
        keterangan_kurir: keteranganKurirPayload,
        nomor_resi: editNomorResi,
        alamat_data: {
          nama_penerima: editNamaPenerima,
          nomor_wa: editNomorPenerima,
          detail: editDetailAlamat,
          kelurahan: editKelurahan,
          kecamatan: editKecamatan,
          kota: editKota,
          provinsi: editProvinsi,
          kode_pos: editKodePos,
        }
      };

      const res = await fetch(`/api/dashboard/transactions/${selectedTrxDetail.transaction_id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const freshRes = await fetch('/api/dashboard/transactions/');
        if (freshRes.ok) {
          const freshData = await freshRes.json();
          setTransactions(freshData);
          const updated = freshData.find((t: any) => t.transaction_id === selectedTrxDetail.transaction_id);
          if (updated) {
            setSelectedTrxDetail(updated);
          }
        }
        setIsEditingTrx(false);
        alert('Data transaksi berhasil diperbarui!');
      } else {
        const err = await res.json();
        alert(err.error || 'Gagal memperbarui data transaksi.');
      }
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan koneksi.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Formatter untuk meringkas nama kurir di tampilan dashboard
  const formatKurir = (kurir: string) => {
    if (!kurir) return 'Ambil Sendiri';
    return kurir
      .replace(/est\.\s*/gi, '')
      .replace(/POS INDONESIA REGULER/gi, 'POS Reg')
      .replace(/POS INDONESIA NEXT DAY/gi, 'POS Nex')
      .replace(/POS REGULER/gi, 'POS Reg')
      .replace(/POS NEXT DAY/gi, 'POS Nex')
      .replace(/TIKI REGULER/gi, 'TIKI REG')
      .replace(/TIKI OVER NIGHT SERVICE/gi, 'TIKI ONS');
  };

  const getWaLink = (phone: string) => {
    if (!phone) return '#';
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('0')) {
      cleaned = '62' + cleaned.substring(1);
    }
    return `https://wa.me/${cleaned}`;
  };


  const uploadToCloudinary = async (file: File): Promise<string> => {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
    if (!cloudName || !uploadPreset) throw new Error("Konfigurasi Cloudinary tidak ditemukan.");

    const fd = new FormData();
    fd.append("file", file);
    fd.append("upload_preset", uploadPreset);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
      method: "POST",
      body: fd
    });
    if (!res.ok) throw new Error(`Cloudinary error: ${res.status}`);
    const data = await res.json();
    return data.secure_url;
  };

  const updateStatus = async (id: number, newStatus?: string, nominalDp?: number, resi?: string, nominalRefund?: number, shipDateInput?: string, hamsterCodes?: string, alasanBatal?: string, metodePembayaran?: string, sudahVideoPacking?: boolean, buktiRefundUrl?: string) => {
    setLoading(true);
    try {
      const body: any = {
        status_pembayaran: newStatus,
        nominal_dp: nominalDp,
        nomor_resi: resi,
        nominal_refund: nominalRefund,
        hamsters_mati: hamsterCodes
      };

      if (shipDateInput) {
        body.tanggal_kirim = shipDateInput;
      }

      if (alasanBatal) {
        body.alasan_batal = alasanBatal;
      }

      if (metodePembayaran) {
        body.metode_pembayaran = metodePembayaran;
      }

      if (sudahVideoPacking !== undefined) {
        body.sudah_video_packing = sudahVideoPacking;
      }

      if (buktiRefundUrl) {
        body.bukti_refund = buktiRefundUrl;
      }

      const res = await fetch(`/api/dashboard/transactions/${id}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        setConfirmModal(null);
        setDpAmount("");
        setTrackingNumber("");
        setShippingDate("");
        setCancellationReason("");
        setManualReason("");
        setSelectedTrxDetail(null);
        setRefundProof(null);
        fetchTransactions();
      } else {
        alert('❌ Gagal memperbarui status.');
      }
    } catch (err) {
      console.error(err);
      alert('⚠️ Gangguan koneksi.');
    } finally {
      setLoading(false);
    }
  };

  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    fetchTransactions();
    fetchCouriers();
  }, []);

  // Logika Filtering untuk Tab dan Pencarian
  const filteredTransactions = transactions.filter(trx => {
    // 1. Tab Filtering
    let matchTab = true;
    if (activeTab === 'menunggu') matchTab = ['PENDING', 'BELUM LUNAS', 'DP'].includes(trx.status_pembayaran);
    else if (activeTab === 'siap-packing') matchTab = trx.status_pembayaran === 'LUNAS' && !trx.sudah_video_packing;
    else if (activeTab === 'siap-kirim') matchTab = trx.status_pembayaran === 'LUNAS' && trx.sudah_video_packing && !trx.nomor_resi;
    else if (activeTab === 'dikirim') matchTab = trx.status_pembayaran === 'DIKIRIM';
    else if (activeTab === 'garansi') matchTab = trx.status_pembayaran === 'GARANSI';
    else if (activeTab === 'selesai') matchTab = ['SAMPAI', 'REFUNDED'].includes(trx.status_pembayaran);
    else if (activeTab === 'batal') matchTab = trx.status_pembayaran === 'CANCELLED';

    // 2. Search Filtering
    let matchSearch = true;
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const trxIdStr = trx.transaction_id ? `inv-${trx.transaction_id}`.toLowerCase() : '';
      const nama = (trx.nama_customer || trx.alamat_data?.nama_penerima || '').toLowerCase();
      const wa = (trx.nomor_wa || trx.alamat_data?.nomor_wa || '').toLowerCase();
      const resi = (trx.nomor_resi || '').toLowerCase();
      
      matchSearch = trxIdStr.includes(q) || nama.includes(q) || wa.includes(q) || resi.includes(q);
    }

    return matchTab && matchSearch;
  });

  const getCount = (tab: string) => {

    if (tab === 'menunggu') return transactions.filter(t => ['PENDING', 'BELUM LUNAS', 'DP'].includes(t.status_pembayaran)).length;
    if (tab === 'siap-packing') return transactions.filter(t => t.status_pembayaran === 'LUNAS' && !t.sudah_video_packing).length;
    if (tab === 'siap-kirim') return transactions.filter(t => t.status_pembayaran === 'LUNAS' && t.sudah_video_packing && !t.nomor_resi).length;
    if (tab === 'dikirim') return transactions.filter(t => t.status_pembayaran === 'DIKIRIM').length;
    if (tab === 'garansi') return transactions.filter(t => t.status_pembayaran === 'GARANSI').length;
    if (tab === 'selesai') return transactions.filter(t => ['SAMPAI', 'REFUNDED'].includes(t.status_pembayaran)).length;
    if (tab === 'batal') return transactions.filter(t => t.status_pembayaran === 'CANCELLED').length;
    return 0;
  };

  const formatShippingDateForFilename = (dateStr: string) => {
    if (!dateStr) {
      const now = new Date();
      const year = now.getFullYear();
      const monthIndex = now.getMonth();
      const day = now.getDate();
      const months = ['JAN', 'FEB', 'MAR', 'APR', 'MEI', 'JUN', 'JUL', 'AGU', 'SEP', 'OKT', 'NOV', 'DES'];
      return `${day}-${months[monthIndex]}-${year}`;
    }
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parts[0];
      const monthIndex = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const months = ['JAN', 'FEB', 'MAR', 'APR', 'MEI', 'JUN', 'JUL', 'AGU', 'SEP', 'OKT', 'NOV', 'DES'];
      const monthName = months[monthIndex] || 'UNKNOWN';
      return `${day}-${monthName}-${year}`;
    }
    return 'UNKNOWN-DATE';
  };

  const downloadAllResiPDF = (size: '100x150' | '78x100') => {
    const siapPackingTrxs = transactions.filter(trx => {
      const isSiapPackingTab = trx.status_pembayaran === 'LUNAS' && !trx.sudah_video_packing;
      if (!isSiapPackingTab) return false;
      const badge = getStatusBadge(trx);
      return badge.text === 'SIAP PACKING';
    });

    if (siapPackingTrxs.length === 0) {
      alert("Tidak ada pesanan dengan status Siap Packing untuk dicetak.");
      return;
    }

    const isLarge = size === '100x150';
    const pageW = isLarge ? 100 : 78;
    const pageH = isLarge ? 150 : 100;
    const margin = isLarge ? 4 : 3;
    const contentW = pageW - margin * 2;

    // Ukuran font terpadu
    const fsContent = isLarge ? 8 : 7;   // font penerima, alamat, catatan
    const fsBox = fsContent;             // font kotak ekspedisi
    const fsWarning = isLarge ? 11 : 9;  // font peringatan

    // Line height & gap
    const lh = isLarge ? 4.5 : 4;
    const gapS = isLarge ? 2 : 1.5;  // gap kecil antar item dalam seksi
    const gapM = isLarge ? 3 : 2;    // gap sedang antar seksi

    // Helper: format nomor telepon → 0812-3456-7890
    const formatPhone = (raw: string): string => {
      if (!raw) return '';
      let digits = raw.replace(/\D/g, '');
      if (digits.startsWith('62')) digits = '0' + digits.slice(2);
      if (digits.length <= 4) return digits;
      const first = digits.slice(0, 4);
      if (digits.length <= 10) {
        return `${first}-${digits.slice(4, 7)}-${digits.slice(7)}`;
      } else {
        return `${first}-${digits.slice(4, 8)}-${digits.slice(8)}`;
      }
    };

    // Helper: format deskripsi hamster → "Spesies - Varian Satin SH"
    const formatHamsterDesc = (item: any): string => {
      const main: string[] = [];
      if (item.spesies) main.push(item.spesies);
      const varParts: string[] = [];
      if (item.varian_warna) varParts.push(item.varian_warna);
      if (item.is_satin) varParts.push('Satin');
      if (item.jenis_bulu && item.jenis_bulu !== 'Tidak Ada') {
        const bf = item.jenis_bulu === 'Short Hair' ? 'SH'
          : item.jenis_bulu === 'Long Hair' ? 'LH'
          : item.jenis_bulu === 'Medium Hair' ? 'MH'
          : item.jenis_bulu;
        varParts.push(bf);
      }
      if (varParts.length > 0) main.push(varParts.join(' '));
      return main.join(' - ');
    };

    // Helper: format ekspedisi dengan "-" pemisah, e.g. "POS INDONESIA NEXTDAY" -> "POS INDONESIA - NEXTDAY"
    const formatKurirString = (raw: string): string => {
      if (!raw) return 'PENGIRIMAN';
      let clean = raw.split('(')[0].trim().toUpperCase();
      
      const knownCouriers = [
        'POS INDONESIA', 'POS', 'JNE', 'J&T', 'TIKI', 'SICEPAT', 
        'KIB', 'KARYATI', 'HERONA', 'GRAB', 'GOJEK', 'LALAMOVE', 'DELIVEREE'
      ];
      
      for (const courier of knownCouriers) {
        if (clean.startsWith(courier)) {
          const service = clean.slice(courier.length).trim();
          if (service) {
            return `${courier} - ${service}`;
          }
          return courier;
        }
      }
      
      const firstSpaceIdx = clean.indexOf(' ');
      if (firstSpaceIdx > 0) {
        const courier = clean.slice(0, firstSpaceIdx);
        const service = clean.slice(firstSpaceIdx).trim();
        return `${courier} - ${service}`;
      }
      
      return clean;
    };

    // Flatten daftar transaksi berdasarkan qty_packing jika > 1
    const pagesToPrint: { trx: any; boxIndex: number; totalBoxes: number }[] = [];
    siapPackingTrxs.forEach(trx => {
      const copies = trx.qty_packing > 1 ? trx.qty_packing : 1;
      for (let i = 0; i < copies; i++) {
        pagesToPrint.push({
          trx,
          boxIndex: i + 1,
          totalBoxes: copies
        });
      }
    });

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [pageW, pageH]
    });

    pagesToPrint.forEach(({ trx, boxIndex, totalBoxes }, index) => {
      if (index > 0) doc.addPage([pageW, pageH]);

      let y = margin;

      // ══ 1. KOTAK EKSPEDISI (kecil, sama dengan font konten, lebar menyesuaikan teks, tanpa estimasi hari) ══
      const kurirRaw = trx.keterangan_kurir || 'PENGIRIMAN';
      const kurirStr = formatKurirString(kurirRaw);
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(fsBox);
      const textW = doc.getTextWidth(kurirStr);
      
      const boxCourierH = isLarge ? 6.5 : 5.5;
      const paddingX = isLarge ? 6 : 4;
      const boxCourierW = Math.min(textW + paddingX * 2, contentW);
      const boxX = margin + (contentW - boxCourierW) / 2;

      doc.setLineWidth(0.4);
      doc.rect(boxX, y, boxCourierW, boxCourierH);
      doc.text(kurirStr, pageW / 2, y + boxCourierH * 0.7, { align: 'center' });
      // Jarak di atas nama penerima samakan seperti jarak di bawah nomor penerima (lh + gapM)
      y += boxCourierH + lh + gapM;

      // ══ 2. NAMA PENERIMA (bold, tanpa label "PENERIMA:") ══
      const namaPenerima = trx.alamat_data?.nama_penerima || trx.nama_customer || '-';
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(fsContent);
      const splitNama = doc.splitTextToSize(namaPenerima, contentW);
      doc.text(splitNama, margin, y);
      y += splitNama.length * lh;

      // ══ 3. NOMOR PENERIMA (bold, format 0812-3456-7890) ══
      const rawPhone = trx.alamat_data?.nomor_wa || trx.nomor_wa || '';
      const formattedPhone = formatPhone(rawPhone);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(fsContent);
      doc.text(formattedPhone, margin, y);
      y += lh + gapM;

      // ══ 4. DETAIL ALAMAT (normal, tanpa kode pos) ══
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(fsContent);
      const ad = trx.alamat_data;
      if (ad) {
        if (ad.detail) {
          const sp = doc.splitTextToSize(ad.detail, contentW);
          doc.text(sp, margin, y);
          y += sp.length * lh;
        }
        const subLine = [ad.kelurahan, ad.kecamatan].filter(Boolean).join(', ');
        if (subLine) {
          const sp = doc.splitTextToSize(subLine, contentW);
          doc.text(sp, margin, y);
          y += sp.length * lh;
        }
        const cityLine = [ad.kota, ad.provinsi].filter(Boolean).join(', ');
        if (cityLine) {
          const sp = doc.splitTextToSize(cityLine, contentW);
          doc.text(sp, margin, y);
          y += sp.length * lh;
        }
      }
      y += gapM;

      // ══ 5. KOTAK PERINGATAN (besar, teks baru) ══
      const warnBoxH = isLarge ? 11 : 9;
      doc.setLineWidth(0.5);
      doc.rect(margin, y, contentW, warnBoxH);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(fsWarning);
      doc.text('!!! HEWAN HIDUP !!!', pageW / 2, y + warnBoxH * 0.65, { align: 'center' });
      y += warnBoxH + margin; // jarak sama dengan margin atas sebelum garis potong

      // ══ 6. GARIS POTONG (putus-putus) ══
      doc.setLineWidth(0.3);
      (doc as any).setLineDash([1.5, 1.5], 0);
      doc.line(0, y, pageW, y);
      (doc as any).setLineDash([], 0);
      // Jarak di atas kode transaksi samakan seperti jarak di bawah nomor penerima (lh + gapM)
      y += lh + gapM;

      // ══ 7. CATATAN INTERNAL (layout ter-align rapi dengan tab titik dua) ══
      const colColonX = margin + (isLarge ? 20 : 16);
      const colValueX = colColonX + (isLarge ? 4 : 3);
      const gapInternal = isLarge ? 2.5 : 2;

      // Kode Transaksi
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(fsContent);
      doc.text(`#${trx.transaction_id}`, margin, y);
      y += lh + gapInternal;

      // Nomor Pelanggan
      const nomorPelanggan = trx.nomor_wa || '';
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(fsContent);
      doc.text('Pelanggan', margin, y);
      doc.text(':', colColonX, y);
      doc.text(nomorPelanggan, colValueX, y);
      y += lh + gapInternal;

      // Tanggal Kirim
      const tglKirim = trx.tanggal_kirim
        ? new Date(trx.tanggal_kirim).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
        : '-';
      doc.text('Tgl. Kirim', margin, y);
      doc.text(':', colColonX, y);
      doc.text(tglKirim, colValueX, y);
      y += lh + gapInternal;

      // Detail Hamster
      const items = trx.hamsters_list || [];
      if (items.length > 0) {
        items.forEach((item: any, idx: number) => {
          const desc = formatHamsterDesc(item);
          const itemLine = desc ? `\u2022 ${item.kode} (${desc})` : `\u2022 ${item.kode}`;
          const split = doc.splitTextToSize(itemLine, pageW - margin - colValueX);
          
          if (idx === 0) {
            doc.text('Produk', margin, y);
            doc.text(':', colColonX, y);
          }
          doc.text(split, colValueX, y);
          y += split.length * lh;
        });
        y += gapInternal;
      }

      // Jumlah Packing
      if (trx.qty_packing > 0) {
        doc.text('Packing', margin, y);
        doc.text(':', colColonX, y);
        doc.text(`${trx.qty_packing} box`, colValueX, y);
        y += lh;
      }
    });

    const sampleTrx = siapPackingTrxs.find(t => t.tanggal_kirim);
    const dateStr = sampleTrx ? sampleTrx.tanggal_kirim : '';
    const formattedDate = formatShippingDateForFilename(dateStr);
    doc.save(`RESI-${formattedDate}-NOSKA.pdf`);
  };

  const downloadResiPDF = (trx: any, size: '100x150' | '78x100') => {
    const isLarge = size === '100x150';
    const width = isLarge ? 100 : 78;
    const height = isLarge ? 150 : 100;
    
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [width, height]
    });

    const margin = isLarge ? 4 : 3;
    let cursorY = margin;

    // Kotak Ekspedisi
    doc.setFontSize(isLarge ? 14 : 11);
    doc.setFont("helvetica", "bold");
    const kurirRaw = trx.keterangan_kurir || "PENGIRIMAN";
    const kurirStr = kurirRaw.split('(')[0].trim().toUpperCase();
    doc.setLineWidth(0.5);
    doc.rect(margin, cursorY, width - (margin * 2), isLarge ? 12 : 9);
    doc.text(kurirStr, width / 2, cursorY + (isLarge ? 8 : 6.5), { align: "center" });
    cursorY += (isLarge ? 16 : 12);

    // Penerima Info
    doc.setFontSize(isLarge ? 9 : 7);
    doc.text("PENERIMA:", margin, cursorY);
    cursorY += (isLarge ? 4.5 : 3.5);
    
    doc.setFontSize(isLarge ? 12 : 10);
    doc.setFont("helvetica", "bold");
    const namaPenerima = trx.alamat_data?.nama_penerima || trx.nama_customer || "Tanpa Nama";
    doc.text(namaPenerima.substring(0, 30), margin, cursorY);
    cursorY += (isLarge ? 5 : 4);

    doc.setFontSize(isLarge ? 10 : 8);
    const waPenerima = trx.alamat_data?.nomor_wa || trx.nomor_wa || "";
    doc.text(waPenerima, margin, cursorY);
    cursorY += (isLarge ? 5 : 4);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(isLarge ? 9 : 7);
    const alamat = trx.alamat_lengkap || "-";
    const splitAlamat = doc.splitTextToSize(alamat, width - (margin * 2));
    doc.text(splitAlamat, margin, cursorY);
    cursorY += splitAlamat.length * (isLarge ? 4 : 3.5) + (isLarge ? 3 : 2);

    doc.line(margin, cursorY, width - margin, cursorY);
    cursorY += (isLarge ? 4 : 3);

    // Pengirim Info
    doc.setFontSize(isLarge ? 9 : 7);
    doc.setFont("helvetica", "bold");
    doc.text("PENGIRIM: NOSKA HAMSTER", margin, cursorY);
    doc.setFont("helvetica", "normal");
    doc.text("0812-XXXX-XXXX (Admin)", margin, cursorY + (isLarge ? 4 : 3.5));
    cursorY += (isLarge ? 8 : 7);

    doc.line(margin, cursorY, width - margin, cursorY);
    cursorY += (isLarge ? 4 : 3);

    // Isi Paket
    doc.setFont("helvetica", "bold");
    doc.text("ISI PAKET (HEWAN HIDUP):", margin, cursorY);
    cursorY += (isLarge ? 5 : 4);

    doc.setFont("helvetica", "normal");
    const items = trx.hamsters_list || [];
    if (items.length > 0) {
      items.forEach((item: any) => {
         const itemText = `- ${item.kode} (${item.variant})`;
         const splitItem = doc.splitTextToSize(itemText, width - (margin * 2));
         doc.text(splitItem, margin, cursorY);
         cursorY += splitItem.length * (isLarge ? 4 : 3.5);
      });
    }
    
    if (trx.qty_packing > 0) {
       doc.text(`- Kotak Packing: ${trx.qty_packing}x`, margin, cursorY);
    }

    // Peringatan di Bawah
    const footerH = isLarge ? 12 : 9;
    const footerY = height - margin - footerH;
    
    doc.setLineWidth(0.5);
    doc.rect(margin, footerY, width - (margin * 2), footerH);
    doc.setFontSize(isLarge ? 12 : 9);
    doc.setFont("helvetica", "bold");
    doc.text("HEWAN HIDUP! JANGAN DIBANTING!", width / 2, footerY + (isLarge ? 8 : 6.5), { align: "center" });

    doc.save(`Resi_${trx.transaction_id}_${size}.pdf`);
  };

  if (loading && transactions.length === 0) return <div className="p-8">Memuat transaksi...</div>;

  const trxInModal = transactions.find(t => t.transaction_id === confirmModal?.id);
  const isInstant = trxInModal?.keterangan_kurir?.toLowerCase().match(/instant|sameday|lokal/i);

  return (
    <div className="max-w-7xl relative">
      <Suspense fallback={null}>
        <TabManager setActiveTab={setActiveTab} />
      </Suspense>
      {/* Custom Modal Confirmation */}
      {/* Custom Modal Cetak Resi Gabungan */}
      {printBulkModal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden border border-gray-100 transform animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl border border-indigo-200 animate-pulse">
                ️
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Cetak Kumpulan Resi</h3>
              <p className="text-gray-500 text-xs leading-relaxed mb-6">
                Pilih ukuran kertas resi PDF untuk dicetak. Hanya pesanan dengan status <span className="font-bold text-blue-600">Siap Packing</span> (tanpa status Tunda) yang akan diikutsertakan.
              </p>

              <div className="space-y-3 text-left mb-6">
                <button
                  type="button"
                  onClick={() => setSelectedPrintSize('78x100')}
                  className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                    selectedPrintSize === '78x100'
                      ? 'border-indigo-600 bg-indigo-50/50 shadow-md shadow-indigo-100/50'
                      : 'border-gray-100 hover:border-gray-200 bg-gray-50/30'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl"></span>
                    <div className="text-left">
                      <div className="font-bold text-gray-800 text-sm">78 x 100 mm</div>
                      <div className="text-[10px] text-gray-500 font-medium">Ukuran Standar Noska (Default)</div>
                    </div>
                  </div>
                  {selectedPrintSize === '78x100' && (
                    <span className="text-indigo-600 text-xs font-black bg-indigo-100 px-2 py-0.5 rounded uppercase">
                      PILIHAN
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedPrintSize('100x150')}
                  className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                    selectedPrintSize === '100x150'
                      ? 'border-indigo-600 bg-indigo-50/50 shadow-md shadow-indigo-100/50'
                      : 'border-gray-100 hover:border-gray-200 bg-gray-50/30'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl"></span>
                    <div className="text-left">
                      <div className="font-bold text-gray-800 text-sm">100 x 150 mm</div>
                      <div className="text-[10px] text-gray-500 font-medium">Ukuran Besar (A6)</div>
                    </div>
                  </div>
                  {selectedPrintSize === '100x150' && (
                    <span className="text-indigo-600 text-xs font-black bg-indigo-100 px-2 py-0.5 rounded uppercase">
                      PILIHAN
                    </span>
                  )}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setPrintBulkModal(false)}
                  className="px-4 py-3 text-gray-500 font-bold text-sm hover:bg-gray-100 rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  onClick={() => {
                    downloadAllResiPDF(selectedPrintSize);
                    setPrintBulkModal(false);
                  }}
                  className="px-4 py-3 bg-indigo-600 text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition"
                >
                  Cetak PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {confirmModal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden border border-gray-100 transform animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
                ❓
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Konfirmasi Aksi</h3>
              <p className="text-gray-500 text-sm leading-relaxed mb-4">
                {confirmModal.status === 'VIDEO_PACKING' ? (
                  <>Apakah Anda yakin sudah merekam video packing untuk pesanan <span className="font-bold text-gray-800">#{confirmModal.id}</span>? Sistem akan membuka WhatsApp dan memindahkan pesanan ke tab Siap Kirim.</>
                ) : confirmModal.status === 'EDIT_DATE' ? (
                  <>Anda akan mengubah jadwal pengiriman untuk pesanan <span className="font-bold text-gray-800">#{confirmModal.id}</span>.</>
                ) : (
                  <>Apakah Anda yakin ingin mengubah status transaksi <span className="font-bold text-gray-800">#{confirmModal.id}</span> menjadi <span className="font-bold text-orange-600 uppercase">{confirmModal.status === 'CANCELLED' ? 'BATAL' : confirmModal.status}</span>?</>
                )}
              </p>

              {confirmModal.status === 'DP' && (
                <div className="mt-2 mb-4 bg-yellow-50 p-4 rounded-xl border border-yellow-100 text-left">
                  <label className="block text-xs font-bold text-yellow-700 uppercase mb-2">Nominal DP (Rp)</label>
                  <input
                    type="number"
                    value={dpAmount}
                    onChange={(e) => setDpAmount(e.target.value)}
                    placeholder="Contoh: 50000"
                    className="w-full px-4 py-2 rounded-lg border border-yellow-200 focus:ring-2 focus:ring-yellow-500 outline-none font-bold text-gray-800"
                    autoFocus
                  />
                  <p className="text-[10px] text-yellow-600 mt-2 italic">Masukkan jumlah uang muka yang sudah diterima.</p>
                </div>
              )}

              {confirmModal.status === 'DIKIRIM' && (
                <div className="mt-2 mb-4 bg-blue-50 p-4 rounded-xl border border-blue-100 text-left">
                  <label className="block text-xs font-bold text-blue-700 uppercase mb-2">Nomor Resi Pengiriman {isInstant && "(Opsional)"}</label>
                  <input
                    type="text"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    placeholder={isInstant ? "Bisa dikosongkan untuk kurir instan" : "Contoh: JNE123456789"}
                    className="w-full px-4 py-2 rounded-lg border border-blue-200 focus:ring-2 focus:ring-blue-500 outline-none font-bold text-gray-800"
                    autoFocus
                  />
                  <p className="text-[10px] text-blue-600 mt-2 italic">
                    {isInstant ? "Pesanan instan dapat langsung diselesaikan tanpa resi." : "Masukkan nomor resi ekspedisi agar customer bisa melacak paket."}
                  </p>
                </div>
              )}

              {(confirmModal.status === 'LUNAS' || confirmModal.status === 'EDIT_DATE') && (
                <div className="mt-2 mb-4 bg-emerald-50 p-4 rounded-xl border border-emerald-100 text-left">
                  <label className="block text-xs font-bold text-emerald-700 uppercase mb-2">
                    {confirmModal.status === 'EDIT_DATE' ? 'Ubah Tanggal Kirim' : 'Pilih Tanggal Kirim'}
                  </label>
                  <input
                    type="date"
                    value={shippingDate}
                    onChange={(e) => setShippingDate(e.target.value)}
                    className="w-full bg-white border border-emerald-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  />
                  <p className="text-[10px] text-emerald-600 mt-2 italic font-medium">Input ini digunakan untuk mendata jadwal pengiriman.</p>
                </div>
              )}

              {['LUNAS', 'DP'].includes(confirmModal.status) && (
                <div className="mt-2 mb-4 bg-gray-50 p-4 rounded-xl border border-gray-200 text-left">
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Metode Pembayaran *</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-500 font-medium mb-3"
                  >
                    <option value="">-- Pilih Metode --</option>
                    <option value="QRIS (DANA)">QRIS (DANA)</option>
                    <option value="QRIS (Gopay)">QRIS (Gopay)</option>
                    <option value="BCA (0190935922)">BCA (0190935922)</option>
                    <option value="ShopeePay (081230134185)">ShopeePay (081230134185)</option>
                    <option value="DANA (081249900279)">DANA (081249900279)</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>

                  {paymentMethod === 'Lainnya' && (
                    <>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Nama Metode *</label>
                      <input
                        type="text"
                        value={manualPaymentMethod}
                        onChange={(e) => setManualPaymentMethod(e.target.value)}
                        placeholder="Masukkan metode pembayaran..."
                        className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-gray-500 outline-none font-medium text-gray-800 text-sm"
                      />
                    </>
                  )}
                </div>
              )}

              {confirmModal.status === 'REFUNDED' && (
                <div className="mt-2 mb-4 bg-red-50 p-4 rounded-xl border border-red-100 text-left">
                  <label className="block text-xs font-bold text-red-700 uppercase mb-2">Upload Bukti Transfer</label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      className="hidden"
                      ref={refundFileInputRef}
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setRefundProof(e.target.files[0]);
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => refundFileInputRef.current?.click()}
                      className="px-4 py-2 bg-white border border-red-200 text-red-600 font-bold rounded-lg hover:bg-red-100 transition text-sm whitespace-nowrap"
                    >
                      Pilih File
                    </button>
                    <span className="text-xs text-red-500 truncate flex-1">
                      {refundProof ? refundProof.name : 'Belum ada file dipilih (opsional)'}
                    </span>
                    {refundProof && (
                      <button type="button" onClick={() => setRefundProof(null)} className="text-red-500 font-bold hover:text-red-700 px-2">✕</button>
                    )}
                  </div>
                </div>
              )}

              {confirmModal.status === 'CANCELLED' && (
                <div className="mt-2 mb-4 bg-red-50 p-4 rounded-xl border border-red-100 text-left">
                  <label className="block text-xs font-bold text-red-700 uppercase mb-2">Alasan Pembatalan *</label>
                  <select
                    value={cancellationReason}
                    onChange={(e) => setCancellationReason(e.target.value)}
                    className="w-full bg-white border border-red-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 font-medium mb-3"
                  >
                    <option value="">-- Pilih Alasan --</option>
                    <option value="Customer tidak merespon / membatalkan sepihak">Customer tidak merespon / membatalkan sepihak</option>
                    <option value="Kesalahan input data / perlu buat pesanan ulang">Kesalahan input data / perlu buat pesanan ulang</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>

                  {cancellationReason === 'Lainnya' && (
                    <>
                      <label className="block text-xs font-bold text-red-700 uppercase mb-2">Detail Alasan *</label>
                      <input
                        type="text"
                        value={manualReason}
                        onChange={(e) => setManualReason(e.target.value)}
                        placeholder="Masukkan alasan pembatalan..."
                        className="w-full px-4 py-2 rounded-lg border border-red-200 focus:ring-2 focus:ring-red-500 outline-none font-medium text-gray-800 text-sm"
                        autoFocus
                      />
                    </>
                  )}
                </div>
              )}
            </div>

            <div className={`grid ${confirmModal.status === 'DIKIRIM' && isInstant ? 'grid-cols-1' : 'grid-cols-2'} gap-3 mt-6 p-6 pt-0`}>
              {confirmModal.status === 'DIKIRIM' && isInstant ? (
                <>
                  <button
                    onClick={() => updateStatus(confirmModal.id, 'SAMPAI', undefined, trackingNumber)}
                    className="px-4 py-2.5 bg-green-600 text-white font-bold text-sm rounded-xl shadow-lg shadow-green-100 hover:bg-green-700 transition"
                  >
                    Kirim & Langsung Selesai
                  </button>
                  <div className="grid grid-cols-2 gap-3 mt-1">
                    <button
                      onClick={() => {
                        setConfirmModal(null);
                        setDpAmount("");
                        setTrackingNumber("");
                        setShippingDate("");
                        setCancellationReason("");
                        setManualReason("");
                      }}
                      className="px-4 py-2.5 text-gray-500 font-bold text-sm hover:bg-gray-100 rounded-xl transition"
                    >
                      Batal
                    </button>
                    <button
                      onClick={() => updateStatus(confirmModal.id, 'DIKIRIM', undefined, trackingNumber)}
                      className="px-4 py-2.5 bg-blue-600 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-100 hover:bg-blue-700 transition"
                    >
                      Kirim Biasa
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setConfirmModal(null);
                      setDpAmount("");
                      setTrackingNumber("");
                      setShippingDate("");
                      setCancellationReason("");
                      setManualReason("");
                      setManualPaymentMethod("");
                      setRefundProof(null);
                    }}
                    className="px-4 py-2.5 text-gray-500 font-bold text-sm hover:bg-gray-100 rounded-xl transition"
                  >
                    Batal
                  </button>
                  <button
                    onClick={() => {
                      if (confirmModal.status === 'VIDEO_PACKING') {
                        const trx = transactions.find(t => t.transaction_id === confirmModal.id);
                        const text = `Kirim hari ini ya kak, berikut video waktu packing-nya.\nUntuk resi-nya menyusul ya kak `;
                        fetch(`/api/dashboard/transactions/${confirmModal.id}/send_chat/`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ message: text })
                        });
                        updateStatus(confirmModal.id, trx?.status_pembayaran, undefined, undefined, undefined, undefined, undefined, undefined, undefined, true);
                      } else if (confirmModal.status === 'DIKIRIM') {
                        const trx = transactions.find(t => t.transaction_id === confirmModal.id);
                        const isInstant = trx?.keterangan_kurir?.toLowerCase().match(/instant|sameday|lokal/i);
                        
                        if (!isInstant && !trackingNumber.trim()) {
                          alert("Nomor resi wajib diisi!");
                          return;
                        }


                        updateStatus(
                          confirmModal.id,
                          'DIKIRIM',
                          undefined,
                          trackingNumber,
                          undefined,
                          undefined,
                          undefined,
                          undefined,
                          undefined
                        );
                      } else {
                        const doUpdate = async () => {
                          let buktiUrl = undefined;
                          if (confirmModal.status === 'REFUNDED' && refundProof) {
                            setIsUploadingRefund(true);
                            try {
                              buktiUrl = await uploadToCloudinary(refundProof);
                            } catch (err) {
                              alert("Gagal mengunggah bukti refund.");
                              setIsUploadingRefund(false);
                              return;
                            }
                            setIsUploadingRefund(false);
                          }
                          
                          updateStatus(
                            confirmModal.id,
                            confirmModal.status === 'EDIT_DATE' ? undefined : confirmModal.status,
                            confirmModal.status === 'DP' ? parseInt(dpAmount) || 0 : undefined,
                            confirmModal.status === 'DIKIRIM' ? trackingNumber : undefined,
                            confirmModal.status === 'REFUNDED' ? parseInt(refundAmount) || 0 : undefined,
                            (confirmModal.status === 'LUNAS' || confirmModal.status === 'EDIT_DATE') ? shippingDate : undefined,
                            undefined,
                            confirmModal.status === 'CANCELLED' ? (cancellationReason === 'Lainnya' ? manualReason : cancellationReason) : undefined,
                            ['LUNAS', 'DP'].includes(confirmModal.status) ? (paymentMethod === 'Lainnya' ? manualPaymentMethod : paymentMethod) : undefined,
                            undefined,
                            buktiUrl
                          );
                        };
                        doUpdate();
                      }
                    }}
                    disabled={isUploadingRefund}
                    className={`px-4 py-2.5 font-bold text-sm rounded-xl shadow-lg transition ${isUploadingRefund ? 'bg-gray-400 text-white cursor-wait' : 'bg-brand-600 text-white shadow-brand-100 hover:bg-brand-700'}`}
                  >
                    {isUploadingRefund ? 'Mengunggah...' : (confirmModal.status === 'EDIT_DATE' ? 'Simpan Perubahan' :
                      confirmModal.status === 'VIDEO_PACKING' ? 'Ya, Proses' : 'Ya, Ubah')}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Detail Produk */}
      {selectedProduct && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden border border-gray-100 transform animate-in zoom-in-95 duration-200">
            {selectedProduct.foto ? (
              <div className="relative aspect-square bg-gray-100">
                <img
                  src={selectedProduct.foto}
                  alt={selectedProduct.kode}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="aspect-square bg-gray-100 flex items-center justify-center text-gray-400 text-sm font-medium">
                Tidak ada foto
              </div>
            )}

            <div className="p-6">
              <div className="text-orange-500 text-xs font-bold uppercase mb-1 tracking-wider">
                {selectedProduct.kode}
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                {selectedProduct.spesies} - {selectedProduct.varian_warna}{selectedProduct.is_satin ? ' Satin' : ''} {selectedProduct.jenis_bulu === 'Short Hair' ? 'SH' : selectedProduct.jenis_bulu === 'Long Hair' ? 'LH' : selectedProduct.jenis_bulu === 'Medium Hair' ? 'MH' : ''}
              </h3>

              <div className="flex flex-wrap gap-2 mb-4">
                <span className="bg-gray-100 text-gray-600 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                  {selectedProduct.gender}
                </span>
                <span className="bg-gray-100 text-gray-600 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  {selectedProduct.usia}
                </span>
                {selectedProduct.jenis_bulu && selectedProduct.jenis_bulu !== 'Tidak Ada' && (
                  <span className="bg-gray-100 text-gray-600 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4M4 19h4m12-16v4m-2-2h4m-5 14v4m-2-2h4"></path></svg>
                    {selectedProduct.jenis_bulu}
                  </span>
                )}
              </div>

              <div className="text-3xl font-extrabold text-orange-500 mb-6">
                Rp {selectedProduct.harga.toLocaleString('id-ID')}
              </div>

              <button
                onClick={() => setSelectedProduct(null)}
                className="w-full px-4 py-3 bg-emerald-500 text-white font-bold text-sm rounded-xl hover:bg-emerald-600 transition shadow-lg shadow-emerald-100 flex items-center justify-center gap-2"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Manajemen Pesanan</h1>
        <div className="flex gap-3 sm:gap-6 items-center">
          <div className="text-right hidden md:block border-r border-gray-200 pr-6">
            <div className="text-[11px] font-bold text-gray-500 uppercase tracking-widest leading-tight">
              {isMounted ? currentTime.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '...'}
            </div>
            <div className="text-base font-bold text-gray-600 tabular-nums leading-none mt-1.5">
              {isMounted ? currentTime.toLocaleTimeString('id-ID') : '00:00:00'}
            </div>
          </div>
          <div className="flex gap-2 sm:gap-3">
            {activeTab === 'siap-packing' && (
              <button
                onClick={() => {
                  setSelectedPrintSize('78x100'); // reset to default 78x100
                  setPrintBulkModal(true);
                }}
                className="bg-indigo-600 text-white px-3 sm:px-5 py-2.5 rounded-xl font-bold hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-100 transition shadow-sm flex items-center gap-1 sm:gap-2 active:scale-95 text-sm sm:text-base whitespace-nowrap"
                title="Cetak Kumpulan Resi PDF"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                Cetak Resi
              </button>
            )}
            {getCount('siap-kirim') > 0 && (
              <a
                href="/dashboard/print"
                target="_blank"
                className="bg-gray-800 text-white px-3 sm:px-5 py-2.5 rounded-xl font-bold hover:bg-gray-900 hover:shadow-lg hover:shadow-gray-200 transition shadow-sm flex items-center justify-center active:scale-95 text-sm sm:text-base"
                title="Cetak Semua Resi Siap Kirim (Thermal)"
              >
                Cetak Resi
              </a>
            )}
            <Link href="/dashboard/invoice" className="bg-emerald-600 text-white px-3 sm:px-5 py-2.5 rounded-xl font-bold hover:bg-emerald-700 hover:shadow-lg hover:shadow-emerald-100 transition shadow-sm flex items-center gap-1 sm:gap-2 active:scale-95 text-sm sm:text-base whitespace-nowrap">
              <span className="text-xl">+</span> Buat Pesanan
            </Link>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          height: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
      <div className="overflow-x-auto custom-scrollbar mb-6 pb-2">
        <div className="flex flex-nowrap gap-2 bg-gray-100/50 p-1.5 rounded-2xl border border-gray-200 w-max">
          {[
            { id: 'menunggu', label: 'Menunggu Bayar', color: 'orange' },
            { id: 'siap-packing', label: 'Siap Packing', color: 'yellow' },
            { id: 'siap-kirim', label: 'Siap Kirim', color: 'blue' },
            { id: 'dikirim', label: 'Dalam Perjalanan', color: 'orange' },
            { id: 'garansi', label: 'Klaim Garansi', color: 'red' },
            { id: 'selesai', label: 'Selesai', color: 'green' },
            { id: 'batal', label: 'Batal', color: 'red' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setSelectedTrxDetail(null);
              }}
              className={`
              flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all
              ${activeTab === tab.id
                  ? 'bg-white text-gray-900 shadow-md scale-105'
                  : 'text-gray-500 hover:bg-white/50'
                }
            `}
            >
              {tab.label}
              {!['selesai', 'batal'].includes(tab.id) && getCount(tab.id) > 0 && (
                <span className={`
                px-2 py-0.5 rounded-full text-[10px] 
                ${activeTab === tab.id ? 'bg-brand-500 text-white' : 'bg-gray-200 text-gray-600'}
              `}>
                  {getCount(tab.id)}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative max-w-lg">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            className="block w-full pl-11 pr-4 py-3 border border-gray-200 shadow-sm rounded-2xl leading-5 bg-white placeholder-gray-400 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition duration-150 ease-in-out"
            placeholder="Cari Invoice, Nama, WhatsApp, atau Resi..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="mt-6">
        {filteredTransactions.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center text-gray-500 font-medium">
            <span className="text-3xl block mb-2"></span>
            Tidak ada transaksi di tab ini.
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto custom-scrollbar">
              <div className="min-w-[950px]">
                {/* Table Header */}
                <div className="flex items-center gap-4 p-4 border-b border-gray-100 bg-gray-50/50 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  <div className="w-10 text-center">No.</div>
                  <div className="w-16">ID</div>
                  <div className="w-32">Tanggal & Waktu</div>
                  <div className="flex-1">Pelanggan</div>
                  <div className="flex-1">Penerima</div>
                  <div className="w-32 text-right">Total Belanja</div>
                  <div className="w-32 text-center">Status</div>
                </div>

                {/* Table Body */}
                <div className="flex flex-col divide-y divide-gray-100">
                  {filteredTransactions.map((trx, index) => {
                    const badge = getStatusBadge(trx);
                    let textColorClass = "text-orange-600";
                    let bgBadgeClass = "bg-orange-50 border-orange-100";
                    if (badge.className.includes("text-red-600")) { textColorClass = "text-red-600"; bgBadgeClass = "bg-red-50 border-red-100"; }
                    else if (badge.className.includes("text-blue-600")) { textColorClass = "text-blue-600"; bgBadgeClass = "bg-blue-50 border-blue-100"; }
                    else if (badge.className.includes("text-emerald-600")) { textColorClass = "text-emerald-600"; bgBadgeClass = "bg-emerald-50 border-emerald-100"; }
                    else if (badge.className.includes("text-amber-600")) { textColorClass = "text-amber-600"; bgBadgeClass = "bg-amber-50 border-amber-100"; }
                    else if (badge.className.includes("text-purple-600")) { textColorClass = "text-purple-600"; bgBadgeClass = "bg-purple-50 border-purple-100"; }
                    else if (badge.className.includes("text-green-600")) { textColorClass = "text-green-600"; bgBadgeClass = "bg-green-50 border-green-100"; }

                    return (
                      <div
                        key={trx.transaction_id}
                        onClick={() => setSelectedTrxDetail(trx)}
                        className="flex items-center gap-4 p-4 hover:bg-orange-50/30 transition-colors cursor-pointer group"
                      >
                        <div className="w-10 text-center text-xs font-semibold text-gray-400">{index + 1}</div>
                        
                        <div className="w-16 font-extrabold text-gray-900 text-sm">
                          #{trx.transaction_id}
                        </div>
                        
                        <div className="w-32 text-[11px] text-gray-600 font-medium">
                          {trx.created_at ? new Date(trx.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(' pukul ', ', ') : '-'}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <span className="block font-bold text-gray-800 text-sm truncate" title={trx.nama_customer || trx.alamat_data?.nama_penerima}>
                            {trx.nama_customer !== 'No Name' ? trx.nama_customer : (trx.alamat_data?.nama_penerima || '-')}
                          </span>
                          <span className="block text-xs text-green-700 font-bold mt-0.5 truncate">
                            {trx.nomor_wa || trx.alamat_data?.nomor_wa}
                          </span>
                        </div>

                        <div className="flex-1 min-w-0">
                          {trx.alamat_data ? (
                            <>
                              <span className="block font-bold text-gray-800 text-sm truncate" title={trx.alamat_data.nama_penerima}>
                                {trx.alamat_data.nama_penerima}
                              </span>
                              <span className="block text-xs text-gray-500 font-bold mt-0.5 truncate">
                                {trx.alamat_data.nomor_wa}
                              </span>
                            </>
                          ) : (
                            <span className="text-gray-400 text-xs italic">-</span>
                          )}
                        </div>

                        <div className="w-32 text-right font-black text-gray-900 text-sm">
                          Rp {trx.total_bayar.toLocaleString('id-ID')}
                        </div>

                        <div className="w-32 flex justify-center">
                          <div className={`px-3 py-1.5 rounded-lg border flex items-center justify-center gap-1.5 shadow-sm w-full ${bgBadgeClass}`}>
                            <span className="relative flex h-1.5 w-1.5 flex-shrink-0">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75"></span>
                              <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${textColorClass}`}></span>
                            </span>
                            <span className={`font-bold uppercase tracking-wider text-[9px] truncate ${textColorClass}`}>
                              {badge.text}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {selectedTrxDetail && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[99] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200 my-8 max-h-[85vh] flex flex-col border border-gray-100">
            {/* Header Modal */}
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div>
                <h3 className="font-bold text-gray-900 leading-tight text-base">Detail Transaksi</h3>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">#{selectedTrxDetail.transaction_id}</p>
              </div>
              <div className="flex items-center gap-2">
                {!isEditingTrx && selectedTrxDetail.status_pembayaran !== 'CANCELLED' && (
                  <button
                    onClick={() => setIsEditingTrx(true)}
                    className="px-3 py-1.5 text-[11px] font-bold text-orange-600 border border-orange-200 bg-white hover:bg-orange-50 rounded-lg transition"
                  >
                    Edit Data
                  </button>
                )}
                <button
                  onClick={() => { setSelectedTrxDetail(null); setIsEditingTrx(false); }}
                  className="p-1.5 hover:bg-gray-200/60 rounded-full transition-colors"
                >
                  <svg className="w-4.5 h-4.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content Modal */}
            <div className="flex-1 overflow-y-auto p-6 text-xs text-gray-700">
              {isEditingTrx ? (
                /* ─── EDIT MODE ─────────────────────────────────────── */
                <form id="edit-trx-form" onSubmit={handleSaveTrxEdit} className="space-y-4">
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-[11px] text-blue-700 font-medium flex items-start gap-2">
                    <svg className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/></svg>
                    <span>
                      {showAlamatEdit 
                        ? "Edit data pelanggan & alamat pengiriman. Kosongkan field alamat jika tidak ingin mengisinya."
                        : showDataPelangganEdit 
                          ? "Edit data pelanggan dan nomor resi pengiriman." 
                          : "Edit nomor resi pengiriman."
                      }
                    </span>
                  </div>

                  {/* Seksi Data Pelanggan */}
                  {showDataPelangganEdit && (
                    <div>
                      <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-2.5">Data Pelanggan</p>
                      <div className="space-y-2.5">
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Nomor WhatsApp *</label>
                          <input
                            type="text"
                            required
                            value={editWa}
                            onChange={e => setEditWa(e.target.value)}
                            placeholder="62812..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-medium text-gray-900 focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none transition"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Nama Pelanggan</label>
                          <input
                            type="text"
                            value={editNamaCustomer}
                            onChange={e => setEditNamaCustomer(e.target.value)}
                            placeholder="Nama pelanggan..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-medium text-gray-900 focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none transition"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Seksi Kurir / Ekspedisi */}
                  {(showKurirSelectEdit || showNomorResiEdit) && (
                    <>
                      {showDataPelangganEdit && <div className="border-t border-gray-100" />}
                      <div>
                        <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-2.5">Kurir / Ekspedisi</p>
                        <div className="space-y-2.5">
                          {showKurirSelectEdit && (
                            <div className="grid grid-cols-3 gap-2.5">
                              <div className="col-span-2">
                                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Pilih Kurir / Ekspedisi</label>
                                <select
                                  value={editKurirId}
                                  onChange={handleEditCourierChange}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-medium text-gray-900 focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none transition bg-white"
                                >
                                  <option value="">-- Ambil Sendiri --</option>
                                  {couriers.map((c: any) => (
                                    <option key={c.pk} value={c.pk.toString()}>
                                      {c.nama_kurir} {c.jenis_layanan}
                                    </option>
                                  ))}
                                  <option value="manual">Tulis Manual / Lainnya</option>
                                </select>
                              </div>
                              {editKurirId !== 'manual' && (
                                <div>
                                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Est. Hari</label>
                                  <input
                                    type="number"
                                    value={editEstimasi}
                                    onChange={e => setEditEstimasi(e.target.value)}
                                    placeholder="Est. hari"
                                    min="1"
                                    disabled={!editKurirId}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-medium text-gray-900 focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none transition disabled:bg-gray-50 disabled:text-gray-400"
                                  />
                                </div>
                              )}
                            </div>
                          )}

                          {showKurirSelectEdit && editKurirId === 'manual' && (
                            <div>
                              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Keterangan Kurir Manual</label>
                              <input
                                type="text"
                                value={editKurirManualText}
                                onChange={e => setEditKurirManualText(e.target.value)}
                                placeholder="Contoh: Kurir Toko / Gojek Sameday"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-medium text-gray-900 focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none transition"
                              />
                            </div>
                          )}

                          {showNomorResiEdit && (
                            <div>
                              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Nomor Resi</label>
                              <input
                                type="text"
                                value={editNomorResi}
                                onChange={e => setEditNomorResi(e.target.value)}
                                placeholder="Masukkan nomor resi..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-medium text-gray-900 focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none transition"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Seksi Alamat Pengiriman */}
                  {showAlamatEdit && (
                    <>
                      <div className="border-t border-gray-100" />
                      <div>
                        <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-2.5">Alamat Pengiriman</p>
                        <div className="space-y-2.5">
                          <div className="grid grid-cols-2 gap-2.5">
                            <div>
                              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Nama Penerima</label>
                              <input
                                type="text"
                                value={editNamaPenerima}
                                onChange={e => setEditNamaPenerima(e.target.value)}
                                placeholder="Nama penerima..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-medium text-gray-900 focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none transition"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">No. WA Penerima</label>
                              <input
                                type="text"
                                value={editNomorPenerima}
                                onChange={e => setEditNomorPenerima(e.target.value)}
                                placeholder="62812..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-medium text-gray-900 focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none transition"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2.5">
                            <div>
                              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Provinsi</label>
                              <input
                                type="text"
                                value={editProvinsi}
                                onChange={e => setEditProvinsi(e.target.value)}
                                placeholder="Jawa Barat"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-medium text-gray-900 focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none transition"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Kota / Kabupaten</label>
                              <input
                                type="text"
                                value={editKota}
                                onChange={e => setEditKota(e.target.value)}
                                placeholder="Bandung"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-medium text-gray-900 focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none transition"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2.5">
                            <div>
                              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Kecamatan</label>
                              <input
                                type="text"
                                value={editKecamatan}
                                onChange={e => setEditKecamatan(e.target.value)}
                                placeholder="Kecamatan..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-medium text-gray-900 focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none transition"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Kelurahan / Desa</label>
                              <input
                                type="text"
                                value={editKelurahan}
                                onChange={e => setEditKelurahan(e.target.value)}
                                placeholder="Kelurahan..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-medium text-gray-900 focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none transition"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-2.5">
                            <div className="col-span-2">
                              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Detail Alamat</label>
                              <input
                                type="text"
                                value={editDetailAlamat}
                                onChange={e => setEditDetailAlamat(e.target.value)}
                                placeholder="Jl. Merdeka No. 10..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-medium text-gray-900 focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none transition"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Kode Pos</label>
                              <input
                                type="text"
                                value={editKodePos}
                                onChange={e => setEditKodePos(e.target.value)}
                                placeholder="40xxx"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-medium text-gray-900 focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none transition"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </form>
              ) : (
                /* ─── DETAIL MODE ─────────────────────────────────────── */
                <div className="space-y-3.5">
              {/* Status Transaksi */}
              <div className="flex justify-between items-center py-1">
                <span className="font-bold text-gray-400 uppercase tracking-wider text-[10px] whitespace-nowrap">Status Transaksi:</span>
                <div className="flex-1 border-t border-dotted border-gray-200 mx-2 h-0 self-center"></div>
                {(() => {
                  const badge = getStatusBadge(selectedTrxDetail);
                  let textColorClass = "text-orange-600";
                  if (badge.className.includes("text-red-600")) textColorClass = "text-red-600";
                  else if (badge.className.includes("text-blue-600")) textColorClass = "text-blue-600";
                  else if (badge.className.includes("text-emerald-600")) textColorClass = "text-emerald-600";
                  else if (badge.className.includes("text-amber-600")) textColorClass = "text-amber-600";
                  else if (badge.className.includes("text-purple-600")) textColorClass = "text-purple-600";
                  else if (badge.className.includes("text-green-600")) textColorClass = "text-green-600";

                  return (
                    <span className={`inline-flex items-center gap-1.5 font-bold uppercase tracking-wider text-[11px] ${textColorClass}`}>
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-current"></span>
                      </span>
                      {badge.text}
                    </span>
                  );
                })()}
              </div>

              {/* Nama Pelanggan */}
              {selectedTrxDetail.nama_customer && selectedTrxDetail.nama_customer !== 'No Name' && (
                <div className="flex justify-between items-center py-1">
                  <span className="font-bold text-gray-400 uppercase tracking-wider text-[10px] whitespace-nowrap">Nama Pelanggan:</span>
                  <div className="flex-1 border-t border-dotted border-gray-200 mx-2 h-0 self-center"></div>
                  <span className="font-semibold text-gray-800 text-right">{selectedTrxDetail.nama_customer}</span>
                </div>
              )}

              {/* Nomor Pelanggan */}
              <div className="flex justify-between items-center py-1">
                <span className="font-bold text-gray-400 uppercase tracking-wider text-[10px] whitespace-nowrap">Nomor Pelanggan:</span>
                <div className="flex-1 border-t border-dotted border-gray-200 mx-2 h-0 self-center"></div>
                <a
                  href={getWaLink(selectedTrxDetail.nomor_wa)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-green-700 text-right"
                >
                  {selectedTrxDetail.nomor_wa}
                </a>
              </div>

              {selectedTrxDetail.alamat_lengkap && selectedTrxDetail.alamat_data ? (
                <>
                  {/* Nama Penerima */}
                  <div className="flex justify-between items-center py-1">
                    <span className="font-bold text-gray-400 uppercase tracking-wider text-[10px] whitespace-nowrap">Nama Penerima:</span>
                    <div className="flex-1 border-t border-dotted border-gray-200 mx-2 h-0 self-center"></div>
                    <span className="font-semibold text-gray-800 text-right">{selectedTrxDetail.alamat_data.nama_penerima}</span>
                  </div>

                  {/* Nomor Penerima */}
                  <div className="flex justify-between items-center py-1">
                    <span className="font-bold text-gray-400 uppercase tracking-wider text-[10px] whitespace-nowrap">Nomor Penerima:</span>
                    <div className="flex-1 border-t border-dotted border-gray-200 mx-2 h-0 self-center"></div>
                    <span className="font-semibold text-gray-500 text-right">
                      {selectedTrxDetail.alamat_data.nomor_wa}
                    </span>
                  </div>

                  {/* Alamat Penerima */}
                  <div className="flex justify-between items-center py-1">
                    <span className="font-bold text-gray-400 uppercase tracking-wider text-[10px] whitespace-nowrap">Alamat Penerima:</span>
                    <div className="flex-1 border-t border-dotted border-gray-200 mx-2 h-0 self-center"></div>
                    <button
                      onClick={() => setViewAddressTrx(selectedTrxDetail)}
                      className="text-[10px] font-bold px-2 py-0.5 rounded border transition-colors cursor-pointer hover:underline text-emerald-600 bg-emerald-50 border-emerald-100 hover:bg-emerald-100/50 text-right active:scale-[0.99]"
                    >
                      SUDAH LENGKAP
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex justify-between items-center py-1">
                  <span className="font-bold text-gray-400 uppercase tracking-wider text-[10px] whitespace-nowrap">Alamat Penerima:</span>
                  <div className="flex-1 border-t border-dotted border-gray-200 mx-2 h-0 self-center"></div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded border text-gray-400 bg-gray-50 border-gray-200 cursor-not-allowed text-right">
                    BELUM DIISI
                  </span>
                </div>
              )}

              {/* Produk Yang Dibeli */}
              <div className="flex justify-between items-center py-1">
                <span className="font-bold text-gray-400 uppercase tracking-wider text-[10px] whitespace-nowrap">Produk Yang Dibeli:</span>
                <div className="flex-1 border-t border-dotted border-gray-200 mx-2 h-0 self-center"></div>
                <div className="flex flex-wrap gap-1.5 justify-end">
                  {selectedTrxDetail.hamsters_list.map((h: any) => {
                    const isMati = selectedTrxDetail.hamsters_mati?.split(',').map((c: string) => c.trim()).includes(h.kode);
                    return (
                      <span
                        key={h.id}
                        onClick={() => setSelectedProduct(h)}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded border transition-colors cursor-pointer hover:underline ${
                          isMati
                            ? 'text-red-700 bg-red-50 border-red-200 hover:bg-red-100'
                            : 'text-indigo-600 bg-indigo-50 border-indigo-100 hover:bg-indigo-100/50'
                        }`}
                      >
                        {h.kode}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Informasi Pengiriman */}
              <div className="flex justify-between items-center py-1">
                <span className="font-bold text-gray-400 uppercase tracking-wider text-[10px] whitespace-nowrap">Kurir / Ekspedisi:</span>
                <div className="flex-1 border-t border-dotted border-gray-200 mx-2 h-0 self-center"></div>
                <span className="font-semibold text-gray-800 text-right uppercase">
                  {(() => {
                    const raw = formatKurir(selectedTrxDetail.keterangan_kurir) || 'Ambil Sendiri';
                    const parts = raw.split('(');
                    if (parts.length > 1) {
                      const main = parts[0].trim();
                      const est = parts[1].replace(')', '').trim();
                      return (
                        <span>
                          {main} <span className="text-gray-500 font-normal text-[11px]">({est})</span>
                        </span>
                      );
                    }
                    return raw;
                  })()}
                </span>
              </div>

              {/* Tanggal Pesan */}
              <div className="flex justify-between items-center py-1">
                <span className="font-bold text-gray-400 uppercase tracking-wider text-[10px] whitespace-nowrap">Tanggal Pesan:</span>
                <div className="flex-1 border-t border-dotted border-gray-200 mx-2 h-0 self-center"></div>
                <span className="font-semibold text-gray-800 text-right">
                  {(() => {
                    if (!selectedTrxDetail.created_at) return '—';
                    const dateObj = new Date(selectedTrxDetail.created_at);
                    const dateStr = dateObj.toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    });
                    const timeStr = dateObj.toLocaleTimeString('id-ID', {
                      hour: '2-digit',
                      minute: '2-digit'
                    }).replace(/\./g, ':');

                    return (
                      <span>
                        {dateStr} <span className="text-gray-500 font-normal">({timeStr})</span>
                      </span>
                    );
                  })()}
                </span>
              </div>

              {/* Tanggal Kirim */}
              <div className="flex justify-between items-center py-1">
                <span className="font-bold text-gray-400 uppercase tracking-wider text-[10px] whitespace-nowrap">Tanggal Kirim:</span>
                <div className="flex-1 border-t border-dotted border-gray-200 mx-2 h-0 self-center"></div>
                <span className="font-semibold text-gray-800 text-right">
                  {selectedTrxDetail.tanggal_kirim ? new Date(selectedTrxDetail.tanggal_kirim).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}
                </span>
              </div>

              {/* Nomor Resi */}
              {selectedTrxDetail.nomor_resi && (
                <div className="flex justify-between items-center py-1">
                  <span className="font-bold text-gray-400 uppercase tracking-wider text-[10px] whitespace-nowrap">Nomor Resi:</span>
                  <div className="flex-1 border-t border-dotted border-gray-200 mx-2 h-0 self-center"></div>
                  <div className="flex items-center gap-1.5 justify-end">
                    {(() => {
                      const kurir = selectedTrxDetail.keterangan_kurir?.toUpperCase() || "";
                      let trackingUrl = "";
                      if (kurir.includes("TIKI")) trackingUrl = `https://tiki.id/id/track/${selectedTrxDetail.nomor_resi}`;
                      else if (kurir.includes("POS")) trackingUrl = `https://www.posindonesia.co.id/id/tracking/${selectedTrxDetail.nomor_resi}`;

                      if (trackingUrl) {
                        return (
                          <a
                            href={trackingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] font-bold px-2 py-0.5 rounded border transition-colors cursor-pointer hover:underline text-purple-600 bg-purple-50 border-purple-100 hover:bg-purple-100/50 text-right"
                          >
                            {selectedTrxDetail.nomor_resi}
                          </a>
                        );
                      } else {
                        return (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded border text-purple-600 bg-purple-50 border-purple-100 text-right">
                            {selectedTrxDetail.nomor_resi}
                          </span>
                        );
                      }
                    })()}
                  </div>
                </div>
              )}

              {/* Informasi Pembayaran */}
              {/* Total Belanja */}
              <div className="flex justify-between items-center py-1">
                <span className="font-bold text-gray-400 uppercase tracking-wider text-[10px] whitespace-nowrap">Total Belanja:</span>
                <div className="flex-1 border-t border-dotted border-gray-200 mx-2 h-0 self-center"></div>
                <span className="font-semibold text-gray-800 text-right">Rp {selectedTrxDetail.total_bayar.toLocaleString('id-ID')}</span>
              </div>

              {selectedTrxDetail.nominal_dp > 0 && (
                <>
                  {/* Nominal DP */}
                  <div className="flex justify-between items-center py-1">
                    <span className="font-bold text-gray-400 uppercase tracking-wider text-[10px] whitespace-nowrap">Nominal DP:</span>
                    <div className="flex-1 border-t border-dotted border-gray-200 mx-2 h-0 self-center"></div>
                    <span className="font-semibold text-emerald-600 text-right">Rp {selectedTrxDetail.nominal_dp.toLocaleString('id-ID')}</span>
                  </div>

                  {/* Sisa Pembayaran */}
                  <div className="flex justify-between items-center py-1 font-bold">
                    <span className="font-bold text-gray-900 uppercase tracking-wider text-[10px] whitespace-nowrap">Sisa Pembayaran:</span>
                    <div className="flex-1 border-t border-dotted border-gray-200 mx-2 h-0 self-center"></div>
                    <span className="text-red-600 text-right">Rp {(selectedTrxDetail.total_bayar - selectedTrxDetail.nominal_dp).toLocaleString('id-ID')}</span>
                  </div>
                </>
              )}

              {/* Metode Pembayaran */}
              {selectedTrxDetail.metode_pembayaran && (
                <div className="flex justify-between items-center py-1">
                  <span className="font-bold text-gray-400 uppercase tracking-wider text-[10px] whitespace-nowrap">Metode Pembayaran:</span>
                  <div className="flex-1 border-t border-dotted border-gray-200 mx-2 h-0 self-center"></div>
                  <span className="font-semibold text-gray-800 text-right">{selectedTrxDetail.metode_pembayaran}</span>
                </div>
              )}

              {/* Alasan Pembatalan */}
              {selectedTrxDetail.status_pembayaran === 'CANCELLED' && selectedTrxDetail.alasan_batal && (
                <div className="bg-red-50 p-3.5 rounded-xl border border-red-100">
                  <span className="block text-[9px] font-bold text-red-600 uppercase tracking-wider mb-1.5">Alasan Pembatalan:</span>
                  <div className="text-xs text-red-700 font-medium leading-relaxed">{selectedTrxDetail.alasan_batal}</div>
                </div>
              )}

              {/* Klaim Garansi */}
              {selectedTrxDetail.status_pembayaran === 'REFUNDED' && (
                <div className="bg-red-50 p-3.5 rounded-xl border border-red-100 space-y-2">
                  <div>
                    <span className="block text-[9px] font-bold text-red-600 uppercase tracking-wider">Klaim Garansi:</span>
                    <div className="text-xs text-red-700 font-bold mt-0.5">Hamster Mati/Klaim: {selectedTrxDetail.hamsters_mati || '-'}</div>
                  </div>
                  {selectedTrxDetail.nominal_refund && (
                    <div>
                      <span className="text-[9px] text-red-500 font-bold block uppercase">Refund Terkirim</span>
                      <span className="text-xs font-black text-red-700">Rp {selectedTrxDetail.nominal_refund.toLocaleString('id-ID')}</span>
                    </div>
                  )}
                  {selectedTrxDetail.bukti_refund && (
                    <div>
                      <button
                        type="button"
                        onClick={() => {
                          const url = selectedTrxDetail.bukti_refund || "";
                          const type = url.toLowerCase().endsWith(".mp4") || url.toLowerCase().endsWith(".mov") || url.toLowerCase().endsWith(".webm") ? "video" : "image";
                          setPreviewModal({ show: true, url, type });
                        }}
                        className="inline-block mt-1 px-3 py-1.5 bg-red-100 text-red-700 text-[10px] font-bold rounded-lg border border-red-200 hover:bg-red-200 transition-colors"
                      >
                        Lihat Bukti Transfer
                      </button>
                    </div>
                  )}
                </div>
              )}
                </div>
              )}
            </div>


            {/* Footer Actions */}
            <div className="p-4 sm:p-5 bg-gray-50 border-t border-gray-100">
              {isEditingTrx ? (
                /* ─── Edit Mode Footer ─── */
                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setIsEditingTrx(false)}
                    disabled={isSavingEdit}
                    className="px-4 py-2.5 text-xs font-bold text-gray-600 bg-gray-200 hover:bg-gray-300 rounded-xl transition disabled:opacity-50"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    form="edit-trx-form"
                    disabled={isSavingEdit}
                    className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 rounded-xl shadow-sm transition disabled:opacity-50"
                  >
                    {isSavingEdit ? (
                      <>
                        <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Menyimpan...
                      </>
                    ) : (
                      <>
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        Simpan Perubahan
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2 justify-end">
                {['LUNAS', 'DP'].includes(selectedTrxDetail.status_pembayaran) && selectedTrxDetail.alamat_lengkap && !selectedTrxDetail.nomor_resi && (
                  <>
                    {activeTab === 'siap-packing' && (
                      <>
                        <button
                          onClick={() => setConfirmModal({ id: selectedTrxDetail.transaction_id, status: 'VIDEO_PACKING' })}
                          className="bg-emerald-500 text-white px-4 py-2.5 rounded-xl hover:bg-emerald-600 shadow-sm transition text-xs font-bold uppercase tracking-wider flex items-center gap-1"
                          title="Proses Packing & Kirim Video"
                        >
                          Packing
                        </button>

                        <button
                          onClick={() => {
                            setShippingDate(selectedTrxDetail.tanggal_kirim || "");
                            setConfirmModal({ id: selectedTrxDetail.transaction_id, status: 'EDIT_DATE' });
                          }}
                          className="bg-amber-600 text-white px-4 py-2.5 rounded-xl hover:bg-amber-700 shadow-sm transition text-xs font-bold uppercase tracking-wider whitespace-nowrap"
                          title="Ubah Tanggal Kirim"
                        >
                          Ubah Tgl
                        </button>
                      </>
                    )}

                    {activeTab === 'siap-kirim' && (
                      <button
                        onClick={() => setConfirmModal({ id: selectedTrxDetail.transaction_id, status: 'DIKIRIM' })}
                        className="bg-blue-600 text-white px-4 py-2.5 rounded-xl hover:bg-blue-700 shadow-sm transition text-xs font-bold uppercase tracking-wider"
                      >
                        Berangkat
                      </button>
                    )}
                  </>
                )}

                {selectedTrxDetail.status_pembayaran === 'DIKIRIM' && (
                  <button
                    onClick={() => setArrivalModal(selectedTrxDetail)}
                    className="bg-green-600 text-white px-4 py-2.5 rounded-xl hover:bg-green-700 shadow-sm transition text-xs font-bold uppercase tracking-wider"
                  >
                    Sampai
                  </button>
                )}

                {selectedTrxDetail.status_pembayaran !== 'LUNAS' && selectedTrxDetail.status_pembayaran !== 'CANCELLED' && !['DIKIRIM', 'SAMPAI', 'GARANSI', 'REFUNDED'].includes(selectedTrxDetail.status_pembayaran) && (
                  <button
                    onClick={() => setConfirmModal({ id: selectedTrxDetail.transaction_id, status: 'LUNAS' })}
                    className="bg-green-600 text-white px-4 py-2.5 rounded-xl hover:bg-green-700 shadow-sm transition text-xs font-bold uppercase tracking-wider"
                    title="Tandai Lunas"
                  >
                    Lunas
                  </button>
                )}

                {(selectedTrxDetail.status_pembayaran === 'PENDING' || selectedTrxDetail.status_pembayaran === 'BELUM LUNAS') && (
                  <button
                    onClick={() => setConfirmModal({ id: selectedTrxDetail.transaction_id, status: 'DP' })}
                    className="bg-yellow-400 text-gray-900 border border-yellow-500 px-4 py-2.5 rounded-xl hover:bg-yellow-500 shadow-sm transition text-xs font-bold"
                    title="Tandai DP"
                  >
                    DP
                  </button>
                )}

                {!['CANCELLED', 'DIKIRIM', 'SAMPAI', 'GARANSI', 'REFUNDED'].includes(selectedTrxDetail.status_pembayaran) && (
                  <button
                    onClick={() => setConfirmModal({ id: selectedTrxDetail.transaction_id, status: 'CANCELLED' })}
                    className="bg-white text-red-500 border border-red-100 px-3.5 py-2.5 rounded-xl hover:bg-red-100 transition"
                    title="Batalkan"
                  >
                    Batalkan
                  </button>
                )}

                {selectedTrxDetail.status_pembayaran === 'GARANSI' && (
                  <button
                    onClick={() => setConfirmModal({ id: selectedTrxDetail.transaction_id, status: 'REFUNDED' })}
                    className="bg-green-600 text-white px-4 py-2.5 rounded-xl hover:bg-green-700 shadow-sm transition text-xs font-bold uppercase tracking-wider whitespace-nowrap"
                  >
                    Sudah Refund
                  </button>
                )}

                  <button
                    onClick={() => setSelectedTrxDetail(null)}
                    className="bg-gray-200 text-gray-700 px-4 py-2.5 rounded-xl hover:bg-gray-300 transition text-xs font-bold uppercase tracking-wider"
                  >
                    Tutup
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}{/* Modal Konfirmasi Sampai */}
      {arrivalModal && (() => {
        const kurirText = arrivalModal.keterangan_kurir || '';
        const isFullRefund = !!(
          kurirText.match(/instant|sameday|lokal/i) || 
          /(^|[^\d-])1\s*hari([^\d-]|$)/i.test(kurirText)
        );

        return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
          <div ref={modalRef} className={`bg-white rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 border border-gray-100 transition-all ${warrantyMode ? 'w-full max-w-md' : 'w-full max-w-sm'}`}>
            {!warrantyMode ? (
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-orange-50 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-orange-100">
                  <svg className="w-8 h-8 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-1">Konfirmasi Sampai</h3>
                <p className="text-gray-500 text-sm mb-8 leading-relaxed">Bagaimana kondisi hamster untuk pesanan <span className="font-bold text-gray-800">#{arrivalModal.transaction_id}</span> saat tiba?</p>

                <div className="space-y-3">
                  <button
                    onClick={() => updateStatus(arrivalModal.transaction_id, 'SAMPAI').then(() => setArrivalModal(null))}
                    className="w-full flex items-center gap-4 px-5 py-4 bg-green-600 hover:bg-green-700 text-white rounded-2xl transition-all shadow-lg shadow-green-100 group active:scale-95 cursor-pointer"
                  >
                    <svg className="w-6 h-6 text-white shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                    </svg>
                    <div className="text-left">
                      <div className="font-bold text-sm uppercase">Aman</div>
                      <div className="text-[10px] text-green-100">Hamster sehat & selamat</div>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setWarrantyMode(true);
                      setSelectedHamsters([]);
                    }}
                    className="w-full flex items-center gap-4 px-5 py-4 bg-white hover:bg-red-50 text-red-600 rounded-2xl border-2 border-red-100 transition-all group active:scale-95 cursor-pointer"
                  >
                    <svg className="w-6 h-6 text-red-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div className="text-left">
                      <div className="font-bold text-sm uppercase text-red-600">Ada Masalah</div>
                      <div className="text-[10px] text-red-400 font-medium">Mati/Sakit (Klaim Garansi)</div>
                    </div>
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <button onClick={() => setWarrantyMode(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <h3 className="text-lg font-bold text-gray-900">Pilih Hamster Bermasalah</h3>
                </div>

                <div className="space-y-3 mb-6 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {arrivalModal.hamsters_list.map((h: any) => (
                    <label key={h.id} className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all cursor-pointer ${selectedHamsters.includes(h.id) ? 'border-red-500 bg-red-50/50' : 'border-gray-100 hover:border-gray-200 bg-gray-50/30'}`}>
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selectedHamsters.includes(h.id)}
                          onChange={() => {
                            if (selectedHamsters.includes(h.id)) {
                              setSelectedHamsters(selectedHamsters.filter(id => id !== h.id));
                            } else {
                              setSelectedHamsters([...selectedHamsters, h.id]);
                            }
                          }}
                          className="w-5 h-5 rounded-lg text-red-600 focus:ring-red-500 border-gray-300"
                        />
                        <div>
                          <div className="font-bold text-gray-800 text-sm">{h.kode}</div>
                          <div className="text-[10px] text-gray-500 font-medium">
                            {h.variant} • {h.gender} • {h.usia}
                          </div>
                          <div className="text-[10px] text-brand-600 font-bold mt-0.5">Rp {h.harga.toLocaleString('id-ID')}</div>
                        </div>
                      </div>
                      {selectedHamsters.includes(h.id) && (
                        <div className="text-[10px] font-black text-red-600 bg-red-100 px-2 py-1 rounded uppercase">
                          {isFullRefund ? 'Garansi 100%' : 'Garansi 50%'}
                        </div>
                      )}
                    </label>
                  ))}
                </div>

                <div className="bg-red-50 rounded-2xl p-4 mb-6 border border-red-100">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold text-red-700 uppercase">Estimasi Refund</span>
                    <span className="text-lg font-black text-red-700">
                      Rp {(() => {
                        const multiplier = isFullRefund ? 1.0 : 0.5;
                        const total = arrivalModal.hamsters_list
                          .filter((h: any) => selectedHamsters.includes(h.id))
                          .reduce((sum: number, h: any) => sum + (h.harga * multiplier), 0);
                        return total.toLocaleString('id-ID');
                      })()}
                    </span>
                  </div>
                  <p className="text-[10px] text-red-500 leading-tight">
                    * {isFullRefund
                      ? 'Pengiriman Cepat / 1 Hari: Garansi 100% harga hamster.'
                      : 'Pengiriman > 1 Hari: Garansi 50% harga hamster.'}
                  </p>
                </div>

                <button
                  disabled={selectedHamsters.length === 0 || loading}
                  onClick={async () => {
                    const multiplier = isFullRefund ? 1.0 : 0.5;
                    const refund = arrivalModal.hamsters_list
                      .filter((h: any) => selectedHamsters.includes(h.id))
                      .reduce((sum: number, h: any) => sum + (h.harga * multiplier), 0);

                    // 1. Capture & Copy Image
                    if (modalRef.current) {
                      try {
                        const blob = await toBlob(modalRef.current, {
                          backgroundColor: '#ffffff',
                          pixelRatio: 2,
                          fontEmbedCSS: "",
                        });

                        if (blob) {
                          const data = [new ClipboardItem({ [blob.type]: blob })];
                          await navigator.clipboard.write(data);
                          console.log("Image copied to clipboard!");
                        }
                      } catch (err) {
                        console.error("Failed to copy image:", err);
                      }
                    }

                    // 2. Update Status
                    const hamsterCodes = arrivalModal.hamsters_list
                      .filter((h: any) => selectedHamsters.includes(h.id))
                      .map((h: any) => h.kode)
                      .join(', ');

                    updateStatus(arrivalModal.transaction_id, 'GARANSI', undefined, undefined, refund, undefined, hamsterCodes)
                      .then(() => {
                        setArrivalModal(null);
                        setWarrantyMode(false);
                        alert('✅ Garansi berhasil diajukan! Detail klaim juga sudah otomatis ter-copy ke clipboard Anda (siap di-paste ke WA).');
                      });
                  }}
                  className="w-full py-4 bg-red-600 text-white rounded-2xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-100 disabled:opacity-50 disabled:shadow-none active:scale-95 flex items-center justify-center gap-2"
                >
                  {loading ? 'Memproses...' : (
                    <>
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                      </svg>
                      Ajukan & Salin Rincian
                    </>
                  )}
                </button>
              </div>
            )}

            {!warrantyMode && (
              <button
                onClick={() => { setArrivalModal(null); setWarrantyMode(false); }}
                className="w-full py-4 text-sm font-bold text-gray-400 hover:bg-gray-50 border-t border-gray-100 transition-colors"
              >
                Nanti Saja
              </button>
            )}
          </div>
        </div>
        );
      })()}
      {/* Modal Detail Alamat */}
      {viewAddressTrx && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-50 text-green-600 rounded-full flex items-center justify-center text-xl border border-green-100">
                    
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 leading-tight">Detail Alamat</h3>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">#{viewAddressTrx.transaction_id}</p>
                  </div>
                </div>
                <button onClick={() => setViewAddressTrx(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Penerima</label>
                  <div className="font-bold text-gray-800 text-sm">{viewAddressTrx.alamat_data?.nama_penerima}</div>
                  <div className="text-gray-500 text-xs mt-0.5">{viewAddressTrx.alamat_data?.nomor_wa}</div>
                </div>

                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Alamat Lengkap</label>
                  <div className="text-gray-700 text-xs leading-relaxed">
                    {viewAddressTrx.alamat_data?.detail}<br />
                    {viewAddressTrx.alamat_data?.kelurahan}, {viewAddressTrx.alamat_data?.kecamatan}<br />
                    {viewAddressTrx.alamat_data?.kota}, {viewAddressTrx.alamat_data?.provinsi}<br />
                    <span className="font-bold">{viewAddressTrx.alamat_data?.kode_pos}</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    const addr = viewAddressTrx.alamat_data;
                    const text = `${addr.nama_penerima} (${addr.nomor_wa})\n${addr.detail}\n${addr.kelurahan}, ${addr.kecamatan}, ${addr.kota}, ${addr.provinsi}, ${addr.kode_pos}`;
                    navigator.clipboard.writeText(text);
                    alert('Alamat berhasil disalin ke clipboard!');
                  }}
                  className="w-full py-3.5 bg-brand-600 text-white rounded-2xl font-bold text-sm hover:bg-brand-700 transition shadow-lg shadow-brand-100 active:scale-95 flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                  Salin Alamat Lengkap
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Preview Bukti Modal */}
      {previewModal.show && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm" onClick={() => setPreviewModal({ show: false, url: "", type: "image" })}>
          <div className="bg-white rounded-3xl overflow-hidden w-full max-w-lg mx-auto shadow-2xl relative" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-bold text-gray-800">Bukti Transfer Refund</h3>
              <button onClick={() => setPreviewModal({ show: false, url: "", type: "image" })} className="text-gray-400 hover:text-gray-600 text-xl font-bold">
                ✕
              </button>
            </div>
            <div className="p-4 bg-gray-50 flex justify-center items-center" style={{ minHeight: '300px' }}>
              {previewModal.type === 'video' ? (
                <video controls src={previewModal.url} className="max-w-full max-h-[60vh] object-contain rounded-xl" />
              ) : (
                <img src={previewModal.url} alt="Bukti Transfer Refund" className="max-w-full max-h-[60vh] object-contain rounded-xl" />
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
