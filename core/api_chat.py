"""
Noska Hamster — API Chat (Internal)
===================================
"""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from .models import Customer, ChatRoom, ChatMessage
from django.db.models import Q

class ChatRoomAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        # Jika Admin/Staff, ambil semua room yang memiliki pesan
        if user.is_staff:
            from django.db.models import Count
            rooms = ChatRoom.objects.annotate(msg_count=Count('messages')).filter(msg_count__gt=0).select_related('customer')
            data = []
            for r in rooms:
                unread_count = r.messages.filter(sender_is_admin=False, is_read=False).count()
                data.append({
                    "room_id": r.id,
                    "customer_name": r.customer.nama_customer or r.customer.user.first_name,
                    "unread_count": unread_count,
                    "last_updated": r.updated_at
                })
            return Response(data)
        
        # Jika Customer biasa, kembalikan room mereka sendiri
        customer = Customer.objects.filter(user=user).first()
        if not customer:
            return Response({"error": "Profil Customer tidak ditemukan."}, status=status.HTTP_404_NOT_FOUND)
            
        room, _ = ChatRoom.objects.get_or_create(customer=customer)
        unread_count = room.messages.filter(sender_is_admin=True, is_read=False).count()
        
        return Response({
            "room_id": room.id,
            "unread_count": unread_count,
            "last_updated": room.updated_at
        })


class ChatMessageAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, room_id):
        user = request.user
        
        try:
            room = ChatRoom.objects.get(pk=room_id)
        except ChatRoom.DoesNotExist:
            return Response({"error": "Ruang chat tidak ditemukan."}, status=status.HTTP_404_NOT_FOUND)
            
        # Verifikasi akses
        if not user.is_staff:
            customer = Customer.objects.filter(user=user).first()
            if room.customer != customer:
                return Response({"error": "Akses ditolak."}, status=status.HTTP_403_FORBIDDEN)
        
        # Mark as read
        if user.is_staff:
            room.messages.filter(sender_is_admin=False, is_read=False).update(is_read=True)
        else:
            room.messages.filter(sender_is_admin=True, is_read=False).update(is_read=True)

        messages = room.messages.all().select_related('related_inventory', 'related_inventory__variant').order_by('created_at')
        data = []
        for m in messages:
            inv_data = None
            if m.related_inventory:
                inv = m.related_inventory
                inv_data = {
                    "inventory_id": inv.inventory_id,
                    "kode_hamster": inv.kode_hamster,
                    "varian": str(inv.variant),
                    "harga": inv.harga_display,
                    "foto_preview": (inv.foto_preview.name if str(inv.foto_preview.name).startswith("http") else request.build_absolute_uri(inv.foto_preview.url)) if inv.foto_preview else None,
                }
            data.append({
                "id": m.id,
                "message": m.message,
                "media_url": m.media_url,
                "media_type": m.media_type,
                "sender_is_admin": m.sender_is_admin,
                "is_read": m.is_read,
                "related_inventory": inv_data,
                "created_at": m.created_at
            })

        return Response(data)

    def post(self, request, room_id):
        user = request.user
        message_text = request.data.get("message", "").strip()
        inventory_id = request.data.get("inventory_id")
        media_url = request.data.get("media_url")
        media_type = request.data.get("media_type")
        
        if not message_text and not inventory_id and not media_url:
            return Response({"error": "Pesan tidak boleh kosong."}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            room = ChatRoom.objects.get(pk=room_id)
        except ChatRoom.DoesNotExist:
            return Response({"error": "Ruang chat tidak ditemukan."}, status=status.HTTP_404_NOT_FOUND)
            
        # Verifikasi akses
        if not user.is_staff:
            customer = Customer.objects.filter(user=user).first()
            if room.customer != customer:
                return Response({"error": "Akses ditolak."}, status=status.HTTP_403_FORBIDDEN)
        
        # Link related inventory
        related_inv = None
        if inventory_id:
            from .models import LiveInventory
            related_inv = LiveInventory.objects.filter(pk=inventory_id).first()
                
        msg = ChatMessage.objects.create(
            room=room,
            sender_is_admin=user.is_staff,
            message=message_text,
            media_url=media_url,
            media_type=media_type,
            related_inventory=related_inv
        )
        
        room.updated_at = msg.created_at
        room.save()
        
        inv_data = None
        if msg.related_inventory:
            inv = msg.related_inventory
            inv_data = {
                "inventory_id": inv.inventory_id,
                "kode_hamster": inv.kode_hamster,
                "varian": str(inv.variant),
                "harga": inv.harga_display,
                "foto_preview": (inv.foto_preview.name if str(inv.foto_preview.name).startswith("http") else request.build_absolute_uri(inv.foto_preview.url)) if inv.foto_preview else None,
            }

        return Response({
            "id": msg.id,
            "message": msg.message,
            "media_url": msg.media_url,
            "media_type": msg.media_type,
            "sender_is_admin": msg.sender_is_admin,
            "is_read": msg.is_read,
            "related_inventory": inv_data,
            "created_at": msg.created_at
        }, status=status.HTTP_201_CREATED)
