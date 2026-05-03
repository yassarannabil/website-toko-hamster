"""
Noska Hamster — DRF Serializers
================================
Serializer untuk endpoint publik katalog: Box list + Inventory per box.
"""

from rest_framework import serializers
from .models import Box, LiveInventory


class BoxSerializer(serializers.ModelSerializer):
    """Box card untuk halaman katalog grid."""

    jumlah_tersedia = serializers.SerializerMethodField()
    jumlah_total = serializers.SerializerMethodField()

    class Meta:
        model = Box
        fields = [
            "box_id",
            "nama_box",
            "kategori",
            "urutan",
            "jumlah_tersedia",
            "jumlah_total",
        ]

    def get_jumlah_tersedia(self, obj) -> int:
        return obj.items.filter(status_ketersediaan="Tersedia").count()

    def get_jumlah_total(self, obj) -> int:
        return obj.items.count()


class LiveInventorySerializer(serializers.ModelSerializer):
    """
    Serializer yang meng-flatten data dari MasterVariant (FK)
    sehingga frontend menerima JSON datar tanpa nested object.
    """

    # Flatten dari relasi variant → MasterVariant
    spesies = serializers.CharField(source="variant.spesies", read_only=True)
    varian_warna = serializers.CharField(source="variant.varian_warna", read_only=True)
    jenis_bulu = serializers.CharField(source="variant.jenis_bulu", read_only=True)
    is_satin = serializers.BooleanField(source="variant.is_satin", read_only=True)

    # Gabungan untuk display: "Syrian Golden Long Hair Satin"
    varian = serializers.SerializerMethodField()

    # Full absolute URL untuk media files
    foto_preview = serializers.SerializerMethodField()
    video_file = serializers.SerializerMethodField()

    # Box info
    box_id = serializers.IntegerField(source="box.box_id", read_only=True)
    box_nama = serializers.CharField(source="box.nama_box", read_only=True)

    class Meta:
        model = LiveInventory
        fields = [
            "inventory_id",
            "kode_hamster",
            "varian",
            "spesies",
            "varian_warna",
            "jenis_bulu",
            "is_satin",
            "box_id",
            "box_nama",
            "jenis_kelamin",
            "usia_bulan",
            "grade_corak",
            "kondisi_fisik",
            "foto_preview",
            "video_file",
            "harga_display",
            "status_ketersediaan",
        ]

    # Singkatan jenis bulu
    BULU_ABBR = {
        "Short Hair": "SH",
        "Medium Hair": "MH",
        "Long Hair": "LH",
        "Rex": "Rex",
    }

    def get_varian(self, obj) -> str:
        """Format: Syrian - Golden Satin LH"""
        parts = [obj.variant.varian_warna]
        if obj.variant.is_satin:
            parts.append("Satin")
        bulu = self.BULU_ABBR.get(obj.variant.jenis_bulu, obj.variant.jenis_bulu)
        if bulu:
            parts.append(bulu)
        return f"{obj.variant.spesies} - {' '.join(parts)}"

    def get_foto_preview(self, obj) -> str | None:
        """Return absolute URL for the uploaded photo."""
        if obj.foto_preview:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(obj.foto_preview.url)
            return obj.foto_preview.url
        return None

    def get_video_file(self, obj) -> str | None:
        """Return absolute URL for the uploaded video."""
        if obj.video_file:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(obj.video_file.url)
            return obj.video_file.url
        return None
