from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import LiveInventory, MasterCourier, Transaction, Customer, Box
from .serializers import LiveInventorySerializer
from rest_framework import serializers

class MasterCourierSerializer(serializers.ModelSerializer):
    class Meta:
        model = MasterCourier
        fields = ['pk', 'nama_kurir', 'jenis_layanan', 'estimasi_default_hari']

class TransactionDashboardSerializer(serializers.ModelSerializer):
    nomor_wa = serializers.CharField(source='customer.nomor_wa', read_only=True)
    nama_customer = serializers.CharField(source='customer.nama_customer', read_only=True, default='')
    alamat_lengkap = serializers.SerializerMethodField()
    alamat_data = serializers.SerializerMethodField()
    hamsters_list = serializers.SerializerMethodField()
    link_alamat = serializers.SerializerMethodField()
    qty_packing = serializers.SerializerMethodField()

    class Meta:
        model = Transaction
        fields = [
            'transaction_id', 'nomor_wa', 'nama_customer', 'status_pembayaran', 'total_bayar', 'nominal_dp',
            'nominal_refund', 'nomor_resi', 'created_at', 'alamat_lengkap', 'alamat_data', 'hamsters_list', 
            'link_alamat', 'keterangan_kurir', 'tanggal_kirim', 'hamsters_mati', 'alasan_batal', 'sudah_video_packing',
            'qty_packing'
        ]

    def get_alamat_lengkap(self, obj):
        return obj.alamat is not None

    def get_alamat_data(self, obj):
        if obj.alamat:
            return {
                "nama_penerima": obj.alamat.nama_penerima,
                "nomor_wa": obj.alamat.nomor_wa_penerima,
                "provinsi": obj.alamat.provinsi,
                "kota": obj.alamat.kota_kabupaten,
                "kecamatan": obj.alamat.kecamatan,
                "kelurahan": obj.alamat.kelurahan_desa,
                "detail": obj.alamat.detail_alamat,
                "kode_pos": obj.alamat.kode_pos
            }
        return None

    def get_hamsters_list(self, obj):
        return [
            {
                "id": h.inventory_id, 
                "kode": h.kode_hamster, 
                "harga": h.harga_display,
                "spesies": h.variant.spesies if h.variant else "-",
                "varian_warna": h.variant.varian_warna if h.variant else "-",
                "jenis_bulu": h.variant.jenis_bulu if h.variant else "-",
                "is_satin": h.variant.is_satin if h.variant else False,
                "gender": h.jenis_kelamin,
                "usia": f"{h.usia_bulan} Bln",
                "foto": h.foto_preview.url if h.foto_preview else None
            } 
            for h in obj.hamsters.all()
        ]

    def get_link_alamat(self, obj):
        from django.conf import settings
        # Use the public domain in production, or localhost:3000 (Next.js) in dev
        base = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
        return f"{base}/isi-alamat/{obj.token_alamat}/"

    def get_qty_packing(self, obj):
        return obj.biaya_packing // 10000 if obj.biaya_packing else 0

class DashboardInventoryAPIView(APIView):
    def get(self, request):
        inventory = LiveInventory.objects.filter(status_ketersediaan="Tersedia").select_related("variant")
        serializer = LiveInventorySerializer(inventory, many=True, context={'request': request})
        return Response(serializer.data)

class DashboardCouriersAPIView(APIView):
    def get(self, request):
        couriers = MasterCourier.objects.filter(is_active=True)
        serializer = MasterCourierSerializer(couriers, many=True)
        return Response(serializer.data)

