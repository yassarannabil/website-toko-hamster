"""
Noska Hamster — Core App URL Configuration
============================================
"""

from django.urls import path
from .views import BoxListView, BoxDetailView

app_name = "core"

urlpatterns = [
    path("boxes/", BoxListView.as_view(), name="box-list"),
    path("boxes/<int:box_id>/items/", BoxDetailView.as_view(), name="box-detail"),
]
