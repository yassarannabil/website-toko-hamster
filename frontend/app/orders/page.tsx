"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { isAuthenticated, getToken } from "../utils/auth";
import Footer from "../components/Footer";
import PageHeader from "../components/PageHeader";

interface Hamster {
  inventory_id: number;
  kode_hamster: string;
  spesies: string;
  varian_warna: string;
  jenis_kelamin: string;
  harga: number;
  foto: string;
}

interface AlamatInfo {
  nama_penerima: string;
  kota: string;
  provinsi: string;
  detail: string;
}

interface OrderData {
  transaction_id: number;
  invoice: string;
  status: string;
  metode_pembayaran: string;
  hamsters: Hamster[];
  biaya_packing: number;
  biaya_ongkir: number;
  total_bayar: number;
  nomor_resi: string;
  keterangan_kurir: string;
  alamat: AlamatInfo | null;
  payment_url: string;
  bukti_refund?: string;
  created_at: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  PENDING: { label: "Menunggu Pembayaran", color: "#e67e22", bgColor: "#fef3e2" },
  "BELUM LUNAS": { label: "Belum Lunas", color: "#e74c3c", bgColor: "#fde8e8" },
  DP: { label: "DP", color: "#f39c12", bgColor: "#fef9e7" },
  LUNAS: { label: "Lunas", color: "#27ae60", bgColor: "#e8f8f0" },
  DIKIRIM: { label: "Sedang Dikirim", color: "#3498db", bgColor: "#ebf5fb" },
  SAMPAI: { label: "Pesanan Selesai", color: "#2ecc71", bgColor: "#e8f8f0" },
  CANCELLED: { label: "Dibatalkan", color: "#95a5a6", bgColor: "#f2f3f4" },
  GARANSI: { label: "Garansi", color: "#e74c3c", bgColor: "#fde8e8" },
  REFUNDED: { label: "Refunded", color: "#8e44ad", bgColor: "#f4ecf7" },
};

const TAB_FILTERS = [
  { key: "all", label: "Semua" },
  { key: "PENDING", label: "Belum Bayar" },
  { key: "LUNAS", label: "Lunas" },
  { key: "DIKIRIM", label: "Dikirim" },
  { key: "SAMPAI", label: "Selesai" },
];

