"""
Noska Hamster — API Store (Cart & Checkout)
===========================================
"""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
from .models import Customer, Cart, CartItem, LiveInventory, Transaction, Address
import uuid

class InventoryDetailAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, inventory_id):
        inv = LiveInventory.objects.filter(pk=inventory_id).first()
        if not inv:
            return Response({"error": "Produk tidak ditemukan"}, status=status.HTTP_404_NOT_FOUND)
        return Response({
            "inventory_id": inv.inventory_id,
            "kode_hamster": inv.kode_hamster,
            "varian": str(inv.variant),
            "harga": inv.harga_display,
            "foto_preview": request.build_absolute_uri(inv.foto_preview.url) if inv.foto_preview else None,
        })

class CartAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get_customer(self, user):
        return Customer.objects.filter(user=user).first()

    def get_or_create_cart(self, customer):
        cart, _ = Cart.objects.get_or_create(customer=customer)
        return cart

    def get(self, request):
        customer = self.get_customer(request.user)
        if not customer:
            return Response({"error": "Profil Customer tidak ditemukan."}, status=status.HTTP_404_NOT_FOUND)
        
        cart = self.get_or_create_cart(customer)
        items = cart.items.all().select_related('inventory', 'inventory__variant')
        
        data = []
        total_harga = 0
        for item in items:
            inv = item.inventory
            data.append({
                "cart_item_id": item.id,
                "inventory_id": inv.inventory_id,
                "kode_hamster": inv.kode_hamster,
                "varian": str(inv.variant),
                "jenis_kelamin": inv.jenis_kelamin,
                "harga": inv.harga_display,
                "foto_preview": request.build_absolute_uri(inv.foto_preview.url) if inv.foto_preview else None,
                "status_ketersediaan": inv.status_ketersediaan,
            })
            if inv.status_ketersediaan == LiveInventory.StatusKetersediaan.TERSEDIA:
                total_harga += inv.harga_display

        return Response({
            "cart_id": cart.id,
            "items": data,
            "total_harga": total_harga
        })

    def post(self, request):
        """Menambahkan hamster ke keranjang"""
        customer = self.get_customer(request.user)
        if not customer:
            return Response({"error": "Profil Customer tidak ditemukan."}, status=status.HTTP_404_NOT_FOUND)

        inventory_id = request.data.get("inventory_id")
        if not inventory_id:
            return Response({"error": "inventory_id wajib dikirim."}, status=status.HTTP_400_BAD_REQUEST)

        inv = LiveInventory.objects.filter(pk=inventory_id).first()
        if not inv:
            return Response({"error": "Hamster tidak ditemukan."}, status=status.HTTP_404_NOT_FOUND)

        if inv.status_ketersediaan != LiveInventory.StatusKetersediaan.TERSEDIA:
            return Response({"error": "Maaf, hamster ini sudah tidak tersedia."}, status=status.HTTP_400_BAD_REQUEST)

        cart = self.get_or_create_cart(customer)
        
        # Add to cart if not already there
        cart_item, created = CartItem.objects.get_or_create(cart=cart, inventory=inv)
        if not created:
            return Response({"message": "Hamster ini sudah ada di keranjang Anda."}, status=status.HTTP_200_OK)

        return Response({"message": "Berhasil ditambahkan ke keranjang."}, status=status.HTTP_201_CREATED)

    def delete(self, request):
        """Menghapus item dari keranjang"""
        customer = self.get_customer(request.user)
        cart_item_id = request.data.get("cart_item_id")

        if not cart_item_id:
            return Response({"error": "cart_item_id wajib dikirim."}, status=status.HTTP_400_BAD_REQUEST)

        CartItem.objects.filter(id=cart_item_id, cart__customer=customer).delete()
        return Response({"message": "Item dihapus dari keranjang."})