class DashboardCreateInvoiceAPIView(APIView):
    from rest_framework.permissions import AllowAny
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        data = request.data
        nomor_wa = data.get("nomor_wa")
        qty_packing = int(data.get("qty_packing", 0))
        is_free_packing = data.get("is_free_packing", False)
        biaya_packing = 0 if is_free_packing else (qty_packing * 10000)
        biaya_ongkir = int(data.get("biaya_ongkir", 0))
        kurir_id = data.get("kurir_id")
        estimasi_hari = data.get("estimasi_hari", "").strip()
        hamster_ids = data.get("hamsters", [])

        import re
        wa_clean = re.sub(r'[^\d+]', '', nomor_wa) if nomor_wa else ""
        if not wa_clean:
            return Response({"error": "Nomor WA diperlukan"}, status=status.HTTP_400_BAD_REQUEST)
            
        customer, _ = Customer.objects.get_or_create(nomor_wa=wa_clean)

        keterangan_kurir = ""
        if kurir_id:
            try:
                kurir = MasterCourier.objects.get(pk=kurir_id)
                keterangan_kurir = f"{kurir.nama_kurir} {kurir.jenis_layanan}"
                if estimasi_hari:
                    keterangan_kurir += f" ({estimasi_hari} hari)"
            except MasterCourier.DoesNotExist:
                pass

        hamsters = LiveInventory.objects.filter(inventory_id__in=hamster_ids)
        total_hamster = sum([h.harga_display for h in hamsters])
        
        # Calculate total ongkir (ongkir per kg * qty_packing)
        total_ongkir = biaya_ongkir * (qty_packing if qty_packing > 0 else 1)
        
        total_bayar = total_hamster + biaya_packing + total_ongkir

        trx = Transaction.objects.create(
            customer=customer,
            status_pembayaran="PENDING",
            biaya_packing=biaya_packing,
            biaya_ongkir=total_ongkir,
            total_bayar=total_bayar,
            keterangan_kurir=keterangan_kurir
        )

        for h in hamsters:
            if h.box.spesies != Box.SpesiesChoices.PERLENGKAPAN and h.box.nama_box.lower() != 'aksesoris':
                h.status_ketersediaan = LiveInventory.StatusKetersediaan.HOLD
                h.save()
        trx.hamsters.set(hamsters)

        return Response({
            "message": "Invoice berhasil dibuat",
            "transaction_id": trx.transaction_id,
            "total_bayar": total_bayar
        }, status=status.HTTP_201_CREATED)

class DashboardTransactionAPIView(APIView):
    def get(self, request):
        transactions = Transaction.objects.select_related('customer', 'alamat').prefetch_related('hamsters').order_by('-created_at')[:50]
        serializer = TransactionDashboardSerializer(transactions, many=True, context={'request': request})
        return Response(serializer.data)

