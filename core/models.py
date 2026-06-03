"""
Noska Hamster — E-Commerce & Operational Management Models
===========================================================
9 entitas ternormalisasi (3NF) dengan integritas relasional ketat.
Semua FK menggunakan PROTECT / SET_NULL agar data historis nota tidak hilang.
"""

import uuid
import os
from decimal import Decimal
from django.db import models
from django.core.validators import MinValueValidator
from django.core.files.storage import default_storage
from django.db.models.signals import pre_delete
from django.dispatch import receiver

def get_video_storage():
    if os.environ.get("CLOUDINARY_URL"):
        from cloudinary_storage.storage import VideoMediaCloudinaryStorage
        return VideoMediaCloudinaryStorage()
    return default_storage


from django.contrib.auth.models import User

# ──────────────────────────────────────────────
# 1. Customers
# ──────────────────────────────────────────────
class Customer(models.Model):
    customer_id = models.AutoField(primary_key=True)
    user = models.OneToOneField(
        User, on_delete=models.CASCADE, related_name="customer_profile", null=True, blank=True,
        help_text="Terhubung ke akun login (bisa kosong untuk pelanggan legacy)"
    )
    nama_customer = models.CharField("Nama Customer", max_length=150, blank=True, null=True)
    nomor_wa = models.CharField("Nomor WhatsApp", max_length=20, unique=True, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "customers"
        verbose_name = "Customer"
        verbose_name_plural = "Customers"
        ordering = ["-created_at"]

    def __str__(self):
        nama = self.nama_customer if self.nama_customer else "Tanpa Nama"
        if self.user:
            return f"{nama} ({self.user.email})"
        return f"{nama} ({self.nomor_wa})"


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
    kelurahan_desa = models.CharField("Kelurahan / Desa", max_length=100, blank=True)
    kota_kabupaten = models.CharField("Kota / Kabupaten", max_length=100)
    provinsi = models.CharField("Provinsi", max_length=100)
    kode_pos = models.CharField("Kode Pos", max_length=10, blank=True)
    destination_id = models.CharField("Destination ID (Ongkir)", max_length=20, blank=True, help_text="ID Kelurahan dari RajaOngkir untuk kalkulasi ongkir")
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
        PERLENGKAPAN = "Perlengkapan", "Perlengkapan"

    class JenisBulu(models.TextChoices):
        SHORT_HAIR = "Short Hair", "Short Hair"
        MEDIUM_HAIR = "Medium Hair", "Medium Hair"
        LONG_HAIR = "Long Hair", "Long Hair"
        REX = "Rex", "Rex"
        TIDAK_ADA = "Tidak Ada", "Tidak Ada (Aksesoris)"

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
    class SpesiesChoices(models.TextChoices):
        SYRIAN = "Syrian", "Syrian"
        CAMPBELL = "Campbell", "Campbell"
        WINTER_WHITE = "Winter White", "Winter White"
        ROBOROVSKI = "Roborovski", "Roborovski"
        MIX = "Mix", "Mix"
        PERLENGKAPAN = "Perlengkapan", "Perlengkapan"

    class KategoriBoxChoices(models.TextChoices):
        SIAPAN = "Siapan", "Siapan"
        ANAKAN = "Anakan", "Anakan"
        INDUKAN = "Indukan", "Indukan"
        MIX = "Mix", "Mix"

    class JenisKelaminBoxChoices(models.TextChoices):
        JANTAN = "Jantan", "Jantan"
        BETINA = "Betina", "Betina"
        MIX = "Mix", "Mix"

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
        "Kategori (Legacy)", max_length=150, blank=True,
        help_text="Field lama. Akan diabaikan jika field Spesies & Kategori baru diisi.",
    )
    spesies = models.CharField(
        "Spesies", max_length=50, blank=True, null=True,
        choices=SpesiesChoices.choices,
    )
    kategori_box = models.CharField(
        "Kategori Box", max_length=50, blank=True, null=True,
        choices=KategoriBoxChoices.choices,
    )
    jenis_kelamin_box = models.CharField(
        "Jenis Kelamin", max_length=50, blank=True, null=True,
        choices=JenisKelaminBoxChoices.choices,
    )
    urutan = models.PositiveIntegerField("Urutan Tampil", default=0)

    class Meta:
        db_table = "boxes"
        verbose_name = "Box"
        verbose_name_plural = "Boxes"
        ordering = ["urutan", "nama_box"]
        unique_together = ["session", "nama_box"]

    def __str__(self):
        parts = []
        if self.spesies:
            parts.append(self.spesies)
        
        if self.kategori_box == "Mix" and self.jenis_kelamin_box == "Mix":
            parts.append("Mix")
        else:
            cat_parts = []
            if self.kategori_box:
                cat_parts.append(self.kategori_box)
            if self.jenis_kelamin_box:
                cat_parts.append(self.jenis_kelamin_box)
            if cat_parts:
                parts.append(" ".join(cat_parts))
        
        structured_info = " — ".join(parts)
        
        if structured_info:
            return f"{self.nama_box} — {structured_info}"
        
        return f"{self.nama_box} — {self.kategori}" if self.kategori else self.nama_box


