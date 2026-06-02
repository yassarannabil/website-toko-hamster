"""
Noska Hamster — API Views
==========================
Public read-only endpoints: Box list (active session) & Inventory per box.
"""

from django.db.models import Case, When, Value, IntegerField
from rest_framework.generics import ListAPIView

from django.shortcuts import get_object_or_404
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from .models import Box, LiveInventory, SetupSession, Transaction, Address
from .serializers import BoxSerializer, LiveInventorySerializer


class BoxListView(ListAPIView):
    """
    GET /api/boxes/

    Menampilkan daftar Box dari session yang sedang AKTIF.
    Urutan berdasarkan field `urutan` (manual sort).
    """

    serializer_class = BoxSerializer

    def get_queryset(self):
        return (
            Box.objects
            .filter(session__is_active=True)
            .prefetch_related("items")
            .order_by("urutan", "nama_box")
        )


class BoxDetailView(ListAPIView):
    """
    GET /api/boxes/<box_id>/items/

    Menampilkan daftar hamster di dalam satu Box.
    Urutan: TERSEDIA → HOLD → TERJUAL.
    """

    serializer_class = LiveInventorySerializer

    def get_queryset(self):
        box_id = self.kwargs["box_id"]
        return (
            LiveInventory.objects
            .filter(box_id=box_id)
            .exclude(status_ketersediaan="Disembunyikan")
            .select_related("variant", "box")
            .annotate(
                status_order=Case(
                    When(status_ketersediaan="Tersedia", then=Value(0)),
                    When(status_ketersediaan="Hold", then=Value(1)),
                    When(status_ketersediaan="Terjual", then=Value(2)),
                    default=Value(3),
                    output_field=IntegerField(),
                )
            )
            .order_by("status_order", "-harga_display")
        )

# ──────────────────────────────────────────────
# Public Address Form API
# ──────────────────────────────────────────────

class AddressFormView(APIView):
    """
    GET /api/transaksi/alamat/<token>/
    POST /api/transaksi/alamat/<token>/
    """
    from rest_framework.permissions import AllowAny
    authentication_classes = []
    permission_classes = [AllowAny]
    
    def get(self, request, token):
        trx = get_object_or_404(Transaction, token_alamat=token)
        if trx.alamat_lengkap:
            return Response({"status": "already_filled", "message": "Alamat sudah diisi."})
            
        hamsters = []
        for h in trx.hamsters.all():
            hamsters.append(f"{h.kode_hamster} ({h.variant.spesies})")
            
        return Response({
            "status": "ok",
            "nomor_wa": trx.customer.nomor_wa,
            "total_bayar": trx.total_bayar,
            "hamsters": hamsters,
            "keterangan_kurir": trx.keterangan_kurir
        })

    def post(self, request, token):
        trx = get_object_or_404(Transaction, token_alamat=token)
        if trx.alamat_lengkap:
            return Response({"error": "Alamat sudah diisi."}, status=status.HTTP_400_BAD_REQUEST)
            
        data = request.data
            
        # 2. Create Address
        alamat = Address.objects.create(
            customer=trx.customer,
            label_alamat="Rumah",
            nama_penerima=data.get("nama_penerima", ""),
            nomor_wa_penerima=data.get("nomor_wa", ""),
            provinsi=data.get("provinsi", ""),
            kota_kabupaten=data.get("kota_kabupaten", ""),
            kecamatan=data.get("kecamatan", ""),
            kelurahan_desa=data.get("kelurahan_desa", ""),
            detail_alamat=data.get("detail_alamat", ""),
            kode_pos=data.get("kode_pos", "")
        )
        
        # 3. Link to Transaction
        trx.alamat = alamat
        trx.alamat_lengkap = True
        trx.save()
        
        return Response({"status": "success", "message": "Alamat berhasil disimpan."})
