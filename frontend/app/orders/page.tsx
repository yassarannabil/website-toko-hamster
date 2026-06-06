"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { isAuthenticated, getToken } from "../utils/auth";
import Footer from "../components/Footer";
import PageHeader from "../components/PageHeader";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

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
    // Try DOKU popup first
    if (typeof window !== "undefined" && (window as any).loadJokulCheckout) {
      (window as any).loadJokulCheckout(paymentUrl);
    } else {
      window.location.href = paymentUrl;
    }
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
            <div style={{ fontSize: "2.5rem", marginBottom: "1rem", animation: "pulse 1.5s infinite" }}>🐹</div>
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
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📋</div>
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
                🛒 Mulai Belanja
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
                                <Image src={h.foto} alt={h.kode_hamster} width={48} height={48} style={{ objectFit: "cover", width: "100%", height: "100%" }} />
                              ) : (
                                <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.25rem" }}>
                                  🐹
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
                            >
                              📋
                            </button>
                          </div>
                          {order.keterangan_kurir && (
                            <p style={{ fontSize: "0.8rem", color: "#888", marginTop: "0.25rem" }}>via {order.keterangan_kurir}</p>
                          )}
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                        {isPending && hasPaymentUrl && (
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
                        <Link
                          href="/chat"
                          style={{
                            flex: isPending && hasPaymentUrl ? "none" : 1,
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

      <style jsx global>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.1); }
        }
      `}</style>
    </div>
  );
}