class CheckoutAPIView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        user = request.user
        customer = Customer.objects.filter(user=user).first()
        if not customer:
            return Response({"error": "Profil Customer tidak ditemukan."}, status=status.HTTP_404_NOT_FOUND)

        cart = Cart.objects.filter(customer=customer).first()
        if not cart or not cart.items.exists():
            return Response({"error": "Keranjang Anda kosong."}, status=status.HTTP_400_BAD_REQUEST)

        address_id = request.data.get("address_id")
        alamat_data = request.data.get("alamat_data")
        biaya_ongkir = request.data.get("biaya_ongkir", 0)
        kurir = request.data.get("kurir", "")

        alamat = None
        if address_id:
            # Use an existing saved address
            alamat = Address.objects.filter(pk=address_id, customer=customer).first()
            if not alamat:
                return Response({"error": "Alamat tidak valid."}, status=status.HTTP_400_BAD_REQUEST)
        elif alamat_data:
            # Create new address on-the-fly (fallback)
            alamat = Address.objects.create(
                customer=customer,
                nama_penerima=alamat_data.get("nama_penerima", ""),
                nomor_wa_penerima=alamat_data.get("nomor_wa", ""),
                detail_alamat=alamat_data.get("detail", ""),
                provinsi=alamat_data.get("provinsi", ""),
                kota_kabupaten=alamat_data.get("kota", ""),
                kecamatan=alamat_data.get("kecamatan", ""),
                kelurahan_desa=alamat_data.get("kelurahan", ""),
                destination_id=alamat_data.get("destination_id", ""),
                label_alamat="Alamat Pengiriman"
            )
        else:
            return Response({"error": "Data alamat pengiriman wajib diisi."}, status=status.HTTP_400_BAD_REQUEST)

        # Validasi stok & Hitung Harga
        items = cart.items.all()
        hamsters_to_checkout = []
        total_harga_hamster = 0

        for item in items:
            inv = item.inventory
            # Lock row for update
            inv = LiveInventory.objects.select_for_update().get(pk=inv.pk)
            if inv.status_ketersediaan != LiveInventory.StatusKetersediaan.TERSEDIA:
                return Response({
                    "error": f"Hamster {inv.kode_hamster} sudah terjual/hold. Silakan hapus dari keranjang."
                }, status=status.HTTP_400_BAD_REQUEST)
            
            hamsters_to_checkout.append(inv)
            total_harga_hamster += inv.harga_display

        # Asumsi biaya packing statis per checkout atau 0
        biaya_packing = 10000 if total_harga_hamster > 0 else 0
        total_bayar = total_harga_hamster + biaya_packing + int(biaya_ongkir)

        # Create Transaction
        trx = Transaction.objects.create(
            customer=customer,
            status_pembayaran="PENDING",
            alamat=alamat,
            alamat_lengkap=True if alamat else False,
            biaya_ongkir=biaya_ongkir,
            biaya_packing=biaya_packing,
            total_bayar=total_bayar,
            keterangan_kurir=kurir,
            raw_rekapan="" # We don't need this anymore for new checkout flow
        )

        # Tambahkan hamsters ke transaksi & update status
        for inv in hamsters_to_checkout:
            if inv.box.spesies != "Perlengkapan" and inv.box.nama_box.lower() != 'aksesoris':
                inv.status_ketersediaan = LiveInventory.StatusKetersediaan.TERJUAL
                inv.save()
            trx.hamsters.add(inv)

        # Generate DOKU Payment Link
        from .doku_utils import create_doku_checkout_url
        payment_url, token_id, err = create_doku_checkout_url(trx)
        if payment_url:
            trx.payment_url = payment_url
            trx.doku_token = token_id
            trx.save()
        else:
            # Tetap berhasil checkout (bisa bayar manual), tapi log error DOKU
            print(f"Failed to generate DOKU link: {err}")

        # Clear cart
        cart.items.all().delete()

        return Response({
            "message": "Checkout berhasil. Silakan lakukan pembayaran.",
            "transaction_id": trx.transaction_id,
            "total_bayar": total_bayar,
            "payment_url": payment_url
        }, status=status.HTTP_201_CREATED)
