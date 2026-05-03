"""
Noska Hamster — Admin Configuration
=====================================
Dashboard data entry lengkap dengan list_display & list_filter yang kaya.
"""

from django.contrib import admin
from django.utils.html import format_html
from .models import (
    Customer, Address, MasterVariant, SetupSession, Box, LiveInventory,
    MasterCourier, Order, OrderDetail, Shipment, Ledger,
)


# ══════════════════════════════════════════════
# Inlines
# ══════════════════════════════════════════════

class AddressInline(admin.TabularInline):
    model = Address
    extra = 0
    fields = ["label_alamat", "nama_penerima", "nomor_wa_penerima",
              "kota_kabupaten", "provinsi", "is_default"]


class OrderDetailInline(admin.TabularInline):
    model = OrderDetail
    extra = 1
    fields = ["inventory", "variant", "qty", "harga_satuan_deal", "subtotal", "catatan_khusus"]
    readonly_fields = ["subtotal"]
    autocomplete_fields = ["inventory", "variant"]


class ShipmentInline(admin.StackedInline):
    model = Shipment
    extra = 0
    fields = [
        ("courier", "nomor_resi"),
        ("tanggal_kirim", "estimasi_hari", "tanggal_diterima"),
        ("status_kirim", "kondisi_hamster"),
        "catatan_pengiriman",
    ]
    autocomplete_fields = ["courier"]


class BoxInline(admin.TabularInline):
    model = Box
    extra = 1
    fields = ["nama_box", "kategori", "urutan"]


class LiveInventoryInline(admin.TabularInline):
    model = LiveInventory
    extra = 0
    fields = ["kode_hamster", "variant", "jenis_kelamin", "usia_bulan",
              "grade_corak", "harga_display", "status_ketersediaan"]
    readonly_fields = ["kode_hamster"]
    autocomplete_fields = ["variant"]


# ══════════════════════════════════════════════
# Model Admins
# ══════════════════════════════════════════════

@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ["customer_id", "nama_customer", "nomor_wa", "jumlah_order", "created_at"]
    search_fields = ["nama_customer", "nomor_wa"]
    list_filter = ["created_at"]
    inlines = [AddressInline]
    ordering = ["-created_at"]

    @admin.display(description="Jumlah Order")
    def jumlah_order(self, obj):
        return obj.orders.count()


@admin.register(Address)
class AddressAdmin(admin.ModelAdmin):
    list_display = ["address_id", "customer", "label_alamat", "nama_penerima",
                     "kota_kabupaten", "provinsi", "is_default"]
    list_filter = ["provinsi", "kota_kabupaten", "is_default"]
    search_fields = ["nama_penerima", "detail_alamat", "customer__nama_customer"]
    autocomplete_fields = ["customer"]


@admin.register(MasterVariant)
class MasterVariantAdmin(admin.ModelAdmin):
    list_display = ["variant_id", "spesies", "varian_warna", "jenis_bulu", "is_satin"]
    list_filter = ["spesies", "jenis_bulu", "is_satin"]
    search_fields = ["spesies", "varian_warna", "jenis_bulu"]
    ordering = ["spesies", "varian_warna"]


# ──────────────────────────────────────────────
# Setup Session + Box + Clean Clone
# ──────────────────────────────────────────────

