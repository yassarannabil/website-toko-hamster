"""
Noska Hamster — Shipping Cost API (RajaOngkir V2 Integration)
=============================================================
Uses RajaOngkir V2 API by Komerce.

Endpoints:
  GET /api/ongkir/provinces/          → List all provinces
  GET /api/ongkir/cities/<prov_id>/   → List cities/regencies in a province
  GET /api/ongkir/districts/<city_id>/ → List districts in a city
  GET /api/ongkir/subdistricts/<dist_id>/ → List subdistricts in a district
  POST /api/ongkir/calculate/         → Calculate shipping cost
"""

import requests
import os
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework import status

KOMERCE_API_KEY = getattr(settings, 'KOMERCE_API_KEY', os.environ.get("KOMERCE_API_KEY", ""))
RAJAONGKIR_BASE_URL = "https://rajaongkir.komerce.id/api/v1"

# Kelurahan Sisir, Kecamatan Batu, Jawa Timur — ID Akurat RajaOngkir V2 (Komerce)
ORIGIN_DISTRICT_ID = 47051

def get_rajaongkir_headers():
    return {
        "key": KOMERCE_API_KEY,
        "Accept": "application/json"
    }

class OngkirProvincesAPIView(APIView):
    """Get all provinces."""
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        try:
            r = requests.get(
                f"{RAJAONGKIR_BASE_URL}/destination/province", 
                headers=get_rajaongkir_headers(),
                timeout=10
            )
            data = r.json()
            return Response(data)
        except Exception as e:
            return Response({"error": str(e)}, status=500)


class OngkirCitiesAPIView(APIView):
    """Get cities/regencies by province ID."""
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request, province_id):
        try:
            r = requests.get(
                f"{RAJAONGKIR_BASE_URL}/destination/city/{province_id}", 
                headers=get_rajaongkir_headers(),
                timeout=10
            )
            data = r.json()
            return Response(data)
        except Exception as e:
            return Response({"error": str(e)}, status=500)


class OngkirDistrictsAPIView(APIView):
    """Get districts (kecamatan) by city ID."""
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request, city_id):
        try:
            r = requests.get(
                f"{RAJAONGKIR_BASE_URL}/destination/district/{city_id}", 
                headers=get_rajaongkir_headers(),
                timeout=10
            )
            data = r.json()
            return Response(data)
        except Exception as e:
            return Response({"error": str(e)}, status=500)


class OngkirSubdistrictsAPIView(APIView):
    """Get subdistricts (kelurahan) by district ID."""
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request, district_id):
        try:
            r = requests.get(
                f"{RAJAONGKIR_BASE_URL}/destination/sub-district/{district_id}", 
                headers=get_rajaongkir_headers(),
                timeout=10
            )
            data = r.json()
            return Response(data)
        except Exception as e:
            return Response({"error": str(e)}, status=500)


class OngkirCalculateAPIView(APIView):
    """Calculate domestic shipping cost (POST)."""
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        destination_id = request.data.get("destination_id")
        weight = request.data.get("weight", 1000)  # in grams (RajaOngkir uses grams)
        
        # RajaOngkir uses colon separated couriers e.g. "pos:tiki:jne"
        couriers_str = request.data.get("courier", "pos:tiki:jne") 

        if not destination_id:
            return Response({"error": "destination_id diperlukan"}, status=status.HTTP_400_BAD_REQUEST)

        # Remove BinderByte prefixes if they still exist from frontend
        if str(destination_id).startswith("village_"):
            destination_id = str(destination_id).replace("village_", "")
        elif str(destination_id).startswith("dist_"):
            destination_id = str(destination_id).replace("dist_", "")

        try:
            r = requests.post(
                f"{RAJAONGKIR_BASE_URL}/calculate/domestic-cost",
                headers={
                    "key": KOMERCE_API_KEY,
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                data={
                    "origin": ORIGIN_DISTRICT_ID,
                    "destination": destination_id,
                    "weight": weight,
                    "courier": couriers_str,
                    "price": "lowest" # Optional parameter
                },
                timeout=30,
            )
            data = r.json()
            return Response(data)
        except Exception as e:
            return Response({"error": str(e)}, status=500)
