"""
Noska Hamster — Core App URL Configuration
============================================
"""

from django.urls import path, re_path
from .views import BoxListView, BoxDetailView
from .api_dashboard import (
    DashboardInventoryAPIView, DashboardCouriersAPIView, 
    DashboardCreateInvoiceAPIView, DashboardTransactionAPIView,
    DashboardTransactionDetailAPIView, DashboardStatsAPIView,
    DashboardVariantsAPIView, DashboardAddInventoryAPIView,
    DashboardUploadMediaAPIView, DashboardSessionsAPIView,
    DashboardBoxesBySessionAPIView, DashboardSessionDetailAPIView,
    DashboardSessionDuplicateAPIView, DashboardBoxDetailAPIView,
    DashboardItemDetailAPIView, DashboardBoxItemsAPIView,
    DashboardChatRoomsAPIView, DashboardChatMessagesAPIView
)
from .api_ongkir import (
    OngkirProvincesAPIView, 
    OngkirCitiesAPIView, 
    OngkirDistrictsAPIView,
    OngkirSubdistrictsAPIView,
    OngkirCalculateAPIView
)
from .api_auth import RegisterAPIView, LoginAPIView, ProfileAPIView, CustomerAddressAPIView, CustomerTransactionsAPIView
from .api_store import CartAPIView, CheckoutAPIView, InventoryDetailAPIView
from .api_payment import DokuNotificationAPIView
from .api_chat import ChatRoomAPIView, ChatMessageAPIView

app_name = "core"

urlpatterns = [
    # ----------------------------------------------------
    # Auth APIs (Customer)
    # ----------------------------------------------------
    path("auth/register/", RegisterAPIView.as_view(), name="api_auth_register"),
    path("auth/login/", LoginAPIView.as_view(), name="api_auth_login"),
    path("auth/profile/", ProfileAPIView.as_view(), name="api_auth_profile"),
    path("auth/addresses/", CustomerAddressAPIView.as_view(), name="api_auth_addresses"),
    path("auth/transactions/", CustomerTransactionsAPIView.as_view(), name="api_auth_transactions"),

    # ----------------------------------------------------
    # Store APIs (Cart & Checkout & Payment)
    # ----------------------------------------------------
    path("store/cart/", CartAPIView.as_view(), name="api_store_cart"),
    path("store/checkout/", CheckoutAPIView.as_view(), name="api_store_checkout"),
    path("store/inventory/<int:inventory_id>/", InventoryDetailAPIView.as_view(), name="api_store_inventory_detail"),
    path("payment/doku-notify/", DokuNotificationAPIView.as_view(), name="api_payment_doku_notify"),

    # ----------------------------------------------------
    # Chat APIs (Internal)
    # ----------------------------------------------------
    path("chat/rooms/", ChatRoomAPIView.as_view(), name="api_chat_rooms"),
    path("chat/rooms/<int:room_id>/messages/", ChatMessageAPIView.as_view(), name="api_chat_messages"),

    # ----------------------------------------------------
    # Public APIs (Katalog)
    # ----------------------------------------------------
    path("boxes/", BoxListView.as_view(), name="api_boxes_list"),
    path("boxes/<int:box_id>/items/", BoxDetailView.as_view(), name="api_box_items"),
    
    # ----------------------------------------------------
    # Dashboard APIs (Next.js Admin)
    # ----------------------------------------------------
    path("dashboard/stats/", DashboardStatsAPIView.as_view(), name="api_dashboard_stats"),
    path("dashboard/inventory/", DashboardInventoryAPIView.as_view(), name="api_dashboard_inventory"),
    path("dashboard/sessions/", DashboardSessionsAPIView.as_view(), name="api_dashboard_sessions"),
    path("dashboard/sessions/<int:session_id>/boxes/", DashboardBoxesBySessionAPIView.as_view(), name="api_dashboard_sessions_boxes"),
    path("dashboard/sessions/<int:session_id>/duplicate/", DashboardSessionDuplicateAPIView.as_view(), name="api_dashboard_session_duplicate"),
    path("dashboard/sessions/<int:session_id>/", DashboardSessionDetailAPIView.as_view(), name="api_dashboard_session_detail"),
    path("dashboard/boxes/<int:box_id>/", DashboardBoxDetailAPIView.as_view(), name="api_dashboard_box_detail"),
    path("dashboard/boxes/<int:box_id>/items/", DashboardBoxItemsAPIView.as_view(), name="api_dashboard_box_items"),
    path("dashboard/items/<int:item_id>/", DashboardItemDetailAPIView.as_view(), name="api_dashboard_item_detail"),
    path("dashboard/couriers/", DashboardCouriersAPIView.as_view(), name="api_dashboard_couriers"),
    path("dashboard/invoice/", DashboardCreateInvoiceAPIView.as_view(), name="api_dashboard_invoice"),
    path("dashboard/transactions/", DashboardTransactionAPIView.as_view(), name="api_dashboard_transactions"),
    path("dashboard/transactions/<int:pk>/", DashboardTransactionDetailAPIView.as_view(), name="api_dashboard_transaction_detail"),
    path("dashboard/variants/", DashboardVariantsAPIView.as_view(), name="api_dashboard_variants"),
    path("dashboard/inventory/add/", DashboardAddInventoryAPIView.as_view(), name="api_dashboard_inventory_add"),
    path("dashboard/inventory/<int:pk>/upload/", DashboardUploadMediaAPIView.as_view(), name="api_dashboard_inventory_upload"),
    path("dashboard/chat/rooms/", DashboardChatRoomsAPIView.as_view(), name="api_dashboard_chat_rooms"),
    path("dashboard/chat/rooms/<int:room_id>/messages/", DashboardChatMessagesAPIView.as_view(), name="api_dashboard_chat_messages"),

    # ----------------------------------------------------
    # Public API (Cek Ongkir — BinderByte)
    # ----------------------------------------------------
    path("ongkir/provinces/", OngkirProvincesAPIView.as_view(), name="api_ongkir_provinces"),
    path("ongkir/cities/<str:province_id>/", OngkirCitiesAPIView.as_view(), name="api_ongkir_cities"),
    path("ongkir/districts/<str:city_id>/", OngkirDistrictsAPIView.as_view(), name="api_ongkir_districts"),
    path("ongkir/subdistricts/<str:district_id>/", OngkirSubdistrictsAPIView.as_view(), name="api_ongkir_subdistricts"),
    path("ongkir/calculate/", OngkirCalculateAPIView.as_view(), name="api_ongkir_calculate"),
]
