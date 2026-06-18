from celery import shared_task
from django.utils import timezone
from datetime import timedelta
from django.db import transaction
from core.models import Transaction, LiveInventory

@shared_task
def check_pending_transactions():
    """
    Tugas yang dijalankan secara berkala untuk mengecek transaksi PENDING.
    Jika transaksi PENDING sudah berusia lebih dari 60 menit (batas DOKU),
    maka transaksi dibatalkan (CANCELLED) dan status hamster dikembalikan ke TERSEDIA.
    """
    time_threshold = timezone.now() - timedelta(minutes=60)
    
    # Cari transaksi yang masih PENDING dan sudah melewati batas waktu
    expired_transactions = Transaction.objects.filter(
        status_pembayaran='PENDING',
        created_at__lte=time_threshold
    )

    for trx in expired_transactions:
        with transaction.atomic():
            # Kunci baris transaksi agar tidak ada balapan dengan webhook DOKU
            locked_trx = Transaction.objects.select_for_update().get(pk=trx.pk)
            
            # Cek ulang di dalam atomic block, siapa tahu baru saja dibayar mili-detik lalu
            if locked_trx.status_pembayaran == 'PENDING':
                locked_trx.status_pembayaran = 'CANCELLED'
                locked_trx.alasan_batal = 'Batas waktu pembayaran otomatis (60 menit) telah kedaluwarsa'
                locked_trx.save()

                # Kembalikan status hamster menjadi TERSEDIA
                for hamster in locked_trx.hamsters.all():
                    if hamster.status_ketersediaan in ['Terjual', 'Hold']:
                        hamster.status_ketersediaan = 'Tersedia'
                        hamster.save()
                        
    return f"Processed {expired_transactions.count()} expired transactions."
