"""
Noska Hamster — Admin Configuration
=====================================
Dashboard data entry lengkap dengan list_display & list_filter yang kaya.
"""

from django.contrib import admin
from django.utils.html import format_html, mark_safe
from django.urls import path
from django.shortcuts import render, redirect
from django.contrib import messages
from .models import (
    Customer, Address, MasterVariant, SetupSession, Box, LiveInventory,
    MasterCourier, Transaction
)


# ══════════════════════════════════════════════
# Inlines
# ══════════════════════════════════════════════

class AddressInline(admin.TabularInline):
    model = Address
    extra = 0
    fields = ["label_alamat", "nama_penerima", "nomor_wa_penerima",
              "kota_kabupaten", "provinsi", "is_default"]



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
    autocomplete_fields = ["variant"]
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

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if db_field.name == "box":
            # Hanya tampilkan Box yang sesinya sedang Aktif
            kwargs["queryset"] = Box.objects.filter(session__is_active=True).order_by('urutan')
        return super().formfield_for_foreignkey(db_field, request, **kwargs)

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





# ══════════════════════════════════════════════
# Transaction (Auto-Parse)
# ══════════════════════════════════════════════
@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ["transaction_id", "customer_wa", "status_pembayaran", "total_bayar_formatted", "tanggal_kirim", "alamat_status", "created_at", "link_form_alamat"]
    list_editable = ["tanggal_kirim"]
    list_filter = ["status_pembayaran", "alamat_lengkap"]
    search_fields = ["customer__nomor_wa", "raw_rekapan"]
    readonly_fields = ["transaction_id", "customer", "metode_pembayaran", "total_bayar", "keterangan_kurir", "hamsters", "alamat", "token_alamat", "alamat_lengkap", "created_at"]
    filter_horizontal = ["hamsters"]
    
    fieldsets = [
        ("Input Cepat (Paste Rekapan WA)", {
            "fields": ["raw_rekapan"],
            "description": "Paste 4 baris rekapan WA di sini. Sistem akan otomatis mengisi data lainnya saat Anda klik Save.",
        }),
        ("Detail Transaksi", {
            "fields": ["transaction_id", "customer", "status_pembayaran", "nomor_resi", "metode_pembayaran", "total_bayar", "keterangan_kurir", "hamsters"],
            "classes": ["collapse"],
        }),
        ("Status Alamat", {
            "fields": ["alamat_lengkap", "alamat", "token_alamat"],
        })
    ]
    
    @admin.display(description="No. WA")
    def customer_wa(self, obj):
        return obj.customer.nomor_wa if obj.customer else "-"
        
    @admin.display(description="Total")
    def total_bayar_formatted(self, obj):
        return f"Rp{obj.total_bayar:,.0f}"

    @admin.display(description="Alamat")
    def alamat_status(self, obj):
        if obj.alamat_lengkap:
            return mark_safe('<span style="color:#22c55e;font-weight:bold;">✅ Lengkap</span>')
        return mark_safe('<span style="color:#ef4444;font-weight:bold;">⏳ Belum Diisi</span>')

    @admin.display(description="Link Pengisian")
    def link_form_alamat(self, obj):
        link = f"https://noska-hamster.shop/isi-alamat/{obj.token_alamat}"
        return format_html('<input type="text" value="{}" readonly style="width:200px; padding:4px;" onclick="this.select(); document.execCommand(\\\'copy\\\'); alert(\\\'Link Copied!\\\');" />', link)

    def get_readonly_fields(self, request, obj=None):
        if obj: # editing an existing object
            return self.readonly_fields + ["raw_rekapan"]
        return self.readonly_fields

    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path('buat-invoice/', self.admin_site.admin_view(self.invoice_generator_view), name='core_transaction_buat_invoice'),
        ]
        return custom_urls + urls

    def invoice_generator_view(self, request):
        if request.method == "POST":
            # Handle submission
            nomor_wa = request.POST.get("nomor_wa")
            qty_packing = int(request.POST.get("qty_packing", 0))
            biaya_packing = qty_packing * 10000
            
            biaya_ongkir = int(request.POST.get("biaya_ongkir", 0))
            
            kurir_id = request.POST.get("kurir_id")
            estimasi_hari = request.POST.get("estimasi_hari", "").strip()
            
            keterangan_kurir = ""
            if kurir_id:
                kurir = MasterCourier.objects.get(pk=kurir_id)
                keterangan_kurir = f"{kurir.nama_kurir} {kurir.jenis_layanan}"
                if estimasi_hari:
                    keterangan_kurir += f" (est. {estimasi_hari} hari)"
            
            hamster_ids = request.POST.getlist("hamsters")
            
            # Clean WA
            import re
            wa_clean = re.sub(r'[^\d+]', '', nomor_wa)
            customer, _ = Customer.objects.get_or_create(nomor_wa=wa_clean)
            
            # Get Hamsters and calculate total
            hamsters = LiveInventory.objects.filter(inventory_id__in=hamster_ids)
            total_hamster = sum([h.harga_display for h in hamsters])
            total_bayar = total_hamster + biaya_packing + biaya_ongkir
            
            # Create Transaction
            trx = Transaction.objects.create(
                customer=customer,
                status_pembayaran="PENDING",
                biaya_packing=biaya_packing,
                biaya_ongkir=biaya_ongkir,
                total_bayar=total_bayar,
                keterangan_kurir=keterangan_kurir
            )
            
            # Link Hamsters
            for h in hamsters:
                h.status_ketersediaan = LiveInventory.StatusKetersediaan.HOLD
                h.save()
            trx.hamsters.set(hamsters)
            
            messages.success(request, f"Invoice WA berhasil dibuat untuk {wa_clean} dengan total Rp{total_bayar:,}. Menunggu Pembayaran.")
            return redirect('admin:core_transaction_changelist')
            
        # Get active inventory to select
        inventory = LiveInventory.objects.filter(status_ketersediaan="Tersedia").select_related("variant")
        couriers = MasterCourier.objects.filter(is_active=True)
        
        context = {
            **self.admin_site.each_context(request),
            'opts': self.model._meta,
            'title': 'Buat Invoice WA (Kalkulator)',
            'inventory': inventory,
            'couriers': couriers
        }
        return render(request, "admin/invoice_generator.html", context)

# ══════════════════════════════════════════════
# Admin Site Customization
# ══════════════════════════════════════════════
admin.site.site_header = "🐹 Noska Hamster — Admin Panel"
admin.site.site_title = "Noska Hamster"
admin.site.index_title = "Dashboard Manajemen Operasional"
