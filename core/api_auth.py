"""
Noska Hamster — API Authentication (Customer)
=============================================
"""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.authtoken.models import Token
from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from django.db import transaction
from .models import Customer, Address, Transaction

class RegisterAPIView(APIView):
    permission_classes = [AllowAny]

    @transaction.atomic
    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')
        nama_customer = request.data.get('nama_customer')
        nomor_wa = request.data.get('nomor_wa', '')

        if not email or not password or not nama_customer:
            return Response({"error": "Email, Password, dan Nama wajib diisi."}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(email=email).exists():
            return Response({"error": "Email ini sudah terdaftar."}, status=status.HTTP_400_BAD_REQUEST)
        
        if nomor_wa and Customer.objects.filter(nomor_wa=nomor_wa).exists():
            # If the legacy WA exists, we should ideally link it or reject. For simplicity, reject if already used.
            # But wait, legacy customers don't have user. Let's try to link it if no user is attached.
            existing_customer = Customer.objects.filter(nomor_wa=nomor_wa).first()
            if existing_customer.user:
                return Response({"error": "Nomor WhatsApp ini sudah digunakan oleh akun lain."}, status=status.HTTP_400_BAD_REQUEST)
            else:
                customer = existing_customer
                customer.nama_customer = nama_customer # Update name
        else:
            customer = Customer(nama_customer=nama_customer, nomor_wa=nomor_wa)

        # Create user (using email as username)
        user = User.objects.create_user(username=email, email=email, password=password)
        user.first_name = nama_customer
        user.save()

        # Link and save customer
        customer.user = user
        customer.save()

        # Generate Token
        token, _ = Token.objects.get_or_create(user=user)

        return Response({
            "token": token.key,
            "user": {
                "id": user.id,
                "email": user.email,
                "nama": customer.nama_customer,
                "wa": customer.nomor_wa
            }
        }, status=status.HTTP_201_CREATED)


class LoginAPIView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')

        if not email or not password:
            return Response({"error": "Email dan Password wajib diisi."}, status=status.HTTP_400_BAD_REQUEST)

        # Django's default authenticate uses 'username'. Since we save username = email:
        user = authenticate(username=email, password=password)

        if not user:
            return Response({"error": "Kredensial tidak valid atau akun tidak ditemukan."}, status=status.HTTP_401_UNAUTHORIZED)

        token, _ = Token.objects.get_or_create(user=user)
        
        # Get customer profile
        customer = Customer.objects.filter(user=user).first()
        nama = customer.nama_customer if customer else user.first_name
        wa = customer.nomor_wa if customer else ""

        return Response({
            "token": token.key,
            "user": {
                "id": user.id,
                "email": user.email,
                "nama": nama,
                "wa": wa
            }
        })


class ProfileAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        customer = Customer.objects.filter(user=user).first()

        return Response({
            "id": user.id,
            "email": user.email,
            "nama": customer.nama_customer if customer else user.first_name,
            "wa": customer.nomor_wa if customer else ""
        })


class CustomerAddressAPIView(APIView):
    """CRUD Alamat Customer — GET list, POST create, DELETE remove"""
    permission_classes = [IsAuthenticated]

    def _get_customer(self, user):
        return Customer.objects.filter(user=user).first()

    def _serialize(self, addr):
        return {
            "address_id": addr.address_id,
            "label": addr.label_alamat,
            "nama_penerima": addr.nama_penerima,
            "nomor_wa": addr.nomor_wa_penerima,
            "detail": addr.detail_alamat,
            "kelurahan": addr.kelurahan_desa,
            "kecamatan": addr.kecamatan,
            "kota": addr.kota_kabupaten,
            "provinsi": addr.provinsi,
            "kode_pos": addr.kode_pos,
            "destination_id": addr.destination_id,
            "is_default": addr.is_default,
        }

    def get(self, request):
        customer = self._get_customer(request.user)
        if not customer:
            return Response([], status=status.HTTP_200_OK)
        addresses = Address.objects.filter(customer=customer).order_by("-is_default", "-address_id")
        return Response([self._serialize(a) for a in addresses])

    def post(self, request):
        customer = self._get_customer(request.user)
        if not customer:
            return Response({"error": "Profil tidak ditemukan."}, status=status.HTTP_404_NOT_FOUND)

        d = request.data
        if not d.get("nama_penerima") or not d.get("nomor_wa") or not d.get("detail") or not d.get("provinsi") or not d.get("kota"):
            return Response({"error": "Nama, No WA, Detail, Provinsi, dan Kota wajib diisi."}, status=status.HTTP_400_BAD_REQUEST)

        # If this is marked as default, unset others
        if d.get("is_default"):
            Address.objects.filter(customer=customer, is_default=True).update(is_default=False)

        addr = Address.objects.create(
            customer=customer,
            label_alamat=d.get("label", "Rumah"),
            nama_penerima=d["nama_penerima"],
            nomor_wa_penerima=d["nomor_wa"],
            detail_alamat=d["detail"],
            kelurahan_desa=d.get("kelurahan", ""),
            kecamatan=d.get("kecamatan", ""),
            kota_kabupaten=d["kota"],
            provinsi=d["provinsi"],
            kode_pos=d.get("kode_pos", ""),
            destination_id=d.get("destination_id", ""),
            is_default=d.get("is_default", False),
        )
        return Response(self._serialize(addr), status=status.HTTP_201_CREATED)

    def put(self, request):
        customer = self._get_customer(request.user)
        d = request.data
        address_id = d.get("address_id")
        
        if not address_id:
            return Response({"error": "address_id wajib dikirim."}, status=status.HTTP_400_BAD_REQUEST)

        addr = Address.objects.filter(address_id=address_id, customer=customer).first()
        if not addr:
            return Response({"error": "Alamat tidak ditemukan."}, status=status.HTTP_404_NOT_FOUND)

        if not d.get("nama_penerima") or not d.get("nomor_wa") or not d.get("detail") or not d.get("provinsi") or not d.get("kota"):
            return Response({"error": "Nama, No WA, Detail, Provinsi, dan Kota wajib diisi."}, status=status.HTTP_400_BAD_REQUEST)

        if d.get("is_default"):
            Address.objects.filter(customer=customer, is_default=True).exclude(address_id=address_id).update(is_default=False)

        addr.label_alamat = d.get("label", addr.label_alamat)
        addr.nama_penerima = d["nama_penerima"]
        addr.nomor_wa_penerima = d["nomor_wa"]
        addr.detail_alamat = d["detail"]
        addr.kelurahan_desa = d.get("kelurahan", addr.kelurahan_desa)
        addr.kecamatan = d.get("kecamatan", addr.kecamatan)
        addr.kota_kabupaten = d["kota"]
        addr.provinsi = d["provinsi"]
        addr.kode_pos = d.get("kode_pos", addr.kode_pos)
        addr.destination_id = d.get("destination_id", addr.destination_id)
        addr.is_default = d.get("is_default", addr.is_default)
        addr.save()

        return Response(self._serialize(addr), status=status.HTTP_200_OK)

    def delete(self, request):
        customer = self._get_customer(request.user)
        address_id = request.data.get("address_id")
        if not address_id:
            return Response({"error": "address_id wajib."}, status=status.HTTP_400_BAD_REQUEST)
        Address.objects.filter(address_id=address_id, customer=customer).delete()
        return Response({"message": "Alamat dihapus."})


class CustomerTransactionsAPIView(APIView):
    """Riwayat Transaksi Customer — GET list"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        customer = Customer.objects.filter(user=request.user).first()
        if not customer:
            return Response([], status=status.HTTP_200_OK)

        transactions = Transaction.objects.filter(customer=customer).order_by("-created_at")
        
        result = []
        for trx in transactions:
            # Serialize hamsters
            hamsters_data = []
            for h in trx.hamsters.all().select_related("variant", "box"):
                foto_url = ""
                if h.foto_preview:
                    foto_url = request.build_absolute_uri(h.foto_preview.url)
                hamsters_data.append({
                    "inventory_id": h.inventory_id,
                    "kode_hamster": h.kode_hamster,
                    "spesies": h.variant.spesies if h.variant else "",
                    "varian_warna": h.variant.varian_warna if h.variant else "",
                    "jenis_kelamin": h.jenis_kelamin,
                    "harga": int(h.harga_display),
                    "foto": foto_url,
                })

            # Serialize address
            alamat_data = None
            if trx.alamat:
                alamat_data = {
                    "nama_penerima": trx.alamat.nama_penerima,
                    "kota": trx.alamat.kota_kabupaten,
                    "provinsi": trx.alamat.provinsi,
                    "detail": trx.alamat.detail_alamat,
                }

            result.append({
                "transaction_id": trx.transaction_id,
                "invoice": f"INV-{trx.transaction_id}",
                "status": trx.status_pembayaran,
                "metode_pembayaran": trx.metode_pembayaran,
                "hamsters": hamsters_data,
                "biaya_packing": trx.biaya_packing,
                "biaya_ongkir": trx.biaya_ongkir,
                "total_bayar": trx.total_bayar,
                "nomor_resi": trx.nomor_resi,
                "keterangan_kurir": trx.keterangan_kurir,
                "alamat": alamat_data,
                "payment_url": trx.payment_url or "",
                "created_at": trx.created_at.isoformat(),
            })

        return Response(result)
