"""
Noska Hamster — Core App URL Configuration
============================================
"""

from django.urls import path, re_path
from .views import BoxListView, BoxDetailView, AddressFormView
from .api_dashboard import (
    DashboardInventoryAPIView, DashboardCouriersAPIView, 
    DashboardCreateInvoiceAPIView, DashboardTransactionAPIView,
    DashboardTransactionDetailAPIView, DashboardStatsAPIView,
    DashboardVariantsAPIView, DashboardAddInventoryAPIView,
    DashboardUploadMediaAPIView, DashboardSessionsAPIView,
    DashboardBoxesBySessionAPIView, DashboardSessionDetailAPIView,
    DashboardSessionDuplicateAPIView, DashboardBoxDetailAPIView,
    DashboardItemDetailAPIView, DashboardBoxItemsAPIView
)
from .api_ongkir import (
    OngkirProvincesAPIView, 
    OngkirCitiesAPIView, 
    OngkirDistrictsAPIView,
    OngkirSubdistrictsAPIView,
    OngkirCalculateAPIView
)

app_name = "core"

urlpatterns = [
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

    # ----------------------------------------------------
    # Public API (Form Alamat Customer)
    # ----------------------------------------------------
    path("transaksi/alamat/<uuid:token>/", AddressFormView.as_view(), name="api_address_form"),

    # ----------------------------------------------------
    # Public API (Cek Ongkir — BinderByte)
    # ----------------------------------------------------
    path("ongkir/provinces/", OngkirProvincesAPIView.as_view(), name="api_ongkir_provinces"),
    path("ongkir/cities/<str:province_id>/", OngkirCitiesAPIView.as_view(), name="api_ongkir_cities"),
    path("ongkir/districts/<str:city_id>/", OngkirDistrictsAPIView.as_view(), name="api_ongkir_districts"),
    path("ongkir/subdistricts/<str:district_id>/", OngkirSubdistrictsAPIView.as_view(), name="api_ongkir_subdistricts"),
    path("ongkir/calculate/", OngkirCalculateAPIView.as_view(), name="api_ongkir_calculate"),
]