@admin.register(SetupSession)
class SetupSessionAdmin(admin.ModelAdmin):
    list_display = ["session_id", "nama_sesi", "is_active_badge", "jumlah_box", "created_at"]
    list_filter = ["is_active"]
    search_fields = ["nama_sesi"]
    inlines = [BoxInline]
    actions = ["clone_session"]

    @admin.display(description="Status", ordering="is_active")
    def is_active_badge(self, obj):
        if obj.is_active:
            return format_html(
                '<span style="background:#22c55e;color:#fff;padding:3px 10px;'
                'border-radius:12px;font-size:11px;font-weight:600;">{}</span>',
                "✅ AKTIF",
            )
        return format_html(
            '<span style="background:#9ca3af;color:#fff;padding:3px 10px;'
            'border-radius:12px;font-size:11px;font-weight:600;">{}</span>',
            "📁 Arsip",
        )

    @admin.display(description="Jumlah Box")
    def jumlah_box(self, obj):
        return obj.boxes.count()

    @admin.action(description="🔄 Duplikasi Sesi (Clean Clone — tanpa item Terjual)")
    def clone_session(self, request, queryset):
        for session in queryset:
            # 1. Clone session
            new_session = SetupSession.objects.create(
                nama_sesi=f"[CLONE] {session.nama_sesi}",
                is_active=False,
            )
            # 2. Clone boxes + inventories yang masih Tersedia/Hold
            for box in session.boxes.all():
                new_box = Box.objects.create(
                    session=new_session,
                    nama_box=box.nama_box,
                    kategori=box.kategori,
                    urutan=box.urutan,
                )
                for item in box.items.exclude(status_ketersediaan="Terjual"):
                    LiveInventory.objects.create(
                        box=new_box,
                        variant=item.variant,
                        jenis_kelamin=item.jenis_kelamin,
                        usia_bulan=item.usia_bulan,
                        grade_corak=item.grade_corak,
                        kondisi_fisik=item.kondisi_fisik,
                        foto_preview=item.foto_preview,
                        video_file=item.video_file,
                        harga_display=item.harga_display,
                        status_ketersediaan="Tersedia",
                    )
            self.message_user(
                request,
                f'✅ Sesi "{session.nama_sesi}" berhasil diduplikasi → "{new_session.nama_sesi}"',
            )


@admin.register(Box)
class BoxAdmin(admin.ModelAdmin):
    list_display = ["box_id", "nama_box", "kategori", "urutan", "session", "jumlah_item"]
    list_editable = ["urutan"]
    list_filter = ["session"]
    search_fields = ["nama_box", "kategori"]
    inlines = [LiveInventoryInline]

    @admin.display(description="Jumlah Item")
    def jumlah_item(self, obj):
        return obj.items.count()


# ──────────────────────────────────────────────
# Live Inventory
# ──────────────────────────────────────────────

@admin.register(LiveInventory)
class LiveInventoryAdmin(admin.ModelAdmin):
    list_display = [
        "inventory_id", "kode_hamster", "variant", "box",
        "jenis_kelamin", "usia_bulan", "grade_corak",
        "harga_display_formatted", "status_ketersediaan",
    ]
    list_filter = [
        "status_ketersediaan", "jenis_kelamin",
        "variant__spesies", "variant__varian_warna", "grade_corak",
        "box__session",
    ]
    search_fields = ["kode_hamster", "variant__spesies", "variant__varian_warna"]
    autocomplete_fields = ["variant", "box"]
    list_editable = ["status_ketersediaan"]
    list_per_page = 25
    readonly_fields = ["kode_hamster", "preview_foto"]
    fieldsets = [
        ("🐹 Identitas", {
            "fields": ["kode_hamster", "box", "variant"],
        }),
        ("📋 Detail Individu", {
            "fields": ["jenis_kelamin", "usia_bulan", "grade_corak", "kondisi_fisik"],
        }),
        ("📸 Media", {
            "fields": ["foto_preview", "video_file", "preview_foto"],
        }),
        ("💰 Harga & Status", {
            "fields": ["harga_display", "status_ketersediaan"],
        }),
    ]


    @admin.display(description="Harga Display")
    def harga_display_formatted(self, obj):
        return f"Rp{obj.harga_display:,.0f}"

    @admin.display(description="Status")
    def status_badge(self, obj):
        colors = {
            "Tersedia": "#22c55e",
            "Terjual": "#ef4444",
            "Hold": "#f59e0b",
        }
        color = colors.get(obj.status_ketersediaan, "#6b7280")
        return format_html(
            '<span style="background:{};color:#fff;padding:3px 10px;'
            'border-radius:12px;font-size:11px;font-weight:600;">{}</span>',
            color, obj.status_ketersediaan,
        )

    @admin.display(description="Preview Foto")
    def preview_foto(self, obj):
        if obj.foto_preview:
            return format_html('<img src="{}" style="max-height:200px;border-radius:8px;" />', obj.foto_preview.url)
        return "—"