class DashboardTransactionDetailAPIView(APIView):
    from rest_framework.permissions import AllowAny
    authentication_classes = []
    permission_classes = [AllowAny]

    def patch(self, request, pk):
        try:
            trx = Transaction.objects.get(pk=pk)
        except Transaction.DoesNotExist:
            return Response({"error": "Not found"}, status=404)
        
        data = request.data
        
        # Update Customer & Address if provided
        has_updates = False
        customer_wa = data.get('nomor_wa')
        customer_name = data.get('nama_customer')
        
        if customer_wa:
            customer_wa = customer_wa.strip()
            if trx.customer:
                from .models import Customer
                existing_cust = Customer.objects.filter(nomor_wa=customer_wa).exclude(customer_id=trx.customer.customer_id).first()
                if existing_cust:
                    trx.customer = existing_cust
                else:
                    trx.customer.nomor_wa = customer_wa
                    if customer_name is not None:
                        trx.customer.nama_customer = customer_name
                    trx.customer.save()
            else:
                from .models import Customer
                cust, _ = Customer.objects.get_or_create(
                    nomor_wa=customer_wa,
                    defaults={'nama_customer': customer_name or 'No Name'}
                )
                trx.customer = cust
            has_updates = True
        elif customer_name is not None and trx.customer:
            trx.customer.nama_customer = customer_name
            trx.customer.save()
            has_updates = True

        alamat_data = data.get('alamat_data')
        if alamat_data:
            from .models import Address
            addr = trx.alamat
            if not addr:
                if trx.customer:
                    addr = Address(customer=trx.customer)
                else:
                    return Response({"error": "Cannot create address without a customer"}, status=400)
            
            if 'nama_penerima' in alamat_data:
                addr.nama_penerima = alamat_data['nama_penerima']
            if 'nomor_wa' in alamat_data:
                addr.nomor_wa_penerima = alamat_data['nomor_wa']
            if 'provinsi' in alamat_data:
                addr.provinsi = alamat_data['provinsi']
            if 'kota' in alamat_data:
                addr.kota_kabupaten = alamat_data['kota']
            if 'kecamatan' in alamat_data:
                addr.kecamatan = alamat_data['kecamatan']
            if 'kelurahan' in alamat_data:
                addr.kelurahan_desa = alamat_data['kelurahan']
            if 'detail' in alamat_data:
                addr.detail_alamat = alamat_data['detail']
            if 'kode_pos' in alamat_data:
                addr.kode_pos = alamat_data['kode_pos']
            
            addr.save()
            trx.alamat = addr
            trx.alamat_lengkap = True
            has_updates = True

        keterangan_kurir = data.get('keterangan_kurir')
        if keterangan_kurir is not None:
            trx.keterangan_kurir = keterangan_kurir
            has_updates = True

        nomor_resi = data.get('nomor_resi')
        if nomor_resi is not None:
            trx.nomor_resi = nomor_resi.strip()
            has_updates = True

        if has_updates:
            trx.save()

        new_status = data.get('status_pembayaran')
        nominal_dp = data.get('nominal_dp')
        nominal_refund = data.get('nominal_refund')
        nomor_resi = data.get('nomor_resi')
        tanggal_kirim = data.get('tanggal_kirim')
        
        if tanggal_kirim is not None:
            trx.tanggal_kirim = tanggal_kirim if tanggal_kirim else None
            trx.save()

        if 'sudah_video_packing' in data:
            trx.sudah_video_packing = data['sudah_video_packing']

        if 'hamsters_mati' in data:
            trx.hamsters_mati = data['hamsters_mati']

        if new_status in ['LUNAS', 'PENDING', 'DP', 'CANCELLED', 'BELUM LUNAS', 'DIKIRIM', 'SAMPAI', 'GARANSI', 'REFUNDED']:
            trx.status_pembayaran = new_status
            
            if new_status == 'DP' and nominal_dp is not None:
                trx.nominal_dp = int(nominal_dp)
            elif new_status == 'GARANSI' and nominal_refund is not None:
                trx.nominal_refund = int(nominal_refund)
            elif new_status == 'DIKIRIM' and nomor_resi:
                trx.nomor_resi = nomor_resi
            elif new_status == 'CANCELLED':
                alasan_batal = data.get('alasan_batal')
                if alasan_batal:
                    trx.alasan_batal = alasan_batal

            if new_status in ['LUNAS', 'DP']:
                metode_pembayaran = data.get('metode_pembayaran')
                if metode_pembayaran:
                    trx.metode_pembayaran = metode_pembayaran

            trx.save()
            
            # Logic update status hamster
            if new_status in ['LUNAS', 'DIKIRIM', 'SAMPAI', 'GARANSI']:
                trx.hamsters.exclude(box__spesies=Box.SpesiesChoices.PERLENGKAPAN).exclude(box__nama_box__iexact='aksesoris').update(status_ketersediaan=LiveInventory.StatusKetersediaan.TERJUAL)
            elif new_status in ['PENDING', 'DP', 'BELUM LUNAS']:
                trx.hamsters.exclude(box__spesies=Box.SpesiesChoices.PERLENGKAPAN).exclude(box__nama_box__iexact='aksesoris').update(status_ketersediaan=LiveInventory.StatusKetersediaan.HOLD)
            elif new_status == 'CANCELLED':
                trx.hamsters.exclude(box__spesies=Box.SpesiesChoices.PERLENGKAPAN).exclude(box__nama_box__iexact='aksesoris').update(status_ketersediaan=LiveInventory.StatusKetersediaan.TERSEDIA)
                
            return Response({"message": f"Status updated to {new_status}"})
        
        trx.save()
        
        if tanggal_kirim is not None:
            return Response({"message": "Shipping date updated successfully"})

        if 'hamsters_mati' in data:
            return Response({"message": "Hamster problem list updated"})

        if has_updates:
            return Response({"message": "Transaction details updated successfully"})

        return Response({"error": "Invalid status or no data provided"}, status=400)

class DashboardVariantsAPIView(APIView):
    """GET /api/dashboard/variants/ — List all MasterVariant for dropdown."""
    def get(self, request):
        from .models import MasterVariant
        variants = MasterVariant.objects.all().order_by('spesies', 'varian_warna')
        data = [
            {
                "variant_id": v.variant_id,
                "label": str(v),
                "spesies": v.spesies,
                "varian_warna": v.varian_warna,
                "jenis_bulu": v.jenis_bulu,
                "is_satin": v.is_satin,
            }
            for v in variants
        ]
        return Response(data)


