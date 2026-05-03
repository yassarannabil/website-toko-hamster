"""
Noska Hamster — E-Commerce & Operational Management Models
===========================================================
9 entitas ternormalisasi (3NF) dengan integritas relasional ketat.
Semua FK menggunakan PROTECT / SET_NULL agar data historis nota tidak hilang.
"""

import uuid
from decimal import Decimal
from django.db import models
from django.core.validators import MinValueValidator


# ──────────────────────────────────────────────
# 1. Customers
# ──────────────────────────────────────────────
class Customer(models.Model):
    customer_id = models.AutoField(primary_key=True)
    nama_customer = models.CharField("Nama Customer", max_length=150)
    nomor_wa = models.CharField("Nomor WhatsApp", max_length=20, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "customers"
        verbose_name = "Customer"
        verbose_name_plural = "Customers"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.nama_customer} ({self.nomor_wa})"


# ──────────────────────────────────────────────
# 2. Addresses
# ──────────────────────────────────────────────
class Address(models.Model):
    address_id = models.AutoField(primary_key=True)
    customer = models.ForeignKey(
        Customer,
        on_delete=models.CASCADE,
        related_name="addresses",
        verbose_name="Customer",
    )
    label_alamat = models.CharField(
        "Label", max_length=50, default="Rumah",
        help_text="Contoh: Rumah, Kantor, Toko"
    )
    nama_penerima = models.CharField("Nama Penerima", max_length=150)
    nomor_wa_penerima = models.CharField("No. WA Penerima", max_length=20)
    detail_alamat = models.TextField("Detail Alamat")
    kecamatan = models.CharField("Kecamatan", max_length=100, blank=True)
    kota_kabupaten = models.CharField("Kota / Kabupaten", max_length=100)
    provinsi = models.CharField("Provinsi", max_length=100)
    kode_pos = models.CharField("Kode Pos", max_length=10, blank=True)
    is_default = models.BooleanField("Alamat Utama?", default=False)

    class Meta:
        db_table = "addresses"
        verbose_name = "Alamat"
        verbose_name_plural = "Alamat"

    def __str__(self):
        return f"[{self.label_alamat}] {self.nama_penerima} — {self.kota_kabupaten}"


# ──────────────────────────────────────────────
# 3. Master Variants (Genetik Hamster)
# ──────────────────────────────────────────────
class MasterVariant(models.Model):
    class Spesies(models.TextChoices):
        SYRIAN = "Syrian", "Syrian"
        WINTER_WHITE = "Winter White", "Winter White"
        CAMPBELL = "Campbell", "Campbell"
        ROBOROVSKI = "Roborovski", "Roborovski"

    class JenisBulu(models.TextChoices):
        SHORT_HAIR = "Short Hair", "Short Hair"
        MEDIUM_HAIR = "Medium Hair", "Medium Hair"
        LONG_HAIR = "Long Hair", "Long Hair"
        REX = "Rex", "Rex"

    variant_id = models.AutoField(primary_key=True)
    spesies = models.CharField(
        "Spesies", max_length=100,
        choices=Spesies.choices,
    )
    varian_warna = models.CharField(
        "Varian Warna", max_length=100,
        help_text="Contoh: Golden, Black Bear, Sapphire",
    )
    jenis_bulu = models.CharField(
        "Jenis Bulu", max_length=50,
        choices=JenisBulu.choices, default=JenisBulu.SHORT_HAIR,
    )
    is_satin = models.BooleanField("Satin?", default=False)

    class Meta:
        db_table = "master_variants"
        verbose_name = "Master Varian"
        verbose_name_plural = "Master Varian"
        unique_together = ["spesies", "varian_warna", "jenis_bulu", "is_satin"]
        ordering = ["spesies", "varian_warna"]

    def __str__(self):
        satin_tag = " Satin" if self.is_satin else ""
        return f"{self.spesies} — {self.varian_warna} ({self.jenis_bulu}{satin_tag})"