@admin.register(MasterCourier)
class MasterCourierAdmin(admin.ModelAdmin):
    list_display = ["courier_id", "nama_kurir", "jenis_layanan", "is_active"]
    list_filter = ["is_active", "nama_kurir"]
    search_fields = ["nama_kurir", "jenis_layanan"]


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = [
        "nomor_invoice", "customer", "jenis_penjualan",
        "total_order_formatted", "status_badge", "tanggal_order",
    ]
    list_filter = ["jenis_penjualan", "status_order", "tanggal_order"]
    search_fields = ["nomor_invoice", "customer__nama_customer", "customer__nomor_wa"]
    autocomplete_fields = ["customer", "address"]
    readonly_fields = ["nomor_invoice", "tanggal_order", "total_order"]
    date_hierarchy = "tanggal_order"
    list_per_page = 25
    inlines = [OrderDetailInline, ShipmentInline]
    fieldsets = [
        ("🧾 Info Order", {
            "fields": ["nomor_invoice", "customer", "address", "jenis_penjualan"],
        }),
        ("📊 Status & Total", {
            "fields": ["status_order", "total_order", "catatan_order"],
        }),
    ]

    @admin.display(description="Total")
    def total_order_formatted(self, obj):
        return f"Rp{obj.total_order:,.0f}"

    @admin.display(description="Status")
    def status_badge(self, obj):
        colors = {
            "Pending": "#f59e0b",
            "Confirmed": "#3b82f6",
            "Packing": "#8b5cf6",
            "Shipped": "#06b6d4",
            "Delivered": "#22c55e",
            "Cancelled": "#ef4444",
        }
        color = colors.get(obj.status_order, "#6b7280")
        return format_html(
            '<span style="background:{};color:#fff;padding:3px 10px;'
            'border-radius:12px;font-size:11px;font-weight:600;">{}</span>',
            color, obj.status_order,
        )


@admin.register(OrderDetail)
class OrderDetailAdmin(admin.ModelAdmin):
    list_display = ["order_detail_id", "order", "inventory", "variant",
                     "qty", "harga_satuan_formatted", "subtotal_formatted"]
    list_filter = ["order__jenis_penjualan"]
    search_fields = ["order__nomor_invoice"]
    autocomplete_fields = ["order", "inventory", "variant"]
    readonly_fields = ["subtotal"]

    @admin.display(description="Harga Satuan")
    def harga_satuan_formatted(self, obj):
        return f"Rp{obj.harga_satuan_deal:,.0f}"

    @admin.display(description="Subtotal")
    def subtotal_formatted(self, obj):
        return f"Rp{obj.subtotal:,.0f}"


@admin.register(Shipment)
class ShipmentAdmin(admin.ModelAdmin):
    list_display = ["shipment_id", "order", "courier", "nomor_resi",
                     "tanggal_kirim", "status_kirim", "kondisi_hamster"]
    list_filter = ["status_kirim", "kondisi_hamster", "courier", "tanggal_kirim"]
    search_fields = ["order__nomor_invoice", "nomor_resi"]
    autocomplete_fields = ["order", "courier"]
    date_hierarchy = "tanggal_kirim"


@admin.register(Ledger)
class LedgerAdmin(admin.ModelAdmin):
    list_display = [
        "ledger_id", "tanggal_transaksi", "tipe_arus_badge",
        "kategori_dana", "nominal_formatted", "order", "keterangan_short",
    ]
    list_filter = ["tipe_arus", "kategori_dana", "tanggal_transaksi"]
    search_fields = ["keterangan", "order__nomor_invoice"]
    autocomplete_fields = ["order"]
    date_hierarchy = "tanggal_transaksi"
    list_per_page = 30

    @admin.display(description="Tipe Arus")
    def tipe_arus_badge(self, obj):
        if obj.tipe_arus == "Masuk":
            return format_html(
                '<span style="color:#22c55e;font-weight:700;">{}</span>',
                "⬆️ Masuk",
            )
        return format_html(
            '<span style="color:#ef4444;font-weight:700;">{}</span>',
            "⬇️ Keluar",
        )

    @admin.display(description="Nominal")
    def nominal_formatted(self, obj):
        color = "#22c55e" if obj.tipe_arus == "Masuk" else "#ef4444"
        return format_html(
            '<span style="color:{};font-weight:600;">Rp{}</span>',
            color, f"{obj.nominal:,.0f}",
        )

    @admin.display(description="Keterangan")
    def keterangan_short(self, obj):
        if len(obj.keterangan) > 50:
            return obj.keterangan[:50] + "…"
        return obj.keterangan


# ══════════════════════════════════════════════
# Admin Site Customization
# ══════════════════════════════════════════════
admin.site.site_header = "🐹 Noska Hamster — Admin Panel"
admin.site.site_title = "Noska Hamster"
admin.site.index_title = "Dashboard Manajemen Operasional"