class DashboardAddInventoryAPIView(APIView):
    """POST /api/dashboard/inventory/add/ — Create a new LiveInventory item (JSON, no files)."""
    from rest_framework.permissions import AllowAny
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        from .models import Box, MasterVariant
        data = request.data
        box_id = data.get("box_id")
        variant_id = data.get("variant_id")
        jenis_kelamin = data.get("jenis_kelamin", "Belum Diketahui")
        usia_bulan = data.get("usia_bulan") or None
        grade_corak = data.get("grade_corak") or None
        harga_display = data.get("harga_display", 0)
        kondisi_fisik = data.get("kondisi_fisik", "")

        if not box_id or not variant_id:
            return Response({"error": "box_id dan variant_id wajib diisi."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            box = Box.objects.get(pk=box_id, session__is_active=True)
        except Box.DoesNotExist:
            return Response({"error": "Box tidak ditemukan atau tidak di sesi aktif."}, status=status.HTTP_404_NOT_FOUND)

        try:
            variant = MasterVariant.objects.get(pk=variant_id)
        except MasterVariant.DoesNotExist:
            return Response({"error": "Varian tidak ditemukan."}, status=status.HTTP_404_NOT_FOUND)

        item = LiveInventory.objects.create(
            box=box,
            variant=variant,
            jenis_kelamin=jenis_kelamin,
            usia_bulan=usia_bulan,
            grade_corak=grade_corak,
            harga_display=int(harga_display),
            kondisi_fisik=kondisi_fisik,
            status_ketersediaan=LiveInventory.StatusKetersediaan.TERSEDIA,
        )

        return Response({
            "message": "Item berhasil ditambahkan!",
            "inventory_id": item.inventory_id,
            "kode_hamster": item.kode_hamster,
        }, status=status.HTTP_201_CREATED)


class DashboardUploadMediaAPIView(APIView):
    """POST /api/dashboard/inventory/<id>/upload/ — Save Cloudinary Public IDs for an inventory item."""
    from rest_framework.permissions import AllowAny
    # We no longer need MultiPartParser because we receive JSON now
    authentication_classes = []  # Bypass CSRF for now
    permission_classes = [AllowAny]

    def post(self, request, pk):
        try:
            item = LiveInventory.objects.get(pk=pk)
        except LiveInventory.DoesNotExist:
            return Response({"error": "Item tidak ditemukan."}, status=status.HTTP_404_NOT_FOUND)

        data = request.data
        foto_url = data.get("foto_url")
        video_url = data.get("video_url")

        print(f"DEBUG: Receiving Cloudinary URLs for item {pk}. Foto: {foto_url}, Video: {video_url}")

        try:
            if foto_url:
                item.foto_preview.name = foto_url
            if video_url:
                item.video_file.name = video_url
            if foto_url or video_url:
                item.save()
            
            print(f"DEBUG: Successfully saved media links for item {pk}")
            return Response({"message": "Tautan media berhasil disimpan."})
        except Exception as e:
            print(f"DEBUG: Error saving media links: {str(e)}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)




class DashboardStatsAPIView(APIView):
    def get(self, request):
        from django.utils import timezone
        from django.db.models import Q
        
        today = timezone.now().date()
        
        # 1. Menunggu Bayar (PENDING or BELUM LUNAS)
        menunggu_bayar = Transaction.objects.filter(status_pembayaran__in=['PENDING', 'BELUM LUNAS']).count()
        
        # 2. Lengkapi Alamat (LUNAS, but alamat is null)
        lengkapi_alamat = Transaction.objects.filter(status_pembayaran='LUNAS', alamat__isnull=True).count()
        
        # 3. Siap Packing
        siap_packing = Transaction.objects.filter(
            status_pembayaran='LUNAS',
            alamat__isnull=False,
            sudah_video_packing=False
        ).count()

        # 3b. Siap Kirim
        siap_kirim = Transaction.objects.filter(
            status_pembayaran='LUNAS',
            alamat__isnull=False,
            sudah_video_packing=True
        ).filter(Q(nomor_resi__isnull=True) | Q(nomor_resi='')).count()

        # 4. Dalam Perjalanan
        dalam_perjalanan = Transaction.objects.filter(status_pembayaran='DIKIRIM').count()
        
        # 5. Klaim Garansi
        klaim_garansi = Transaction.objects.filter(status_pembayaran='GARANSI').count()
        
        # 6. Selesai
        selesai = Transaction.objects.filter(status_pembayaran='SAMPAI').count()
        
        # 7. Batal
        batal = Transaction.objects.filter(status_pembayaran='CANCELLED').count()

        return Response({
            "menunggu_bayar": menunggu_bayar,
            "lengkapi_alamat": lengkapi_alamat,
            "siap_packing": siap_packing,
            "siap_kirim": siap_kirim,
            "dalam_perjalanan": dalam_perjalanan,
            "klaim_garansi": klaim_garansi,
            "selesai": selesai,
            "batal": batal,
        })

class DashboardSessionsAPIView(APIView):
    """GET/POST /api/dashboard/sessions/ — List or create sessions."""
    from rest_framework.permissions import AllowAny
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        from .models import SetupSession
        sessions = SetupSession.objects.all().order_by('-created_at')
        data = [
            {
                "session_id": s.session_id,
                "nama_sesi": s.nama_sesi,
                "is_active": s.is_active,
                "created_at": s.created_at
            }
            for s in sessions
        ]
        return Response(data)

    def post(self, request):
        from .models import SetupSession
        nama_sesi = request.data.get("nama_sesi", "").strip()
        if not nama_sesi:
            return Response({"error": "Nama sesi tidak boleh kosong."}, status=400)
        session = SetupSession.objects.create(nama_sesi=nama_sesi, is_active=False)
        return Response({
            "session_id": session.session_id,
            "nama_sesi": session.nama_sesi,
            "is_active": session.is_active,
            "created_at": session.created_at,
        }, status=201)

class DashboardBoxesBySessionAPIView(APIView):
    """GET/POST /api/dashboard/sessions/<session_id>/boxes/ — List or create boxes for a session."""
    from rest_framework.permissions import AllowAny
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request, session_id):
        from .models import Box
        from .serializers import BoxSerializer
        boxes = Box.objects.filter(session_id=session_id).prefetch_related("items").order_by("urutan", "nama_box")
        serializer = BoxSerializer(boxes, many=True, context={'request': request})
        return Response(serializer.data)

    def post(self, request, session_id):
        from .models import Box, SetupSession
        try:
            session = SetupSession.objects.get(pk=session_id)
        except SetupSession.DoesNotExist:
            return Response({"error": "Sesi tidak ditemukan."}, status=404)

        nama_box = request.data.get("nama_box", "").strip()
        if not nama_box:
            return Response({"error": "Nama box tidak boleh kosong."}, status=400)

        # Check unique together
        if Box.objects.filter(session=session, nama_box=nama_box).exists():
            return Response({"error": f"Box '{nama_box}' sudah ada di sesi ini."}, status=400)

        box = Box.objects.create(
            session=session,
            nama_box=nama_box,
            spesies=request.data.get("spesies") or None,
            kategori_box=request.data.get("kategori_box") or None,
            jenis_kelamin_box=request.data.get("jenis_kelamin_box") or None,
            urutan=int(request.data.get("urutan", 0)),
        )
        from .serializers import BoxSerializer
        serializer = BoxSerializer(box, context={'request': request})
        return Response(serializer.data, status=201)

class DashboardSessionDetailAPIView(APIView):
    """PUT/DELETE /api/dashboard/sessions/<session_id>/ — Manage a specific session."""
    from rest_framework.permissions import AllowAny
    authentication_classes = []
    permission_classes = [AllowAny]

    def put(self, request, session_id):
        from .models import SetupSession
        try:
            session = SetupSession.objects.get(pk=session_id)
        except SetupSession.DoesNotExist:
            return Response({"error": "Sesi tidak ditemukan."}, status=404)

        nama_sesi = request.data.get("nama_sesi")
        is_active = request.data.get("is_active")

        if nama_sesi is not None:
            session.nama_sesi = nama_sesi
        if is_active is not None:
            session.is_active = is_active

        session.save()
        return Response({
            "session_id": session.session_id,
            "nama_sesi": session.nama_sesi,
            "is_active": session.is_active,
            "created_at": session.created_at,
        })

    def delete(self, request, session_id):
        from .models import SetupSession, Box
        try:
            session = SetupSession.objects.get(pk=session_id)
        except SetupSession.DoesNotExist:
            return Response({"error": "Sesi tidak ditemukan."}, status=404)

        # Prevent deletion if session still has boxes
        box_count = Box.objects.filter(session_id=session_id).count()
        if box_count > 0:
            return Response(
                {"error": f"Sesi ini masih memiliki {box_count} box. Hapus semua box terlebih dahulu sebelum menghapus sesi."},
                status=400
            )

        session.delete()
        return Response({"success": True}, status=200)


class DashboardSessionDuplicateAPIView(APIView):
    """POST /api/dashboard/sessions/<session_id>/duplicate/ — Duplicate a session."""
    from rest_framework.permissions import AllowAny
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request, session_id):
        from django.db import transaction
        from .models import SetupSession, Box, LiveInventory

        try:
            source = SetupSession.objects.get(pk=session_id)
        except SetupSession.DoesNotExist:
            return Response({"error": "Sesi tidak ditemukan."}, status=404)

        mode = request.data.get("mode", "all")  # "all" or "available_only"

        with transaction.atomic():
            new_session = SetupSession.objects.create(
                nama_sesi=f"{source.nama_sesi} (Copy)",
                is_active=False,
            )

            source_boxes = Box.objects.filter(session=source)
            for box in source_boxes:
                new_box = Box.objects.create(
                    session=new_session,
                    nama_box=box.nama_box,
                    kategori=box.kategori,
                    spesies=box.spesies,
                    kategori_box=box.kategori_box,
                    jenis_kelamin_box=box.jenis_kelamin_box,
                    urutan=box.urutan,
                )

                items_qs = LiveInventory.objects.filter(box=box)
                if mode == "available_only":
                    items_qs = items_qs.filter(status_ketersediaan="Tersedia")

                for item in items_qs:
                    LiveInventory.objects.create(
                        box=new_box,
                        variant=item.variant,
                        jenis_kelamin=item.jenis_kelamin,
                        usia_bulan=item.usia_bulan,
                        grade_corak=item.grade_corak,
                        kondisi_fisik=item.kondisi_fisik,
                        harga_display=item.harga_display,
                        status_ketersediaan="Tersedia",
                        # foto & video intentionally left empty
                    )

        return Response({
            "session_id": new_session.session_id,
            "nama_sesi": new_session.nama_sesi,
            "is_active": new_session.is_active,
            "created_at": new_session.created_at,
        }, status=201)


class DashboardBoxDetailAPIView(APIView):
    """PUT/DELETE /api/dashboard/boxes/<box_id>/ — Edit or delete a box."""
    from rest_framework.permissions import AllowAny
    authentication_classes = []
    permission_classes = [AllowAny]

    def put(self, request, box_id):
        from .models import Box
        try:
            box = Box.objects.get(pk=box_id)
        except Box.DoesNotExist:
            return Response({"error": "Box tidak ditemukan."}, status=404)

        nama_box = request.data.get("nama_box")
        if nama_box is not None:
            nama_box = nama_box.strip()
            if not nama_box:
                return Response({"error": "Nama box tidak boleh kosong."}, status=400)
            # Check unique together
            if Box.objects.filter(session=box.session, nama_box=nama_box).exclude(pk=box_id).exists():
                return Response({"error": f"Box '{nama_box}' sudah ada di sesi ini."}, status=400)
            box.nama_box = nama_box

        spesies = request.data.get("spesies")
        if spesies is not None:
            box.spesies = spesies or None

        kategori_box = request.data.get("kategori_box")
        if kategori_box is not None:
            box.kategori_box = kategori_box or None

        jenis_kelamin_box = request.data.get("jenis_kelamin_box")
        if jenis_kelamin_box is not None:
            box.jenis_kelamin_box = jenis_kelamin_box or None

        urutan = request.data.get("urutan")
        if urutan is not None:
            box.urutan = int(urutan)

        box.save()
        from .serializers import BoxSerializer
        serializer = BoxSerializer(box, context={'request': request})
        return Response(serializer.data)

    def delete(self, request, box_id):
        from .models import Box, LiveInventory
        try:
            box = Box.objects.get(pk=box_id)
        except Box.DoesNotExist:
            return Response({"error": "Box tidak ditemukan."}, status=404)

        item_count = LiveInventory.objects.filter(box=box).count()
        if item_count > 0:
            return Response(
                {"error": f"Box ini masih memiliki {item_count} item. Hapus semua item terlebih dahulu."},
                status=400
            )

        box.delete()
        return Response({"success": True}, status=200)


class DashboardBoxItemsAPIView(APIView):
    """GET /api/dashboard/boxes/<box_id>/items/ — List ALL items in a box (including Disembunyikan)."""

    def get(self, request, box_id):
        from .models import LiveInventory
        from .serializers import LiveInventorySerializer
        from django.db.models import Case, When, Value, IntegerField
        
        items = (
            LiveInventory.objects
            .filter(box_id=box_id)
            .select_related("variant", "box")
            .annotate(
                status_order=Case(
                    When(status_ketersediaan="Tersedia", then=Value(0)),
                    When(status_ketersediaan="Hold", then=Value(1)),
                    When(status_ketersediaan="Terjual", then=Value(2)),
                    When(status_ketersediaan="Disembunyikan", then=Value(3)),
                    default=Value(4),
                    output_field=IntegerField(),
                )
            )
            .order_by("status_order", "-harga_display")
        )
        serializer = LiveInventorySerializer(items, many=True, context={'request': request})
        return Response({"results": serializer.data})


class DashboardItemDetailAPIView(APIView):
    """PUT/DELETE /api/dashboard/items/<item_id>/ — Edit or delete an inventory item."""
    from rest_framework.permissions import AllowAny
    authentication_classes = []
    permission_classes = [AllowAny]

    def put(self, request, item_id):
        from .models import LiveInventory, Box
        from decimal import Decimal, InvalidOperation

        try:
            item = LiveInventory.objects.select_related('box', 'variant').get(pk=item_id)
        except LiveInventory.DoesNotExist:
            return Response({"error": "Item tidak ditemukan."}, status=404)

        # Status change — only Tersedia ↔ Disembunyikan allowed manually
        new_status = request.data.get("status_ketersediaan")
        if new_status is not None:
            allowed = ["Tersedia", "Disembunyikan"]
            if item.status_ketersediaan not in allowed:
                return Response(
                    {"error": f"Status '{item.status_ketersediaan}' tidak dapat diubah manual. Perubahan status Hold/Terjual hanya melalui proses invoice."},
                    status=400
                )
            if new_status not in allowed:
                return Response({"error": f"Status '{new_status}' tidak diizinkan untuk perubahan manual."}, status=400)
            item.status_ketersediaan = new_status

        # Move to another box
        new_box_id = request.data.get("box_id")
        if new_box_id is not None:
            try:
                new_box = Box.objects.get(pk=new_box_id)
                item.box = new_box
            except Box.DoesNotExist:
                return Response({"error": "Box tujuan tidak ditemukan."}, status=404)

        # Edit variant
        variant_id = request.data.get("variant_id")
        if variant_id is not None:
            from .models import MasterVariant
            try:
                item.variant = MasterVariant.objects.get(pk=variant_id)
            except MasterVariant.DoesNotExist:
                return Response({"error": "Varian tidak ditemukan."}, status=404)

        # Simple field updates
        for field in ["jenis_kelamin", "grade_corak", "kondisi_fisik"]:
            val = request.data.get(field)
            if val is not None:
                setattr(item, field, val)

        usia = request.data.get("usia_bulan")
        if usia is not None:
            try:
                item.usia_bulan = Decimal(str(usia)) if usia else None
            except (InvalidOperation, ValueError):
                pass

        harga = request.data.get("harga_display")
        if harga is not None:
            try:
                item.harga_display = Decimal(str(harga))
            except (InvalidOperation, ValueError):
                return Response({"error": "Harga tidak valid."}, status=400)

        item.save()

        return Response({
            "inventory_id": item.inventory_id,
            "kode_hamster": item.kode_hamster,
            "status_ketersediaan": item.status_ketersediaan,
            "box_id": item.box_id,
        })

    def delete(self, request, item_id):
        from .models import LiveInventory
        try:
            item = LiveInventory.objects.get(pk=item_id)
        except LiveInventory.DoesNotExist:
            return Response({"error": "Item tidak ditemukan."}, status=404)

        item.delete()
        return Response({"success": True}, status=200)