# ──────────────────────────────────────────────
# 4. Setup Session (Sesi Live)
# ──────────────────────────────────────────────
class SetupSession(models.Model):
    session_id = models.AutoField(primary_key=True)
    nama_sesi = models.CharField(
        "Nama Sesi", max_length=150,
        help_text="Contoh: Sesi Live 3 Mei 2026",
    )
    is_active = models.BooleanField("Sesi Aktif?", default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "setup_sessions"
        verbose_name = "Sesi Live"
        verbose_name_plural = "Sesi Live"
        ordering = ["-created_at"]

    def save(self, *args, **kwargs):
        # Hanya boleh 1 sesi aktif → nonaktifkan yang lain
        if self.is_active:
            SetupSession.objects.filter(is_active=True).exclude(
                pk=self.pk
            ).update(is_active=False)
        super().save(*args, **kwargs)

    def __str__(self):
        status = "✅ AKTIF" if self.is_active else "📁"
        return f"{status} {self.nama_sesi}"


# ──────────────────────────────────────────────
# 5. Box (Kontainer dalam Sesi)
# ──────────────────────────────────────────────
class Box(models.Model):
    box_id = models.AutoField(primary_key=True)
    session = models.ForeignKey(
        SetupSession,
        on_delete=models.CASCADE,
        related_name="boxes",
        verbose_name="Sesi",
    )
    nama_box = models.CharField(
        "Nama Box", max_length=50,
        help_text="Contoh: Box A, Box B",
    )
    kategori = models.CharField(
        "Kategori", max_length=150, blank=True,
        help_text="Contoh: Syrian Betina Siapan, Campbell Mixed",
    )
    urutan = models.PositiveIntegerField("Urutan Tampil", default=0)

    class Meta:
        db_table = "boxes"
        verbose_name = "Box"
        verbose_name_plural = "Boxes"
        ordering = ["urutan", "nama_box"]
        unique_together = ["session", "nama_box"]

    def __str__(self):
        return f"{self.nama_box} — {self.kategori}" if self.kategori else self.nama_box


# ──────────────────────────────────────────────
# 6. Live Inventory (Katalog Sesi Live)
# ──────────────────────────────────────────────
class LiveInventory(models.Model):
    class StatusKetersediaan(models.TextChoices):
        TERSEDIA = "Tersedia", "Tersedia"
        TERJUAL = "Terjual", "Terjual"
        HOLD = "Hold", "Hold"

    class JenisKelamin(models.TextChoices):
        JANTAN = "Jantan", "Jantan"
        BETINA = "Betina", "Betina"
        BELUM_DIKETAHUI = "Belum Diketahui", "Belum Diketahui"

    # Choices usia: kelipatan 0.5 dari 1.0 s.d. 6.0
    USIA_CHOICES = [(Decimal(f"{x / 2:.1f}"), f"{x / 2:.1f} Bulan") for x in range(2, 13)]

    class GradeCorak(models.TextChoices):
        S_PLUS = "S+", "S+"
        A = "A", "A"
        B = "B", "B"
        C = "C", "C"

    inventory_id = models.AutoField(primary_key=True)
    box = models.ForeignKey(
        Box,
        on_delete=models.CASCADE,
        related_name="items",
        verbose_name="Box",
    )
    variant = models.ForeignKey(
        MasterVariant,
        on_delete=models.PROTECT,
        related_name="live_items",
        verbose_name="Varian Genetik",
    )
    kode_hamster = models.CharField(
        "Kode Hamster", max_length=30, unique=True,
        editable=False, blank=True, null=True,
        help_text="Auto-generated: HAM-[Box]-[Urutan]",
    )
    jenis_kelamin = models.CharField(
        "Jenis Kelamin", max_length=20,
        choices=JenisKelamin.choices, default=JenisKelamin.BELUM_DIKETAHUI,
    )
    usia_bulan = models.DecimalField(
        "Usia (bulan)", max_digits=3, decimal_places=1,
        choices=USIA_CHOICES,
    )
    grade_corak = models.CharField(
        "Grade Corak", max_length=5,
        choices=GradeCorak.choices,
    )
    kondisi_fisik = models.TextField("Kondisi Fisik", blank=True,
                                     help_text="Catatan kondisi: sehat, cacat ringan, dll.")
    foto_preview = models.ImageField(
        "Foto Preview", upload_to="inventory/foto/", blank=True, null=True,
    )
    video_file = models.FileField(
        "Video Hamster", upload_to="inventory/video/", blank=True, null=True,
    )
    harga_display = models.DecimalField(
        "Harga Display (Rp)", max_digits=12, decimal_places=0,
        validators=[MinValueValidator(0)],
    )
    status_ketersediaan = models.CharField(
        "Status", max_length=20,
        choices=StatusKetersediaan.choices, default=StatusKetersediaan.TERSEDIA,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "live_inventory"
        verbose_name = "Live Inventory"
        verbose_name_plural = "Live Inventory"
        ordering = ["box__urutan", "status_ketersediaan"]

    def save(self, *args, **kwargs):
        if not self.kode_hamster:
            box_name = self.box.nama_box.replace(" ", "") if self.box else "X"
            prefix = f"HAM-{box_name}-"
            # Search GLOBALLY by prefix to avoid collision across sessions
            last = (
                LiveInventory.objects
                .filter(kode_hamster__startswith=prefix)
                .exclude(kode_hamster__isnull=True)
                .order_by("-kode_hamster")
                .first()
            )
            seq = 1
            if last and last.kode_hamster:
                try:
                    seq = int(last.kode_hamster.rsplit("-", 1)[-1]) + 1
                except (ValueError, IndexError):
                    seq = 1
            self.kode_hamster = f"{prefix}{seq}"
        super().save(*args, **kwargs)

    def __str__(self):
        kode = self.kode_hamster or f"#{self.inventory_id}"
        return f"{kode} | {self.variant} — Rp{self.harga_display:,.0f}"


# ──────────────────────────────────────────────
# 7. Master Couriers
# ──────────────────────────────────────────────
class MasterCourier(models.Model):
    courier_id = models.AutoField(primary_key=True)
    nama_kurir = models.CharField("Nama Kurir", max_length=100,
                                  help_text="Contoh: JNE, Grab Instant, Kurir Pribadi")
    jenis_layanan = models.CharField("Jenis Layanan", max_length=100,
                                     help_text="Contoh: Same Day, Reguler, Cargo Hewan")
    is_active = models.BooleanField("Aktif?", default=True)

    class Meta:
        db_table = "master_couriers"
        verbose_name = "Kurir"
        verbose_name_plural = "Kurir"
        unique_together = ["nama_kurir", "jenis_layanan"]

    def __str__(self):
        return f"{self.nama_kurir} — {self.jenis_layanan}"


# ──────────────────────────────────────────────
# 8. Orders
# ──────────────────────────────────────────────
class Order(models.Model):
    class JenisPenjualan(models.TextChoices):
        LIVE = "Live", "Live (Eceran Eksklusif)"
        GROSIR = "Grosir", "Grosir (Masal)"

    class StatusOrder(models.TextChoices):
        PENDING = "Pending", "Pending"
        CONFIRMED = "Confirmed", "Confirmed"
        PACKING = "Packing", "Packing"
        SHIPPED = "Shipped", "Shipped"
        DELIVERED = "Delivered", "Delivered"
        CANCELLED = "Cancelled", "Cancelled"

    order_id = models.AutoField(primary_key=True)
    nomor_invoice = models.CharField(
        "No. Invoice", max_length=30, unique=True, editable=False,
    )
    customer = models.ForeignKey(
        Customer, on_delete=models.PROTECT,
        related_name="orders", verbose_name="Customer",
    )
    address = models.ForeignKey(
        Address, on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="orders", verbose_name="Alamat Pengiriman",
    )
    tanggal_order = models.DateTimeField("Tanggal Order", auto_now_add=True)
    jenis_penjualan = models.CharField(
        "Jenis Penjualan", max_length=10,
        choices=JenisPenjualan.choices,
    )
    status_order = models.CharField(
        "Status Order", max_length=20,
        choices=StatusOrder.choices, default=StatusOrder.PENDING,
    )
    total_order = models.DecimalField(
        "Total Order (Rp)", max_digits=15, decimal_places=0, default=0,
    )
    catatan_order = models.TextField("Catatan Order", blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "orders"
        verbose_name = "Order"
        verbose_name_plural = "Orders"
        ordering = ["-tanggal_order"]

    def save(self, *args, **kwargs):
        if not self.nomor_invoice:
            from django.utils import timezone
            now = timezone.now()
            prefix = "NH"
            date_str = now.strftime("%Y%m%d")
            # Cari urutan terakhir hari ini
            last = (
                Order.objects
                .filter(nomor_invoice__startswith=f"{prefix}-{date_str}")
                .order_by("-nomor_invoice")
                .first()
            )
            seq = 1
            if last:
                try:
                    seq = int(last.nomor_invoice.split("-")[-1]) + 1
                except ValueError:
                    seq = 1
            self.nomor_invoice = f"{prefix}-{date_str}-{seq:04d}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.nomor_invoice} | {self.customer.nama_customer}"


# ──────────────────────────────────────────────
# 9. Order Details
# ──────────────────────────────────────────────
class OrderDetail(models.Model):
    order_detail_id = models.AutoField(primary_key=True)
    order = models.ForeignKey(
        Order, on_delete=models.CASCADE,
        related_name="details", verbose_name="Order",
    )
    # Live → inventory_id (qty = 1)
    inventory = models.ForeignKey(
        LiveInventory, on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="order_details", verbose_name="Live Inventory Item",
        help_text="Isi untuk penjualan LIVE (qty otomatis 1).",
    )
    # Grosir → variant_id (qty >= 1)
    variant = models.ForeignKey(
        MasterVariant, on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="order_details", verbose_name="Varian (Grosir)",
        help_text="Isi untuk penjualan GROSIR.",
    )
    qty = models.PositiveIntegerField("Qty", default=1,
                                      validators=[MinValueValidator(1)])
    harga_satuan_deal = models.DecimalField(
        "Harga Satuan Deal (Rp)", max_digits=12, decimal_places=0,
    )
    subtotal = models.DecimalField(
        "Subtotal (Rp)", max_digits=15, decimal_places=0, editable=False, default=0,
    )
    catatan_khusus = models.TextField("Catatan Khusus", blank=True)

    class Meta:
        db_table = "order_details"
        verbose_name = "Detail Order"
        verbose_name_plural = "Detail Order"

    def save(self, *args, **kwargs):
        self.subtotal = self.qty * self.harga_satuan_deal
        super().save(*args, **kwargs)

    def __str__(self):
        item = self.inventory or self.variant or "—"
        return f"Detail #{self.order_detail_id} | {item} x{self.qty}"


# ──────────────────────────────────────────────
# 10. Shipments
# ──────────────────────────────────────────────
class Shipment(models.Model):
    class StatusKirim(models.TextChoices):
        MENUNGGU = "Menunggu Pickup", "Menunggu Pickup"
        DALAM_PERJALANAN = "Dalam Perjalanan", "Dalam Perjalanan"
        SAMPAI = "Sampai", "Sampai"
        GAGAL = "Gagal", "Gagal"

    class KondisiHamster(models.TextChoices):
        SEHAT = "Sehat", "Sehat"
        STRES_RINGAN = "Stres Ringan", "Stres Ringan"
        CEDERA = "Cedera", "Cedera"
        MATI = "Mati (DOA)", "Mati (DOA)"

    shipment_id = models.AutoField(primary_key=True)
    order = models.OneToOneField(
        Order, on_delete=models.CASCADE,
        related_name="shipment", verbose_name="Order",
    )
    courier = models.ForeignKey(
        MasterCourier, on_delete=models.PROTECT,
        related_name="shipments", verbose_name="Kurir",
    )
    nomor_resi = models.CharField("Nomor Resi", max_length=100, blank=True)
    tanggal_kirim = models.DateField("Tanggal Kirim", null=True, blank=True)
    estimasi_hari = models.PositiveSmallIntegerField("Estimasi Hari", default=1)
    tanggal_diterima = models.DateField("Tanggal Diterima", null=True, blank=True)
    status_kirim = models.CharField(
        "Status Kirim", max_length=30,
        choices=StatusKirim.choices, default=StatusKirim.MENUNGGU,
    )
    kondisi_hamster = models.CharField(
        "Kondisi Hamster Saat Tiba", max_length=30,
        choices=KondisiHamster.choices, blank=True,
    )
    catatan_pengiriman = models.TextField("Catatan Pengiriman", blank=True)

    class Meta:
        db_table = "shipments"
        verbose_name = "Pengiriman"
        verbose_name_plural = "Pengiriman"
        ordering = ["-tanggal_kirim"]

    def __str__(self):
        return f"Ship #{self.shipment_id} — {self.order.nomor_invoice}"


# ──────────────────────────────────────────────
# 11. Ledger (Buku Kas)
# ──────────────────────────────────────────────
class Ledger(models.Model):
    class TipeArus(models.TextChoices):
        MASUK = "Masuk", "Pemasukan"
        KELUAR = "Keluar", "Pengeluaran"

    class KategoriDana(models.TextChoices):
        PENJUALAN_LIVE = "Penjualan Live", "Penjualan Live"
        PENJUALAN_GROSIR = "Penjualan Grosir", "Penjualan Grosir"
        ONGKIR = "Ongkir", "Ongkir"
        PAKAN = "Pakan", "Pakan"
        KANDANG = "Kandang & Peralatan", "Kandang & Peralatan"
        KESEHATAN = "Kesehatan", "Kesehatan"
        OPERASIONAL = "Operasional", "Operasional"
        LAINNYA = "Lainnya", "Lainnya"

    ledger_id = models.AutoField(primary_key=True)
    order = models.ForeignKey(
        Order, on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="ledger_entries", verbose_name="Order Terkait",
        help_text="Kosongkan untuk pengeluaran bebas.",
    )
    tanggal_transaksi = models.DateField("Tanggal Transaksi")
    tipe_arus = models.CharField(
        "Tipe Arus", max_length=10, choices=TipeArus.choices,
    )
    kategori_dana = models.CharField(
        "Kategori", max_length=30, choices=KategoriDana.choices,
    )
    nominal = models.DecimalField(
        "Nominal (Rp)", max_digits=15, decimal_places=0,
        validators=[MinValueValidator(0)],
    )
    keterangan = models.TextField("Keterangan", blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "ledger"
        verbose_name = "Buku Kas"
        verbose_name_plural = "Buku Kas"
        ordering = ["-tanggal_transaksi", "-created_at"]

    def __str__(self):
        arrow = "⬆️" if self.tipe_arus == self.TipeArus.MASUK else "⬇️"
        return f"{arrow} Rp{self.nominal:,.0f} — {self.kategori_dana} ({self.tanggal_transaksi})"