function formatRupiah(n: number) {
  return `Rp${n.toLocaleString("id-ID")}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [expandedOrder, setExpandedOrder] = useState<number | null>(null);

  const [confirmModal, setConfirmModal] = useState<{
    title: string;
    message: string | React.ReactNode;
    confirmText: string;
    cancelText: string;
    confirmColor?: string;
    action: () => void;
  } | null>(null);

  const [alertModal, setAlertModal] = useState<{
    title: string;
    message: string;
    type: 'SUCCESS' | 'ERROR';
  } | null>(null);

  const [previewModal, setPreviewModal] = useState<{ show: boolean, url: string, type: string }>({ show: false, url: "", type: "image" });

  const [problemModal, setProblemModal] = useState<{
    transaction_id: number;
    show: boolean;
    bank: string;
    rekening: string;
    atasNama: string;
  }>({
    transaction_id: 0,
    show: false,
    bank: "BCA",
    rekening: "",
    atasNama: ""
  });

  const fetchOrders = useCallback(async () => {
    try {
      const token = getToken();
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${baseUrl}/api/auth/transactions/`, {
        headers: { Authorization: `Token ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (err) {
      console.error("Fetch orders error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }
    fetchOrders();
  }, [router, fetchOrders]);

  const filteredOrders = activeTab === "all"
    ? orders
    : orders.filter((o) => o.status === activeTab);

  const handlePayNow = (paymentUrl: string) => {
    setConfirmModal({
      title: "Konfirmasi Pembayaran",
      message: "Lanjutkan ke halaman pembayaran untuk menyelesaikan transaksi Anda?",
      confirmText: "Lanjutkan",
      cancelText: "Batal",
      confirmColor: "linear-gradient(135deg, #ea8b3a, #dc7030)",
      action: () => {
        setConfirmModal(null);
        if (typeof window !== "undefined" && (window as any).loadJokulCheckout) {
          (window as any).loadJokulCheckout(paymentUrl);
        } else {
          window.location.href = paymentUrl;
        }
      }
    });
  };

  const handleCompleteOrder = async (transaction_id: number) => {
    setConfirmModal({
      title: "Konfirmasi Pesanan Diterima",
      message: "Apakah Anda yakin paket telah diterima dengan baik dan pesanan selesai? Aksi ini tidak dapat dibatalkan.",
      confirmText: "Pesanan Diterima",
      cancelText: "Batal",
      confirmColor: "linear-gradient(135deg, #2ecc71, #27ae60)",
      action: async () => {
        setConfirmModal(null);
        try {
          const token = getToken();
          const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
          const res = await fetch(`${baseUrl}/api/auth/transactions/`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Token ${token}`,
            },
            body: JSON.stringify({ action: "COMPLETE_ORDER", transaction_id }),
          });
          const data = await res.json();
          if (res.ok) {
            setAlertModal({ title: "Berhasil", message: "Pesanan berhasil diselesaikan!", type: "SUCCESS" });
            fetchOrders();
          } else {
            setAlertModal({ title: "Gagal", message: data.error || "Gagal menyelesaikan pesanan", type: "ERROR" });
          }
        } catch (err) {
          console.error("Complete order error:", err);
          setAlertModal({ title: "Kesalahan", message: "Kesalahan koneksi jaringan", type: "ERROR" });
        }
      }
    });
  };

  const handleProblemOrder = (transaction_id: number) => {
    setProblemModal({
      transaction_id,
      show: true,
      bank: "BCA",
      rekening: "",
      atasNama: ""
    });
  };

  const submitProblem = async () => {
    if (!problemModal.rekening || !problemModal.atasNama) {
      setAlertModal({ title: "Gagal", message: "Mohon isi Nomor Rekening dan Atas Nama", type: "ERROR" });
      return;
    }
    
    // Kirim pesan ke room chat secara otomatis
    const autoMessage = `Halo min, ini hamsternya ada yang bermasalah. Setelah ini saya kirimkan video unboxing-nya ya min, mohon ditunggu.\n${problemModal.bank} - ${problemModal.rekening} - a.n. ${problemModal.atasNama}`;
    
    try {
      const token = getToken();
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      
      // Ambil Room ID atau Get Or Create
      const roomRes = await fetch(`${baseUrl}/api/chat/rooms/`, {
        headers: { "Authorization": `Token ${token}` }
      });
      
      if (roomRes.ok) {
        const roomData = await roomRes.json();
        const roomId = roomData.room_id;
        
        // Kirim pesan
        await fetch(`${baseUrl}/api/chat/rooms/${roomId}/messages/`, {
          method: "POST",
          headers: {
            "Authorization": `Token ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ message: autoMessage })
        });
      }
    } catch (err) {
      console.error("Auto message error:", err);
    }
    
    setProblemModal({ ...problemModal, show: false });
    router.push("/chat");
  };

  const handleCancelOrder = async (transaction_id: number) => {
    setConfirmModal({
      title: "Batalkan Pesanan",
      message: "Apakah Anda yakin ingin membatalkan pesanan ini? Aksi ini tidak dapat dikembalikan.",
      confirmText: "Ya, Batalkan",
      cancelText: "Tutup",
      confirmColor: "linear-gradient(135deg, #e74c3c, #c0392b)",
      action: async () => {
        setConfirmModal(null);
        try {
          const token = getToken();
          const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
          const res = await fetch(`${baseUrl}/api/auth/transactions/`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Token ${token}`,
            },
            body: JSON.stringify({ action: "CANCEL_ORDER", transaction_id }),
          });
          const data = await res.json();
          if (res.ok) {
            setAlertModal({ title: "Dibatalkan", message: "Pesanan berhasil dibatalkan.", type: "SUCCESS" });
            fetchOrders();
          } else {
            setAlertModal({ title: "Gagal", message: data.error || "Gagal membatalkan pesanan", type: "ERROR" });
          }
        } catch (err) {
          console.error("Cancel order error:", err);
          setAlertModal({ title: "Kesalahan", message: "Kesalahan koneksi jaringan", type: "ERROR" });
        }
      }
    });
  };

  return (
    <div className="min-h-screen bg-[#fdfcfb] flex flex-col">
      <PageHeader title="Pesanan Saya" />

      {/* Tab Filters */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 40,
          background: "#fff",
          borderBottom: "1px solid #f0ece8",
          overflowX: "auto",
        }}
      >
        <div
          style={{
            maxWidth: "56rem",
            margin: "0 auto",
            display: "flex",
            gap: "0",
            padding: "0 1.25rem",
          }}
        >
          {TAB_FILTERS.map((tab) => {
            const count = tab.key === "all" ? orders.length : orders.filter((o) => o.status === tab.key).length;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  padding: "0.75rem 1rem",
                  fontSize: "0.85rem",
                  fontWeight: activeTab === tab.key ? 700 : 500,
                  color: activeTab === tab.key ? "#ea8b3a" : "#888",

                  background: "none",
                  border: "none",
                  borderBottomStyle: "solid",
                  borderBottomWidth: "2.5px",
                  borderBottomColor: activeTab === tab.key ? "#ea8b3a" : "transparent",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  transition: "all 0.2s",
                  position: "relative",
                }}
              >
                {tab.label}
                {count > 0 && (
                  <span
                    style={{
                      marginLeft: "0.35rem",
                      fontSize: "0.7rem",
                      background: activeTab === tab.key ? "#ea8b3a" : "#e0e0e0",
                      color: activeTab === tab.key ? "#fff" : "#666",
                      borderRadius: "999px",
                      padding: "0.1rem 0.45rem",
                      fontWeight: 700,
                    }}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <main style={{ flexGrow: 1, maxWidth: "56rem", margin: "0 auto", padding: "1rem 1.25rem 6rem", width: "100%" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "4rem 0" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "1rem", animation: "pulse 1.5s infinite" }}></div>
            <p style={{ color: "#aaa", fontWeight: 500 }}>Memuat pesanan...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "4rem 2rem",
              background: "#fff",
              borderRadius: "1rem",
              border: "1px solid #f0ece8",
            }}
          >
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}></div>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "0.5rem", color: "#333" }}>
              {activeTab === "all" ? "Belum Ada Pesanan" : "Tidak Ada Pesanan"}
            </h2>
            <p style={{ color: "#999", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
              {activeTab === "all"
                ? "Yuk mulai belanja hamster kesayangan kamu!"
                : `Tidak ada pesanan dengan status "${TAB_FILTERS.find((t) => t.key === activeTab)?.label}"`}
            </p>
            {activeTab === "all" && (
              <Link
                href="/katalog"
                style={{
                  display: "inline-block",
                  padding: "0.75rem 2rem",
                  background: "linear-gradient(135deg, #ea8b3a, #dc7030)",
                  color: "#fff",
                  borderRadius: "0.75rem",
                  fontWeight: 700,
                  textDecoration: "none",
                  fontSize: "0.9rem",
                }}
              >
                 Mulai Belanja
              </Link>
            )}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {filteredOrders.map((order) => {
              const statusCfg = STATUS_CONFIG[order.status] || STATUS_CONFIG["PENDING"];
              const isExpanded = expandedOrder === order.transaction_id;
              const isPending = order.status === "PENDING" || order.status === "BELUM LUNAS";
              const hasPaymentUrl = !!order.payment_url;

              return (
                <div
                  key={order.transaction_id}
                  style={{
                    background: "#fff",
                    borderRadius: "1rem",
                    border: "1px solid #f0ece8",
                    overflow: "hidden",
                    transition: "box-shadow 0.2s",
                  }}
                >
                  {/* Order Header */}
                  <div
                    onClick={() => setExpandedOrder(isExpanded ? null : order.transaction_id)}
                    style={{
                      padding: "1rem 1.25rem",
                      cursor: "pointer",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      borderBottom: isExpanded ? "1px solid #f0ece8" : "none",
                    }}
                  >
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#555" }}>{order.invoice}</span>
                        <span
                          style={{
                            fontSize: "0.7rem",
                            fontWeight: 700,
                            color: statusCfg.color,
                            background: statusCfg.bgColor,
                            padding: "0.15rem 0.5rem",
                            borderRadius: "999px",
                          }}
                        >
                          {statusCfg.label}
                        </span>
                      </div>
                      <span style={{ fontSize: "0.75rem", color: "#aaa" }}>{formatDate(order.created_at)}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <span style={{ fontWeight: 800, color: "#ea8b3a", fontSize: "0.95rem" }}>
                        {formatRupiah(order.total_bayar)}
                      </span>
                      <span
                        style={{
                          transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                          transition: "transform 0.2s",
                          fontSize: "0.8rem",
                          color: "#bbb",
                        }}
                      >
                        ▼
                      </span>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div style={{ padding: "1rem 1.25rem" }}>
                      {/* Hamsters */}
                      <div style={{ marginBottom: "1rem" }}>
                        <p style={{ fontSize: "0.75rem", fontWeight: 700, color: "#888", marginBottom: "0.5rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                          Produk
                        </p>
                        {order.hamsters.map((h) => (
                          <div
                            key={h.inventory_id}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.75rem",
                              padding: "0.5rem 0",
                              borderBottom: "1px solid #f8f6f4",
                            }}
                          >
                            <div
                              style={{
                                width: "48px",
                                height: "48px",
                                borderRadius: "0.75rem",
                                overflow: "hidden",
                                background: "#f8f6f4",
                                flexShrink: 0,
                              }}
                            >
                              {h.foto ? (
                                <img src={h.foto} alt={h.kode_hamster} style={{ objectFit: "cover", width: "100%", height: "100%" }} />
                              ) : (
                                <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.25rem" }}>
                                  
                                </div>
                              )}
                            </div>
                            <div style={{ flexGrow: 1, minWidth: 0 }}>
                              <p style={{ fontWeight: 700, fontSize: "0.85rem", color: "#333", margin: 0 }}>
                                {h.spesies} — {h.varian_warna}
                              </p>
                              <p style={{ fontSize: "0.75rem", color: "#999", margin: 0 }}>
                                {h.kode_hamster} · {h.jenis_kelamin}
                              </p>
                            </div>
                            <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "#333", flexShrink: 0 }}>
                              {formatRupiah(h.harga)}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Price Breakdown */}
                      <div
                        style={{
                          background: "#faf8f6",
                          borderRadius: "0.75rem",
                          padding: "0.75rem 1rem",
                          marginBottom: "1rem",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "#888", marginBottom: "0.25rem" }}>
                          <span>Subtotal</span>
                          <span>{formatRupiah(order.hamsters.reduce((s, h) => s + h.harga, 0))}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "#888", marginBottom: "0.25rem" }}>
                          <span>Biaya Packing</span>
                          <span>{formatRupiah(order.biaya_packing)}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "#888", marginBottom: "0.5rem" }}>
                          <span>Ongkos Kirim</span>
                          <span>{formatRupiah(order.biaya_ongkir)}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem", fontWeight: 800, color: "#1a1614", borderTop: "1px solid #e8e4e0", paddingTop: "0.5rem" }}>
                          <span>Total</span>
                          <span style={{ color: "#ea8b3a" }}>{formatRupiah(order.total_bayar)}</span>
                        </div>
                      </div>

                      {/* Address */}
                      {order.alamat && (
                        <div style={{ marginBottom: "1rem" }}>
                          <p style={{ fontSize: "0.75rem", fontWeight: 700, color: "#888", marginBottom: "0.35rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                            Alamat Pengiriman
                          </p>
                          <div style={{ fontSize: "0.85rem", color: "#555", lineHeight: 1.5 }}>
                            <p style={{ fontWeight: 700, margin: 0 }}>{order.alamat.nama_penerima}</p>
                            <p style={{ margin: 0 }}>{order.alamat.detail}</p>
                            <p style={{ margin: 0 }}>
                              {order.alamat.kota}, {order.alamat.provinsi}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Resi */}
                      {order.nomor_resi && (
                        <div style={{ marginBottom: "1rem" }}>
                          <p style={{ fontSize: "0.75rem", fontWeight: 700, color: "#888", marginBottom: "0.35rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                            Nomor Resi
                          </p>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                            <div
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "0.5rem",
                                background: "#ebf5fb",
                                padding: "0.5rem 1rem",
                                borderRadius: "0.5rem",
                              }}
                            >
                              <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "#2980b9", fontFamily: "monospace" }}>
                                {order.nomor_resi}
                              </span>
                              <button
                                onClick={() => navigator.clipboard.writeText(order.nomor_resi)}
                                style={{
                                  background: "none",
                                  border: "none",
                                  cursor: "pointer",
                                  fontSize: "0.85rem",
                                  color: "#2980b9",
                                }}
                                title="Salin Nomor Resi"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                </svg>
                              </button>
                            </div>
                            <a
                              href={
                                (order.keterangan_kurir?.toUpperCase().includes("TIKI"))
                                  ? `https://tiki.id/id/track/${order.nomor_resi}`
                                  : (order.keterangan_kurir?.toUpperCase().includes("POS"))
                                  ? `https://www.posindonesia.co.id/id/tracking/${order.nomor_resi}`
                                  : `https://cekresi.com/?noresi=${order.nomor_resi}`
                              }
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                padding: "0.5rem 1rem",
                                background: "#2980b9",
                                color: "#fff",
                                borderRadius: "0.5rem",
                                fontSize: "0.8rem",
                                fontWeight: 700,
                                textDecoration: "none",
                                display: "inline-flex",
                                alignItems: "center",
                                transition: "background 0.2s",
                              }}
                              onMouseOver={(e) => (e.currentTarget.style.background = "#1f6391")}
                              onMouseOut={(e) => (e.currentTarget.style.background = "#2980b9")}
                            >
                              Cek Resi ↗
                            </a>
                          </div>
                          {order.keterangan_kurir && (
                            <p style={{ fontSize: "0.8rem", color: "#888", marginTop: "0.5rem" }}>via {order.keterangan_kurir}</p>
                          )}
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                        {(order.status === 'REFUNDED' && order.bukti_refund) && (
                          <button
                            onClick={() => {
                              const url = order.bukti_refund || "";
                              const type = url.toLowerCase().endsWith(".mp4") || url.toLowerCase().endsWith(".mov") || url.toLowerCase().endsWith(".webm") ? "video" : "image";
                              setPreviewModal({ show: true, url, type });
                            }}
                            style={{
                              width: "100%",
                              padding: "0.75rem",
                              background: "#e8f8f5",
                              color: "#16a085",
                              borderRadius: "0.75rem",
                              fontWeight: 700,
                              textDecoration: "none",
                              fontSize: "0.85rem",
                              textAlign: "center",
                              border: "1px dashed #16a085",
                              marginBottom: "0.5rem",
                              cursor: "pointer"
                            }}
                          >
                            Lihat Bukti Transfer Refund
                          </button>
                        )}
                        <Link
                          href="/chat"
                          style={{
                            width: "100%",
                            padding: "0.75rem 1.25rem",
                            background: "#f4f2f0",
                            color: "#555",
                            borderRadius: "0.75rem",
                            fontWeight: 600,
                            textDecoration: "none",
                            fontSize: "0.85rem",
                            textAlign: "center",
                          }}
                        >
                          Chat Admin
                        </Link>

                        {isPending && (
                          <div style={{ display: "flex", gap: "0.5rem", width: "100%" }}>
                            <button
                              onClick={() => handleCancelOrder(order.transaction_id)}
                              style={{
                                flex: 1,
                                padding: "0.75rem",
                                background: "#fdf0ed",
                                color: "#e74c3c",
                                borderRadius: "0.75rem",
                                fontWeight: 700,
                                border: "1.5px solid #e74c3c",
                                cursor: "pointer",
                                fontSize: "0.85rem",
                                transition: "transform 0.1s",
                              }}
                              onMouseOver={(e) => {
                                (e.target as HTMLElement).style.background = "#fadbd8";
                              }}
                              onMouseOut={(e) => {
                                (e.target as HTMLElement).style.background = "#fdf0ed";
                              }}
                              onMouseDown={(e) => ((e.target as HTMLElement).style.transform = "scale(0.97)")}
                              onMouseUp={(e) => ((e.target as HTMLElement).style.transform = "scale(1)")}
                            >
                              Batalkan Pesanan
                            </button>
                            {hasPaymentUrl && (
                              <button
                                onClick={() => handlePayNow(order.payment_url)}
                                style={{
                                  flex: 1,
                                  padding: "0.75rem",
                                  background: "linear-gradient(135deg, #ea8b3a, #dc7030)",
                                  color: "#fff",
                                  borderRadius: "0.75rem",
                                  fontWeight: 700,
                                  border: "none",
                                  cursor: "pointer",
                                  fontSize: "0.85rem",
                                  transition: "transform 0.1s",
                                }}
                                onMouseDown={(e) => ((e.target as HTMLElement).style.transform = "scale(0.97)")}
                                onMouseUp={(e) => ((e.target as HTMLElement).style.transform = "scale(1)")}
                              >
                                Bayar Sekarang
                              </button>
                            )}
                          </div>
                        )}
                        {order.status === 'DIKIRIM' && (
                          <div style={{ display: "flex", gap: "0.5rem", width: "100%" }}>
                            <button
                              onClick={() => handleProblemOrder(order.transaction_id)}
                              style={{
                                flex: 1,
                                padding: "0.75rem",
                                background: "transparent",
                                color: "#e74c3c",
                                border: "1.5px solid #e74c3c",
                                borderRadius: "0.75rem",
                                fontWeight: 700,
                                cursor: "pointer",
                                fontSize: "0.8rem",
                                transition: "all 0.2s",
                              }}
                              onMouseOver={(e) => {
                                (e.target as HTMLElement).style.background = "#fdf0ed";
                              }}
                              onMouseOut={(e) => {
                                (e.target as HTMLElement).style.background = "transparent";
                              }}
                              onMouseDown={(e) => ((e.target as HTMLElement).style.transform = "scale(0.97)")}
                              onMouseUp={(e) => ((e.target as HTMLElement).style.transform = "scale(1)")}
                            >
                              Bermasalah
                            </button>
                            <button
                              onClick={() => handleCompleteOrder(order.transaction_id)}
                              style={{
                                flex: 1,
                                padding: "0.75rem",
                                background: "linear-gradient(135deg, #2ecc71, #27ae60)",
                                color: "#fff",
                                borderRadius: "0.75rem",
                                fontWeight: 700,
                                border: "none",
                                cursor: "pointer",
                                fontSize: "0.8rem",
                                transition: "transform 0.1s",
                              }}
                              onMouseDown={(e) => ((e.target as HTMLElement).style.transform = "scale(0.97)")}
                              onMouseUp={(e) => ((e.target as HTMLElement).style.transform = "scale(1)")}
                            >
                              Diterima (Aman)
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
      <Footer />

      {/* Confirm Modal */}
      {confirmModal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden border border-gray-100 transform animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
                ❓
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">{confirmModal.title}</h3>
              <div className="text-gray-500 text-sm leading-relaxed mb-6">
                {confirmModal.message}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setConfirmModal(null)}
                  className="px-4 py-3 text-gray-500 font-bold text-sm hover:bg-gray-100 rounded-xl transition"
                >
                  {confirmModal.cancelText}
                </button>
                <button
                  onClick={confirmModal.action}
                  style={{ background: confirmModal.confirmColor || "linear-gradient(135deg, #ea8b3a, #dc7030)" }}
                  className="px-4 py-3 text-white font-bold text-sm rounded-xl shadow-lg transition transform hover:scale-105 active:scale-95"
                >
                  {confirmModal.confirmText}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Problem Modal */}
      {problemModal.show && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden border border-gray-100 transform animate-in zoom-in-95 duration-200 text-left">
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-2 text-center">Klaim Garansi / Komplain</h3>
              <div className="text-gray-500 text-sm leading-relaxed mb-4 text-center">
                Untuk klaim garansi, siapkan <strong>VIDEO UNBOXING</strong>. Silakan isi rekening penerima dana refund jika klaim disetujui.
              </div>
              
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">Bank / E-Wallet</label>
                  <select 
                    value={problemModal.bank}
                    onChange={(e) => setProblemModal({...problemModal, bank: e.target.value})}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                  >
                    <option value="BCA">BCA</option>
                    <option value="Mandiri">Mandiri</option>
                    <option value="BNI">BNI</option>
                    <option value="BRI">BRI</option>
                    <option value="GoPay">GoPay</option>
                    <option value="OVO">OVO</option>
                    <option value="Dana">Dana</option>
                    <option value="ShopeePay">ShopeePay</option>
                    <option value="Lainnya">Lainnya (Chat Admin)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">Nomor Rekening / No HP</label>
                  <input 
                    type="text" 
                    placeholder="Contoh: 0182736452"
                    value={problemModal.rekening}
                    onChange={(e) => setProblemModal({...problemModal, rekening: e.target.value})}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">Atas Nama</label>
                  <input 
                    type="text" 
                    placeholder="Contoh: Yassar Annabil"
                    value={problemModal.atasNama}
                    onChange={(e) => setProblemModal({...problemModal, atasNama: e.target.value})}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setProblemModal({...problemModal, show: false})}
                  className="px-4 py-3 text-gray-500 font-bold text-sm hover:bg-gray-100 rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  onClick={submitProblem}
                  className="px-4 py-3 bg-red-600 text-white font-bold text-sm rounded-xl shadow-lg transition transform hover:scale-105 active:scale-95"
                >
                  Lanjut ke Chat
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Alert Modal */}
      {alertModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 md:p-8 w-full max-w-sm mx-auto shadow-2xl text-center transform transition-all">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl ${alertModal.type === 'SUCCESS' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
              {alertModal.type === 'SUCCESS' ? '✓' : '✗'}
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">{alertModal.title}</h3>
            <p className="text-sm text-gray-500 mb-6 leading-relaxed">
              {alertModal.message}
            </p>
            <button
              onClick={() => setAlertModal(null)}
              className={`w-full px-4 py-3 text-white font-bold text-sm rounded-xl shadow-lg transition transform hover:scale-105 active:scale-95 ${alertModal.type === 'SUCCESS' ? 'bg-green-600' : 'bg-red-600'}`}
            >
              Tutup
            </button>
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

      <style jsx global>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.1); }
        }
      `}</style>
    </div>
  );
}
