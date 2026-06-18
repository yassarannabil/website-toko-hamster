"use client";

import { useState, useEffect } from 'react';
import { WHATSAPP_NUMBER } from '../../data/hamsters';

export default function PrintBatchPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Inject print styles specific to thermal printer (100mm x 150mm)
    const style = document.createElement('style');
    style.innerHTML = `
      @page { size: 100mm 150mm; margin: 0; }
      body { margin: 0; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .print-page { 
        width: 100mm; 
        height: 150mm; 
        padding: 5mm; 
        box-sizing: border-box; 
        page-break-after: always;
        display: flex;
        flex-direction: column;
        background: white;
        font-family: Arial, sans-serif;
      }
      .print-page:last-child { page-break-after: auto; }
      
      @media screen {
        body { background: #f3f4f6; display: flex; flex-direction: column; align-items: center; padding: 20px; gap: 20px; }
        .print-page { box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); border: 1px dashed #ccc; }
      }
    `;
    document.head.appendChild(style);

    fetch('/api/dashboard/transactions/')
      .then(res => res.json())
      .then(data => {
        // Filter: Hanya Siap Kirim (Lunas + Alamat Lengkap + Belum ada resi)
        const siapKirim = data.filter((trx: any) => 
          trx.status_pembayaran === 'LUNAS' && 
          trx.alamat_lengkap === true && 
          !trx.nomor_resi
        );
        // Urutkan dari yang terlama
        setTransactions(siapKirim.reverse());
        setLoading(false);
        
        // Auto print setelah dirender
        if (siapKirim.length > 0) {
          setTimeout(() => {
            window.print();
          }, 1000);
        }
      });

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const formatRupiah = (num: number) => num.toLocaleString('id-ID');

  if (loading) return <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>Memuat data untuk dicetak...</div>;
  if (transactions.length === 0) return <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>Tidak ada transaksi Siap Kirim untuk dicetak.</div>;

  return (
    <>
      {transactions.map((trx) => (
        <div key={trx.transaction_id} className="print-page">
          
          {/* =========================================
              BAGIAN 1: NOTA INTERNAL (Atas)
          ========================================= */}
          <div style={{ flex: '0 0 auto', borderBottom: '2px dashed #000', paddingBottom: '3mm', marginBottom: '3mm' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2mm' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '14px', fontWeight: 'bold' }}>NOTA INTERNAL</h2>
                <div style={{ fontSize: '10px', marginTop: '1mm' }}>
                  Tgl: {new Date(trx.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '900' }}>#{trx.transaction_id}</h1>
              </div>
            </div>

            <table style={{ width: '100%', fontSize: '9px', borderCollapse: 'collapse', marginBottom: '2mm' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #000', textAlign: 'left' }}>
                  <th style={{ paddingBottom: '1mm' }}>KODE</th>
                  <th style={{ paddingBottom: '1mm' }}>PRODUK</th>
                  <th style={{ paddingBottom: '1mm', textAlign: 'right' }}>HARGA</th>
                </tr>
              </thead>
              <tbody>
                {trx.hamsters_list.map((h: any) => (
                  <tr key={h.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '1mm 0', fontWeight: 'bold' }}>{h.kode}</td>
                    <td style={{ padding: '1mm 0', fontSize: '8px' }}>
                      {h.variant} - {h.gender}<br/>
                      ({h.usia})
                    </td>
                    <td style={{ padding: '1mm 0', textAlign: 'right' }}>{formatRupiah(h.harga)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', fontWeight: 'bold' }}>
              <div>Tot. Hamster: {trx.hamsters_list.length} ekor</div>
              <div>Tot. Bayar: Rp {formatRupiah(trx.total_bayar)}</div>
            </div>
            
            {trx.biaya_packing > 0 && (
              <div style={{ fontSize: '10px', fontWeight: 'bold', marginTop: '2mm', background: '#000', color: '#fff', padding: '1mm', textAlign: 'center', borderRadius: '2px' }}>
                PACKING BUBBLE / KAYU (Rp {formatRupiah(trx.biaya_packing)})
              </div>
            )}
            {trx.biaya_packing === 0 && (
              <div style={{ fontSize: '10px', fontWeight: 'bold', marginTop: '2mm', border: '1px solid #000', padding: '1mm', textAlign: 'center', borderRadius: '2px' }}>
                PACKING THINWALL (Gratis)
              </div>
            )}
          </div>

          {/* =========================================
              BAGIAN 2: LABEL PENGIRIMAN (Bawah)
          ========================================= */}
          <div style={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column' }}>
            {trx.keterangan_kurir?.toLowerCase().match(/instant|sameday|lokal/i) && (
              <div style={{ background: '#000', color: '#fff', textAlign: 'center', padding: '2mm', fontWeight: '900', fontSize: '14px', marginBottom: '2mm', border: '2px dashed #fff', outline: '2px solid #000' }}>
                ⚠️ PENGIRIMAN INSTAN / URGENT ⚠️
              </div>
            )}
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2mm', borderBottom: '3px solid #000', paddingBottom: '2mm' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '12px' }}>NOSKA HAMSTER</h3>
                <div style={{ fontSize: '9px' }}>WA: +{WHATSAPP_NUMBER}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '900', textTransform: 'uppercase' }}>
                  {trx.keterangan_kurir ? trx.keterangan_kurir.split(' ')[0] : 'KURIR'}
                </h2>
                <div style={{ fontSize: '10px', fontWeight: 'bold' }}>{trx.keterangan_kurir}</div>
              </div>
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '10px', fontWeight: 'bold', marginBottom: '1mm' }}>PENERIMA:</div>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>{trx.alamat_data?.nama_penerima || trx.nama_customer}</h2>
              <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '2mm' }}>{trx.alamat_data?.nomor_wa || trx.nomor_wa}</div>
              
              <div style={{ fontSize: '11px', lineHeight: '1.4' }}>
                {trx.alamat_data?.detail}<br/>
                Kel. {trx.alamat_data?.kelurahan}, Kec. {trx.alamat_data?.kecamatan}<br/>
                {trx.alamat_data?.kota}, {trx.alamat_data?.provinsi}<br/>
                <span style={{ fontWeight: 'bold', fontSize: '13px', display: 'inline-block', marginTop: '1mm' }}>
                  KODE POS: {trx.alamat_data?.kode_pos}
                </span>
              </div>
            </div>

            <div style={{ textAlign: 'center', borderTop: '1px dashed #000', paddingTop: '2mm', fontSize: '8px', marginTop: 'auto' }}>
              Pesanan #{trx.transaction_id} | Noska Hamster Label
            </div>
          </div>
          
        </div>
      ))}
    </>
  );
}