# ──────────────────────────────────────────────
# 6. Live Inventory (Katalog Sesi Live)
# ──────────────────────────────────────────────
class LiveInventory(models.Model):
    class StatusKetersediaan(models.TextChoices):
        TERSEDIA = "Tersedia", "Tersedia"
        TERJUAL = "Terjual", "Terjual"
        HOLD = "Hold", "Hold"
        DISEMBUNYIKAN = "Disembunyikan", "Disembunyikan"

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
        choices=USIA_CHOICES, null=True, blank=True
    )
    grade_corak = models.CharField(
        "Grade Corak", max_length=5,
        choices=GradeCorak.choices, null=True, blank=True
    )
    kondisi_fisik = models.TextField("Kondisi Fisik", blank=True,
                                     help_text="Catatan kondisi: sehat, cacat ringan, dll.")
    foto_preview = models.ImageField(
        "Foto Preview", upload_to="inventory/foto/", blank=True, null=True,
    )
    video_file = models.FileField(
        "Video Hamster", upload_to="inventory/video/", blank=True, null=True,
        storage=get_video_storage,
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
            # Find max sequence by parsing integers safely in Python
            # because alphabetical order_by("-kode_hamster") thinks "HAM-A-9" > "HAM-A-10"
            existing_codes = LiveInventory.objects.filter(kode_hamster__startswith=prefix).values_list('kode_hamster', flat=True)
            max_seq = 0
            for code in existing_codes:
                if code:
                    try:
                        num = int(code.rsplit("-", 1)[-1])
                        if num > max_seq:
                            max_seq = num
                    except (ValueError, IndexError):
                        pass
            seq = max_seq + 1
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
    nama_kurir = models.CharField("Nama Kurir/Ekspedisi", max_length=100, help_text="Contoh: TIKI, KIB, Karyati, dll")
    jenis_layanan = models.CharField("Jenis Layanan", max_length=100, blank=True, help_text="Contoh: ONS, REG, VIP, dll")
    estimasi_default_hari = models.PositiveIntegerField("Estimasi Default (Hari)", null=True, blank=True, help_text="Otomatis terisi saat kalkulator invoice. Contoh: 1")
    is_active = models.BooleanField("Aktif", default=True)

    class Meta:
        db_table = "master_couriers"
        verbose_name = "Kurir"
        verbose_name_plural = "Kurir"
        unique_together = ["nama_kurir", "jenis_layanan"]

    def __str__(self):
        return f"{self.nama_kurir} — {self.jenis_layanan}"




# ──────────────────────────────────────────────
# 10. Transaction (Rekapan Penjualan Auto-Parse)
# ──────────────────────────────────────────────
class Transaction(models.Model):
    transaction_id = models.AutoField(primary_key=True)
    customer = models.ForeignKey(
        Customer, on_delete=models.CASCADE, related_name="transactions", verbose_name="Customer",
        null=True, blank=True # Nullable for auto-parsing
    )
    
    # Hasil parsing rekapan
    PAYMENT_STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('BELUM LUNAS', 'Belum Lunas'),
        ('DP', 'DP'),
        ('LUNAS', 'Lunas'),
        ('CANCELLED', 'Dibatalkan'),
        ('DIKIRIM', 'Dikirim'),
        ('SAMPAI', 'Sampai (Selesai)'),
        ('GARANSI', 'Garansi (Ada Masalah)'),
        ('REFUNDED', 'Refunded'),
    ]
    status_pembayaran = models.CharField("Status Bayar", max_length=50, choices=PAYMENT_STATUS_CHOICES, default='PENDING')
    metode_pembayaran = models.CharField("Metode Pembayaran", max_length=50, blank=True)
    sudah_video_packing = models.BooleanField("Sudah Video Packing", default=False)
    biaya_packing = models.PositiveIntegerField("Biaya Packing", default=0)
    biaya_ongkir = models.PositiveIntegerField("Biaya Ongkir", default=0)
    total_bayar = models.PositiveIntegerField("Total Bayar (Hamster + Packing + Ongkir)", default=0)
    nominal_dp = models.PositiveIntegerField("Nominal DP", default=0)
    nominal_refund = models.PositiveIntegerField("Nominal Refund (Garansi)", default=0)
    nomor_resi = models.CharField("Nomor Resi", max_length=100, blank=True)
    keterangan_kurir = models.CharField("Pengiriman", max_length=200, blank=True)
    
    # Relasi Hamster
    hamsters = models.ManyToManyField("LiveInventory", related_name="transaksi", blank=True, verbose_name="Hamster")
    
    # Teks asli
    raw_rekapan = models.TextField("Teks Rekapan Asli", blank=True)
    
    # Form Alamat
    alamat = models.ForeignKey(
        Address, on_delete=models.SET_NULL, null=True, blank=True, related_name="transaksi", verbose_name="Alamat Pengiriman"
    )
    token_alamat = models.UUIDField("Token Alamat", default=uuid.uuid4, editable=False, unique=True)
    alamat_lengkap = models.BooleanField("Alamat Sudah Lengkap?", default=False)
    tanggal_kirim = models.DateField("Tanggal Kirim", null=True, blank=True)
    hamsters_mati = models.TextField("Hamster Bermasalah", blank=True, null=True)
    alasan_batal = models.TextField("Alasan Pembatalan", blank=True, null=True)
    
    # DOKU Payment Gateway
    payment_url = models.URLField("DOKU Payment URL", max_length=500, blank=True)
    doku_token = models.CharField("DOKU Token", max_length=255, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "transactions"
        verbose_name = "Transaksi"
        verbose_name_plural = "Transaksi"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Trx #{self.transaction_id} — {self.customer.nomor_wa if self.customer else 'No Customer'}"

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        hamsters_to_link = []
        
        # Auto-parse ONLY if it's a new record
        if self.raw_rekapan and is_new:
            lines = [line.strip() for line in self.raw_rekapan.strip().split('\n') if line.strip()]
            
            if len(lines) >= 1:
                # Parse WA (Line 1)
                import re
                wa_raw = lines[0]
                wa_clean = re.sub(r'[^\d+]', '', wa_raw)
                # Create or get customer
                customer, _ = Customer.objects.get_or_create(nomor_wa=wa_clean)
                self.customer = customer
            
            if len(lines) >= 2:
                # Parse Payment (Line 2) e.g., "LUNAS (QRIS) = 83k"
                pay_line = lines[1].upper()
                if "BELUM LUNAS" in pay_line:
                    self.status_pembayaran = "BELUM LUNAS"
                elif "LUNAS" in pay_line:
                    self.status_pembayaran = "LUNAS"
                else:
                    self.status_pembayaran = "DP" # default
                
                # Metode
                if "(QRIS)" in pay_line:
                    self.metode_pembayaran = "QRIS"
                elif "(BCA)" in pay_line:
                    self.metode_pembayaran = "BCA"
                elif "(MANDIRI)" in pay_line:
                    self.metode_pembayaran = "MANDIRI"
                    
                # Total Bayar (Find first number before 'k' or after '=')
                import re
                match = re.search(r'=\s*(\d+)k?', pay_line, re.IGNORECASE)
                if match:
                    val = int(match.group(1))
                    if 'k' in pay_line.lower() and val < 10000:
                        val *= 1000
                    self.total_bayar = val

            if len(lines) >= 3 and is_new:
                # Parse Hamsters (Line 3) e.g., "HAM-C-5, HAM-D-5"
                import re
                codes = re.findall(r'HAM-[A-Z0-9]+-\d+', lines[2], re.IGNORECASE)
                if codes:
                    # Find hamsters
                    from .models import LiveInventory
                    for code in codes:
                        h = LiveInventory.objects.filter(kode_hamster__iexact=code).first()
                        if h:
                            if h.box.spesies != Box.SpesiesChoices.PERLENGKAPAN and h.box.nama_box.lower() != 'aksesoris':
                                h.status_ketersediaan = LiveInventory.StatusKetersediaan.TERJUAL
                                h.save()
                            hamsters_to_link.append(h)
                            
            if len(lines) >= 4:
                # Parse Courier (Line 4)
                self.keterangan_kurir = lines[3]

        super().save(*args, **kwargs)
        
        if hamsters_to_link:
            self.hamsters.add(*hamsters_to_link)

# ──────────────────────────────────────────────
# 11. E-Commerce (Cart)
# ──────────────────────────────────────────────
class Cart(models.Model):
    customer = models.OneToOneField(Customer, on_delete=models.CASCADE, related_name="cart")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "carts"
        verbose_name = "Keranjang"
        verbose_name_plural = "Keranjang"

class CartItem(models.Model):
    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name="items")
    inventory = models.ForeignKey(LiveInventory, on_delete=models.CASCADE)
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "cart_items"
        verbose_name = "Item Keranjang"
        verbose_name_plural = "Item Keranjang"
        unique_together = ["cart", "inventory"]


# ──────────────────────────────────────────────
# 12. Internal Chat System
# ──────────────────────────────────────────────
class ChatRoom(models.Model):
    customer = models.OneToOneField(Customer, on_delete=models.CASCADE, related_name="chat_room")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "chat_rooms"
        verbose_name = "Ruang Chat"
        verbose_name_plural = "Ruang Chat"

class ChatMessage(models.Model):
    room = models.ForeignKey(ChatRoom, on_delete=models.CASCADE, related_name="messages")
    sender_is_admin = models.BooleanField("Kirim dari Admin?", default=False)
    message = models.TextField("Pesan")
    related_inventory = models.ForeignKey(
        "LiveInventory", 
        on_delete=models.SET_NULL, 
        null=True, blank=True, 
        related_name="chat_mentions",
        verbose_name="Terkait Produk"
    )
    is_read = models.BooleanField("Sudah Dibaca?", default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "chat_messages"
        verbose_name = "Pesan Chat"
        verbose_name_plural = "Pesan Chat"
        ordering = ["created_at"]

